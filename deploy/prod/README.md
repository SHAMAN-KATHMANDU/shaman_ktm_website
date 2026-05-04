# shamanktmweb — Production Deploy (EC2 + Docker + Watchtower)

Self-hosted deploy for the shamankathmandu.com Next.js static site. Runs as
a single nginx container on an EC2 instance, fronted by host nginx + Let's
Encrypt for TLS. Watchtower polls Docker Hub every 15 seconds and pulls the
latest `rpandox/shamanktmweb:prod` image, so every merge to `main` ships
automatically once the GitHub Actions build finishes.

## Architecture

```
GitHub push to main
   └─> .github/workflows/build-push-prod.yml
         pnpm build  ->  docker build  ->  push rpandox/shamanktmweb:prod (+:prod-<sha>)
                            │
                            ▼
EC2 host (Ubuntu)
   ├─ shamanktmweb container        nginx serving /usr/share/nginx/html on :80
   │                                published to host :3000
   ├─ watchtower-prod container      polls Docker Hub every 15s, restarts shamanktmweb on new :prod
   └─ host nginx + certbot           terminates TLS for shamankathmandu.com,
                                     proxies to 127.0.0.1:3000
```

## Prerequisites

- Ubuntu EC2 instance with Docker + Compose plugin installed.
- Security group: inbound 22, 80, 443. (Port 3000 may stay closed; only the host
  nginx talks to it on `127.0.0.1:3000`.)
- DNS A records for `shamankathmandu.com` and `www.shamankathmandu.com`
  pointing to the EC2 public IP (or Elastic IP).
- GitHub repo secrets/variables set so CI can build + push the image:
  - `secrets.DOCKERHUB_USERNAME`, `secrets.DOCKERHUB_TOKEN`
  - `vars.NEXT_PUBLIC_SITE_MODE` (e.g. `live`)
  - `vars.PROJECTX_API_MODE` (e.g. `mock` or `live`)
  - `vars.NEXT_PUBLIC_PROJECTX_API_BASE`
  - `vars.NEXT_PUBLIC_PROJECTX_ORIGIN` (e.g. `https://shamankathmandu.com`)
  - `secrets.NEXT_PUBLIC_PROJECTX_API_KEY` (optional)

## First-time install

```bash
scp -i ~/.ssh/key -r deploy/prod ubuntu@<EC2_IP>:/home/ubuntu/deploy
ssh -i ~/.ssh/key ubuntu@<EC2_IP>
cd /home/ubuntu/deploy

./setup.sh                # Docker check, .env, optional `docker login`
./up.sh                   # start shamanktmweb + Watchtower
./health.sh               # verify the container responds on :3000
sudo ./setup-nginx.sh     # install host nginx + Let's Encrypt
```

After certbot succeeds, `https://shamankathmandu.com/` should return the site.

## Daily operations

| Command                            | What it does                                 |
| ---------------------------------- | -------------------------------------------- |
| `./up.sh`                          | Start the container + Watchtower             |
| `./down.sh`                        | Stop both (Watchtower first)                 |
| `./restart.sh` / `./restart.sh all`| Restart the container / both                 |
| `./status.sh`                      | Container status + resource usage            |
| `./health.sh`                      | HTTP probe + container health                |
| `./logs.sh -f`                     | Follow shamanktmweb logs                     |
| `./logs.sh watchtower -f`          | Follow Watchtower logs (see auto-deploys)    |

## How auto-deploy works

1. Push commits to `main`.
2. `.github/workflows/build-push-prod.yml` builds the image and pushes
   `rpandox/shamanktmweb:prod` and `rpandox/shamanktmweb:prod-<sha>`.
3. Within 15 seconds, Watchtower on the EC2 detects the new digest, pulls it,
   stops the old container, and starts the new one. Old image is cleaned up
   (`WATCHTOWER_CLEANUP=true`).

To watch a deploy land:

```bash
./logs.sh watchtower -f
```

## Rollback

Pin to a specific known-good build:

```bash
docker pull rpandox/shamanktmweb:prod-<sha>
docker tag  rpandox/shamanktmweb:prod-<sha> rpandox/shamanktmweb:prod
docker compose up -d --force-recreate shamanktmweb
```

(Watchtower will re-pin to the latest `:prod` digest on its next poll, so the
real fix is to revert the offending commit on `main` and let CI rebuild.)

## Troubleshooting

| Symptom                                    | Likely cause / fix                                                   |
| ------------------------------------------ | -------------------------------------------------------------------- |
| `502 Bad Gateway` from host nginx           | Container not on `127.0.0.1:3000` — `./status.sh`                    |
| Watchtower can't pull image                | Run `docker login` on the EC2 (image is private)                     |
| certbot fails                              | DNS A records must resolve to EC2 IP **before** running certbot      |
| Site is stale after merge to main          | Check the GitHub Action ran; `./logs.sh watchtower -f`               |
| `network shamanktm-prod not found`         | Run `./up.sh` first (creates the network), then Watchtower attaches  |

## Coexists with Cloudflare Pages

The repo's existing `.github/workflows/deploy.yml` continues to deploy to
Cloudflare Pages. Both targets build from the same `main` branch on every
push, so the EC2 and Cloudflare deployments stay in sync.

## Backups

Postgres data lives in the named Docker volume `shaman-db` (see
`docker-compose.yml`). Container-level loss is recoverable; instance-level
loss (EC2 host gone) is not, unless backups have been pushed off-host.

### Recommended setup: nightly `pg_dump` to S3

Run as a host cron under `/etc/cron.daily/shaman-db-backup` (or systemd
timer):

```bash
#!/bin/sh
set -e
TS=$(date -u +%Y%m%dT%H%M%SZ)
DUMP_FILE="/tmp/shaman-${TS}.sql.gz"

docker compose -f /opt/shaman_web/docker-compose.yml exec -T db \
  pg_dump -U shaman -d shaman --clean --if-exists | gzip > "$DUMP_FILE"

aws s3 cp "$DUMP_FILE" "s3://shaman-db-backups/$(basename "$DUMP_FILE")" \
  --storage-class STANDARD_IA

# Keep 30 days locally; S3 lifecycle handles long-term retention.
rm "$DUMP_FILE"
find /var/log -name 'shaman-db-backup-*.log' -mtime +30 -delete 2>/dev/null || true
```

The IAM role on the EC2 instance must have `s3:PutObject` on
`shaman-db-backups/*`. Configure an S3 lifecycle rule to transition objects
older than 30 days to Glacier and delete after 1 year.

### Restore drill

1. Pull the latest dump locally:
   ```bash
   aws s3 cp s3://shaman-db-backups/shaman-LATEST.sql.gz .
   ```
2. Spin up an isolated postgres:
   ```bash
   docker run --rm -e POSTGRES_PASSWORD=test -p 5433:5432 -d postgres:16-alpine
   ```
3. Restore:
   ```bash
   gunzip -c shaman-LATEST.sql.gz | \
     docker exec -i <container> psql -U postgres -d postgres
   ```
4. Sanity-check row counts against prod's `\dt`.

Run this drill at least monthly. A backup that has never been restored is
not a backup.

### Restoring into prod

```bash
# 1. Stop the app (so no writes mid-restore).
./down.sh app

# 2. Drop + recreate the database inside the running db container.
docker compose exec db psql -U shaman -c 'DROP DATABASE shaman;'
docker compose exec db psql -U shaman -c 'CREATE DATABASE shaman;'

# 3. Restore.
gunzip -c shaman-LATEST.sql.gz | docker compose exec -T db psql -U shaman -d shaman

# 4. Bring the app back up — entrypoint.sh will run `prisma migrate deploy`.
./up.sh
```

If the dump is older than the current schema, `migrate deploy` will roll
forward any newer migrations on top of the restored snapshot.

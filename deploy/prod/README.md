# shamanktmweb — production deploy (Lightsail + GHCR + Watchtower)

Production for www.shamankathmandu.com since **2026-11-10**: one AWS Lightsail
instance running the Next.js app, its Postgres and Watchtower in Docker, with
host nginx + Let's Encrypt in front. Moved from EC2 `ims-shaman-web`
(t3.micro, 1 GB) to get 2 GB RAM for less money.

| | |
|---|---|
| Host | Lightsail `shaman-web-ls`, plan `small_3_1` (2 vCPU, 2 GB, 60 GB, 1.5 TB transfer), `ap-south-1a`, Ubuntu 24.04, USD 12/mo |
| IP | Lightsail static IP `shaman-web-ip` (see `aws lightsail get-static-ip --static-ip-name shaman-web-ip --region ap-south-1`) |
| SSH | `ssh -i ~/.ssh/ims-aws ubuntu@<static ip>` (Lightsail key pair `ims-aws`) |
| Stack | `/opt/shaman_web/` — `docker-compose.yml` (= this folder's copy) + `.env` (host only, never in git) |
| Image | `ghcr.io/shaman-kathmandu/shamanktmweb:prod` (public package, no registry login on the host) |
| DNS | Cloudflare zone `shamankathmandu.com`: apex A (proxied) and `www` A (DNS only) → static IP |
| TLS | certbot, nginx authenticator, cert `www.shamankathmandu.com` (apex + www), auto-renew via `certbot.timer` |
| Media | S3 `ims-shaman-photos` via IAM user `shaman-web-app` (keys in `.env`: `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`) |
| Backups | nightly 02:30 NPT → `s3://shaman-db-backups-766092484960/shaman/` (write-only key, versioned, 90-day expiry) |

## How a deploy works

```
merge to main ─▶ .github/workflows/build-push-prod.yml
                  docker build ─▶ ghcr.io/shaman-kathmandu/shamanktmweb:prod (+ :prod-<sha>)
                                        │  Watchtower polls every WATCHTOWER_POLL_INTERVAL s
                                        ▼
Lightsail host ── shaman-web (Next standalone :3000) ◀── host nginx :443 (TLS)
               ── shaman-db  (postgres:16-alpine, volume shaman_web_shaman-db)
               ── shaman-watchtower (recreates shaman-web only — label-enabled)
```

The container entrypoint runs `prisma migrate deploy` on every start. An image
rollback does **not** undo a migration.

Verify a rollout: note `docker inspect shaman-web --format '{{.Image}}'`, wait
2–3 min after the CI run, check it changed, then
`docker logs shaman-web | grep -i migration` and load the site.

### Roll back

```bash
cd /opt/shaman_web
sed -i 's#^DOCKER_IMAGE=.*#DOCKER_IMAGE=ghcr.io/shaman-kathmandu/shamanktmweb:prod-<good sha>#' .env
docker compose up -d app
```

Pinning to a `:prod-<sha>` tag also stops Watchtower from moving it. Revert the
bad commit on `main`, then set `DOCKER_IMAGE` back to `…:prod`.

## Day-to-day

```bash
cd /opt/shaman_web
docker compose ps
docker compose logs -f app            # or watchtower
docker compose up -d app              # after editing .env (Watchtower keeps old env)
sudo /opt/shaman_web/backup-db.sh     # backup now
tail /var/log/shaman-backup.log       # last nightly backups
./check-env.sh                        # which .env vars the container can't see
```

## Restore a backup

The host key cannot read the bucket (by design). From an admin machine:

```bash
aws s3 ls s3://shaman-db-backups-766092484960/shaman/db/ | tail
aws s3 cp s3://shaman-db-backups-766092484960/shaman/db/shaman-<ts>.dump .
scp -i ~/.ssh/ims-aws shaman-<ts>.dump ubuntu@<ip>:/tmp/
# on the host — stops the app, replaces the DB contents:
cd /opt/shaman_web && docker compose stop app
docker exec -i shaman-db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < /tmp/shaman-<ts>.dump
docker compose up -d app
```

## Rebuild a host from scratch

1. Lightsail: `small_3_1`, `ubuntu_24_04`, key pair `ims-aws`; attach static IP
   `shaman-web-ip`; firewall open 22, 80, 443.
2. `scp -r deploy/prod ubuntu@<ip>:/tmp/prod && ssh … sudo /tmp/prod/provision.sh`
3. Copy `docker-compose.yml`, `backup-db.sh`, `check-env.sh` to `/opt/shaman_web/`;
   restore `.env` from the latest `shaman/env/` backup (admin machine), `chmod 600`.
   It must have `RUN_DB_SEED=0` and `DOCKER_IMAGE=ghcr.io/shaman-kathmandu/shamanktmweb:prod`.
4. `docker compose up -d db`, restore the newest dump (above) **before** starting
   the app, so its migrations run against the restored schema.
5. nginx: copy `/etc/letsencrypt` from the old host if it still exists, else
   `sudo ./setup-nginx.sh` (bootstrap http config → certbot → `nginx.conf`).
6. `docker compose up -d`, check by IP:
   `curl -sI --resolve www.shamankathmandu.com:443:<ip> https://www.shamankathmandu.com/`
7. Point both Cloudflare A records at the IP; `sudo certbot renew --dry-run`.
8. Backups: `/root/.aws/credentials` profile `shaman-backup` (uploader key) and
   `/etc/cron.d/shaman-backup`:
   `45 20 * * * root /opt/shaman_web/backup-db.sh >> /var/log/shaman-backup.log 2>&1`
   (20:45 UTC = 02:30 NPT).

## Files here

| File | Purpose |
|---|---|
| `docker-compose.yml` | the production stack, as installed on the host |
| `provision.sh` | one-time host setup (Docker, nginx, certbot, AWS CLI, swap) |
| `backup-db.sh` | nightly DB + `.env` backup to S3 |
| `check-env.sh` | lists `.env` vars the container does not receive |
| `nginx.conf`, `nginx-bootstrap.conf`, `setup-nginx.sh`, `functions.sh` | host nginx + TLS (see `RECONCILIATION-2026-08-21.md`) |

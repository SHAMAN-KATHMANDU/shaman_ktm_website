# shamanktmweb — production deploy (Lightsail + private GHCR + CI push deploy)

Production for www.shamankathmandu.com since **2026-11-10**: one AWS Lightsail
instance running the Next.js app and its Postgres in Docker, with
host nginx + Let's Encrypt in front. Moved from EC2 `ims-shaman-web`
(t3.micro, 1 GB) to get 2 GB RAM for less money.

| | |
|---|---|
| Host | Lightsail `shaman-web-ls`, plan `small_3_1` (2 vCPU, 2 GB, 60 GB, 1.5 TB transfer), `ap-south-1a`, Ubuntu 24.04, USD 12/mo |
| IP | Lightsail static IP `shaman-web-ip` (see `aws lightsail get-static-ip --static-ip-name shaman-web-ip --region ap-south-1`) |
| SSH | `ssh -i ~/.ssh/ims-aws ubuntu@<static ip>` (Lightsail key pair `ims-aws`) |
| Stack | `/opt/shaman_web/` — `docker-compose.yml` (= this folder's copy) + `.env` (host only, never in git) |
| Image | `ghcr.io/shaman-kathmandu/shamanktmweb:prod-<sha>` — **private** package; the host holds no registry credential |
| Deploy | GitHub Actions job `deploy` (environment `production`, main only) SSHes in with a key pinned to `deploy.sh` |
| DNS | Cloudflare zone `shamankathmandu.com`: apex A (proxied) and `www` A (DNS only) → static IP |
| TLS | certbot, nginx authenticator, cert `www.shamankathmandu.com` (apex + www), auto-renew via `certbot.timer` |
| Media | S3 `ims-shaman-photos` via IAM user `shaman-web-app` (keys in `.env`: `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`) |
| Backups | nightly 02:30 NPT → `s3://shaman-db-backups-766092484960/shaman/` (write-only key, versioned, 90-day expiry) |

## How a deploy works

```
merge to main ─▶ build-push-prod.yml
   job build-and-push: docker build ─▶ ghcr.io/shaman-kathmandu/shamanktmweb:prod + :prod-<sha>
   job deploy (env "production"):
        printf GITHUB_TOKEN | ssh ubuntu@PROD_HOST prod-<sha>
              │  key is forced to /opt/shaman_web/deploy.sh (restrict: no shell, no forwarding)
              ▼
   deploy.sh: docker login with the job token in a throwaway DOCKER_CONFIG,
              pull :prod-<sha>, retag :prod, compose up -d app, wait for healthy
   then: curl smoke test of /, /products, /sysuser/login
```

Lightsail host: `shaman-web` (Next standalone :3000) behind host nginx :443,
`shaman-db` (postgres:16-alpine, volume `shaman_web_shaman-db`).

Secrets of the `production` environment (only `main` can read them):
`PROD_SSH_KEY` (private half of the `shaman-gha-deploy` key), `PROD_HOST`
(static IP), `PROD_KNOWN_HOSTS` (pinned host keys — StrictHostKeyChecking=yes).
The job token expires when the job ends.

The container entrypoint runs `prisma migrate deploy` on every start. An image
rollback does **not** undo a migration.

Every deploy appends a line to `/opt/shaman_web/deploys.log` (tag, health,
previous image id). A failed health check fails the CI job and prints the logs.

### Roll back

On the host (the last 3 `prod-<sha>` images are kept, so no token needed):

```bash
docker images ghcr.io/shaman-kathmandu/shamanktmweb      # cached tags
/opt/shaman_web/deploy.sh prod-<good sha>
```

Older tag: re-run that commit's workflow (Actions → Build & push to GHCR →
Re-run), or revert the bad commit on `main`.

### Rotate the deploy key

`ssh-keygen -t ed25519 -C shaman-gha-deploy -f k`, replace the
`shaman-gha-deploy` line in `~ubuntu/.ssh/authorized_keys` with
`restrict,command="/opt/shaman_web/deploy.sh" <k.pub>`,
`gh secret set PROD_SSH_KEY --env production < k`, delete `k`.

## Day-to-day

```bash
cd /opt/shaman_web
docker compose ps
docker compose logs -f app
docker compose up -d app              # after editing .env (a deploy keeps the old env)
tail deploys.log                      # deploy history
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
   Copy `deploy.sh` too and add the `shaman-gha-deploy` key (see "Rotate the
   deploy key"); update `PROD_HOST` / `PROD_KNOWN_HOSTS` if the IP changed.
4. `docker compose up -d db`, restore the newest dump (above) **before** starting
   the app, so its migrations run against the restored schema.
5. nginx: copy `/etc/letsencrypt` from the old host if it still exists, else
   `sudo ./setup-nginx.sh` (bootstrap http config → certbot → `nginx.conf`).
6. `docker compose up -d db`, then run the workflow (Actions → Run workflow on
   main) to pull and start the app; or check by IP first:
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
| `deploy.sh` | the only command the CI deploy key may run: pull a tag, restart, health-check |
| `backup-db.sh` | nightly DB + `.env` backup to S3 |
| `check-env.sh` | lists `.env` vars the container does not receive |
| `nginx.conf`, `nginx-bootstrap.conf`, `setup-nginx.sh`, `functions.sh` | host nginx + TLS (see `RECONCILIATION-2026-08-21.md`) |

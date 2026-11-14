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
              pull :prod-<sha>
              sudo backup-db.sh                       ─ fails? abort, site untouched
              migrate with the NEW image (one-off)    ─ fails? abort, site untouched
              retag :prod, compose up -d app, wait for healthy (/api/health)
                                                      ─ unhealthy? previous image back, exit 1
   then: curl smoke test of /api/health, /, /products, /sysuser/login
```

Lightsail host: `shaman-web` (Next standalone :3000) behind host nginx :443,
`shaman-db` (postgres:16-alpine, volume `shaman_web_shaman-db`).

Secrets of the `production` environment (only `main` can read them):
`PROD_SSH_KEY` (private half of the `shaman-gha-deploy` key), `PROD_HOST`
(static IP), `PROD_KNOWN_HOSTS` (pinned host keys — StrictHostKeyChecking=yes).
The job token expires when the job ends.

The container entrypoint runs `prisma migrate deploy` on every start; deploy.sh
runs it once more beforehand in a throwaway container of the new image
(`docker compose run --rm --no-deps app true`), so a broken migration stops the
deploy while the old app keeps serving. An image rollback does **not** undo a
migration that already applied. deploy.sh calls `sudo -n backup-db.sh`, so the
`ubuntu` user needs passwordless sudo (the Lightsail default).

Every deploy appends a line to `/opt/shaman_web/deploys.log` (tag, result,
previous `prod-<sha>` and image id). A failed deploy fails the CI job and
prints the container logs.

**`deploy.sh`, `backup-db.sh` and `restore-test.sh` are copied to the host by
hand.** Merging a change to them does nothing until someone copies them to
`/opt/shaman_web/` (`scp` + `sudo install -m 755`).

### Roll back

A deploy whose new container never turns healthy is rolled back automatically
(previous image re-tagged `:prod` and restarted; the log line says whether that
worked). To go back by hand — on the host (the last 3 `prod-<sha>` images are
kept, so no token needed; this also re-runs the backup and migration steps):

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
sudo /opt/shaman_web/backup-db.sh     # backup now (also runs before every deploy)
tail /var/log/shaman-backup.log       # last nightly backups
sudo /opt/shaman_web/restore-test.sh  # restore the newest dump into a throwaway DB
./check-env.sh                        # which .env vars the container can't see
```

## Backup alerts and restore tests

`backup-db.sh` exits non-zero on any failure. Two optional keys in
`/opt/shaman_web/.env` (read by the script, not passed to the app):

- `BACKUP_ALERT_URL` — POSTed a one-line message when a backup fails.
- `BACKUP_HEARTBEAT_URL` — pinged after each success. Point it at a dead-man
  monitor (e.g. healthchecks.io, 1-day period) so a missing ping — cron not
  running, host down — also alerts.

Each backup also keeps the newest dump at `/opt/shaman_web/backups/latest.dump`
(root only). `restore-test.sh` loads it into a throwaway `postgres:16-alpine`
container with no network, prints row counts for Product, Category, Order,
Customer and AdminUser, fails if there are no products, and deletes the
container. It never touches `shaman-db`. Run it monthly.

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
3. Copy `docker-compose.yml`, `backup-db.sh`, `restore-test.sh`, `check-env.sh` to `/opt/shaman_web/`;
   restore `.env` from the latest `shaman/env/` backup (admin machine), `chmod 600`.
   It must have `RUN_DB_SEED=0`, `DOCKER_IMAGE=ghcr.io/shaman-kathmandu/shamanktmweb:prod`
   and `POSTGRES_PASSWORD` (compose refuses to start without it).
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
8. Backups: `/root/.aws/credentials` profile `shaman-backup` (uploader key).
   `provision.sh` installs `/etc/cron.d/shaman-backup` (20:45 UTC = 02:30 NPT).
   Run `sudo ./backup-db.sh && sudo ./restore-test.sh` once to prove both.

## Files here

| File | Purpose |
|---|---|
| `docker-compose.yml` | the production stack, as installed on the host |
| `provision.sh` | one-time host setup (Docker, nginx, certbot, AWS CLI, swap, backup cron) |
| `deploy.sh` | the only command the CI deploy key may run: pull, backup, migrate, switch, health-check, auto-rollback |
| `backup-db.sh` | nightly (and pre-deploy) DB + `.env` backup to S3; alert/heartbeat URLs |
| `restore-test.sh` | restores the newest dump into a throwaway container and counts rows |
| `check-env.sh` | lists `.env` vars the container does not receive |
| `nginx.conf`, `nginx-bootstrap.conf`, `setup-nginx.sh`, `functions.sh` | host nginx + TLS (see `RECONCILIATION-2026-08-21.md`) |

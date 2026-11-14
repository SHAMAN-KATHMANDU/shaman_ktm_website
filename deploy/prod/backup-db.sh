#!/usr/bin/env bash
# Nightly off-box backup: pg_dump of shaman-db + the host .env, uploaded to
# the write-only, versioned bucket (90-day expiry). The uploader key can
# PutObject only — it cannot list, read or delete, so a stolen host key cannot
# wipe old backups. Restore needs an admin credential (see README.md).
#
# Installed as /opt/shaman_web/backup-db.sh, run by /etc/cron.d/shaman-backup
# (provision.sh) and by deploy.sh before every deploy.
# Credentials: AWS profile "shaman-backup" in /root/.aws/credentials.
#
# Exits non-zero on any failure. Optional, from /opt/shaman_web/.env:
#   BACKUP_ALERT_URL      POSTed to when a backup fails
#   BACKUP_HEARTBEAT_URL  pinged after every success (dead-man switch: the
#                         monitor alerts when the pings stop, which also
#                         catches cron itself not running)
# The newest dump is also kept at /opt/shaman_web/backups/latest.dump for
# restore-test.sh, because the host key cannot read the bucket back.
set -euo pipefail
DIR="${SHAMAN_DIR:-/opt/shaman_web}"   # overridable for tests only
ENV_FILE="$DIR/.env"
DEST="${BACKUP_DEST:-s3://shaman-db-backups-766092484960/shaman}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
TMP="$(mktemp -d)"
export AWS_PROFILE=shaman-backup

# Read one key without sourcing .env (it holds secrets and arbitrary text).
envval() { { sed -n "s/^$1=//p" "$ENV_FILE" 2>/dev/null || true; } | tail -n 1 | tr -d "\"'"; }
ALERT_URL="$(envval BACKUP_ALERT_URL)"
HEARTBEAT_URL="$(envval BACKUP_HEARTBEAT_URL)"

on_exit() {
  local rc=$?
  rm -rf "$TMP"
  if [ "$rc" -ne 0 ]; then
    echo "$(date -u +%FT%TZ) backup FAILED (exit $rc)" >&2
    if [ -n "$ALERT_URL" ]; then
      curl -fsS -m 15 --data "shaman-web backup failed (exit $rc) on $(hostname) at $TS" \
        "$ALERT_URL" >/dev/null || echo "alert POST failed too" >&2
    fi
  fi
}
trap on_exit EXIT

docker exec shaman-db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-acl' > "$TMP/db.dump"
# Refuse to upload a dump that pg_restore cannot read (empty or truncated).
docker exec -i shaman-db pg_restore -l < "$TMP/db.dump" > /dev/null

aws s3 cp --only-show-errors "$TMP/db.dump" "$DEST/db/shaman-$TS.dump"
aws s3 cp --only-show-errors "$ENV_FILE" "$DEST/env/env-$TS"
install -d -m 700 "$DIR/backups"
install -m 600 "$TMP/db.dump" "$DIR/backups/latest.dump"
echo "$(date -u +%FT%TZ) backup ok: shaman-$TS.dump $(wc -c < "$TMP/db.dump" | tr -d " ") bytes"
if [ -n "$HEARTBEAT_URL" ]; then
  curl -fsS -m 15 "$HEARTBEAT_URL" >/dev/null || echo "heartbeat ping failed" >&2
fi

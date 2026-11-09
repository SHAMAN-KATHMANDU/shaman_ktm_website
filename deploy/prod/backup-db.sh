#!/usr/bin/env bash
# Nightly off-box backup: pg_dump of shaman-db + the host .env, uploaded to
# the write-only, versioned bucket (90-day expiry). The uploader key can
# PutObject only — it cannot list, read or delete, so a stolen host key cannot
# wipe old backups. Restore needs an admin credential (see README.md).
#
# Installed as /opt/shaman_web/backup-db.sh, run by /etc/cron.d/shaman-backup.
# Credentials: AWS profile "shaman-backup" in /root/.aws/credentials.
set -euo pipefail
DEST="${BACKUP_DEST:-s3://shaman-db-backups-766092484960/shaman}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
export AWS_PROFILE=shaman-backup

docker exec shaman-db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-acl' > "$TMP/db.dump"
# Refuse to upload a dump that pg_restore cannot read (empty or truncated).
docker exec -i shaman-db pg_restore -l < "$TMP/db.dump" > /dev/null

aws s3 cp --only-show-errors "$TMP/db.dump" "$DEST/db/shaman-$TS.dump"
aws s3 cp --only-show-errors /opt/shaman_web/.env "$DEST/env/env-$TS"
echo "$(date -u +%FT%TZ) backup ok: shaman-$TS.dump $(stat -c %s "$TMP/db.dump") bytes"

#!/usr/bin/env bash
# Prove the newest backup restores: load it into a THROWAWAY postgres
# container (no network, no volume), count rows in key tables, delete it.
# Never touches shaman-db or its volume.
#
#   sudo /opt/shaman_web/restore-test.sh [dump]   default: backups/latest.dump
#
# Exits non-zero if the restore errors or the catalog is empty.
set -euo pipefail
DUMP="${1:-${SHAMAN_DIR:-/opt/shaman_web}/backups/latest.dump}"
[ -r "$DUMP" ] || { echo "no readable dump at $DUMP (run backup-db.sh first)" >&2; exit 1; }
NAME="shaman-restore-test-$$"
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT

docker run -d --rm --name "$NAME" --network none \
  -e POSTGRES_PASSWORD=restore-test -e POSTGRES_DB=restore postgres:16-alpine >/dev/null
# TCP, not the socket: the image's init-time server listens on the socket only,
# so this waits for the real server.
ready=0
for _ in $(seq 1 60); do
  if docker exec "$NAME" pg_isready -h 127.0.0.1 -U postgres -d restore -q; then ready=1; break; fi
  sleep 1
done
[ "$ready" = 1 ] || { echo "throwaway postgres never became ready" >&2; exit 1; }

docker exec -i "$NAME" pg_restore -h 127.0.0.1 -U postgres -d restore \
  --no-owner --no-acl --exit-on-error < "$DUMP"

for t in Product Category Order Customer AdminUser; do
  n="$(docker exec "$NAME" psql -h 127.0.0.1 -U postgres -d restore -tAc "SELECT count(*) FROM \"$t\"")"
  echo "$t: $n rows"
  if [ "$t" = Product ] && [ "$n" -eq 0 ]; then
    echo "restore-test FAILED: no products in $DUMP" >&2; exit 1
  fi
done
echo "restore-test ok: $DUMP ($(date -u +%FT%TZ))"

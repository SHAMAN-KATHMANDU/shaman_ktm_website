#!/bin/sh
# Apply migrations on container start, then run the supplied command.
set -e

if [ -n "$DATABASE_URL" ]; then
  # No /prisma/migrations yet — sync schema directly. Switch to
  # `prisma migrate deploy` once migrations land.
  echo "Syncing Prisma schema (db push)…"
  prisma db push --accept-data-loss --skip-generate \
    || echo "(prisma db push failed; continuing)"
fi

if [ "$RUN_DB_SEED" = "1" ]; then
  echo "Running seed…"
  tsx prisma/seed.ts || echo "(seed failed; continuing)"
fi

exec "$@"

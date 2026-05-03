#!/bin/sh
# Apply migrations on container start, then run the supplied command.
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "Applying Prisma migrations…"
  npx prisma migrate deploy || echo "(prisma migrate deploy failed; continuing)"
fi

if [ "$RUN_DB_SEED" = "1" ]; then
  echo "Running seed…"
  npx tsx prisma/seed.ts || echo "(seed failed; continuing)"
fi

exec "$@"

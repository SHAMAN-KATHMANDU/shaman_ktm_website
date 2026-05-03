#!/bin/sh
# ─── Shaman web container entrypoint ─────────────────────────────────────────
#
# Responsibilities, in order:
#   1. Wait for Postgres to accept connections (DATABASE_URL must be reachable).
#   2. Apply schema:
#        - If prisma/migrations/ has migration directories → `prisma migrate deploy`
#        - Else (first-deploy or migrations not yet generated) → `prisma db push`
#      Either way the DB ends up matching the in-image schema.
#   3. If RUN_DB_SEED=1 → seed once (idempotent: seed.ts uses upsert).
#   4. Hand off to the supplied CMD (the Next.js standalone server).
#
# Exits non-zero on a hard failure (DB never reachable, migrate deploy errored
# on a real conflict, etc.) so docker / Watchtower can restart and surface it.

set -e

log()  { printf '\033[1;33m▸\033[0m %s\n' "$*"; }
warn() { printf '\033[1;31m!\033[0m %s\n' "$*" >&2; }

# ─── 1. Wait for DB ──────────────────────────────────────────────────────────
if [ -z "$DATABASE_URL" ]; then
  warn "DATABASE_URL not set — skipping migrate/seed steps."
else
  log "Waiting for Postgres at \$DATABASE_URL …"
  ATTEMPTS=0
  MAX_ATTEMPTS=60   # 60 × 1 s = 60 s
  until node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.\$queryRaw\`SELECT 1\`.then(() => p.\$disconnect()).then(() => process.exit(0)).catch(() => process.exit(1));
  " >/dev/null 2>&1; do
    ATTEMPTS=$((ATTEMPTS + 1))
    if [ "$ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
      warn "Postgres not reachable after ${MAX_ATTEMPTS}s — aborting."
      exit 1
    fi
    sleep 1
  done
  log "Postgres reachable after ${ATTEMPTS}s."

  # ─── 2. Apply schema ───────────────────────────────────────────────────────
  if [ -d prisma/migrations ] && [ -n "$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d 2>/dev/null | head -n 1)" ]; then
    log "Running prisma migrate deploy …"
    if ! prisma migrate deploy; then
      warn "prisma migrate deploy failed."
      exit 1
    fi
  else
    log "No migration files found — running prisma db push (first-deploy mode)."
    if ! prisma db push --accept-data-loss --skip-generate; then
      warn "prisma db push failed."
      exit 1
    fi
  fi

  # ─── 3. Seed (optional, idempotent) ────────────────────────────────────────
  if [ "$RUN_DB_SEED" = "1" ]; then
    log "Running seed …"
    if ! tsx prisma/seed.ts; then
      warn "Seed failed (continuing — the seed is idempotent so partial state is okay)."
    fi
  fi
fi

# ─── 4. Hand off ─────────────────────────────────────────────────────────────
log "Starting app: $*"
exec "$@"

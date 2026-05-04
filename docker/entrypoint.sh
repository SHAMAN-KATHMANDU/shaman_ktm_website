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
  # Parse host:port from the URL via a tiny node one-liner so we don't depend
  # on extra parsers (URL parsing in pure shell is unreliable for passwords
  # containing punctuation).
  DB_HOST=$(node -e "const u=new URL(process.env.DATABASE_URL);process.stdout.write(u.hostname);")
  DB_PORT=$(node -e "const u=new URL(process.env.DATABASE_URL);process.stdout.write(u.port||'5432');")
  until pg_isready -h "$DB_HOST" -p "$DB_PORT" -q >/dev/null 2>&1; do
    ATTEMPTS=$((ATTEMPTS + 1))
    if [ "$ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
      warn "Postgres not reachable at ${DB_HOST}:${DB_PORT} after ${MAX_ATTEMPTS}s — aborting."
      exit 1
    fi
    sleep 1
  done
  log "Postgres reachable at ${DB_HOST}:${DB_PORT} after ${ATTEMPTS}s."

  # ─── 2. Apply schema ───────────────────────────────────────────────────────
  # Migration files are committed under prisma/migrations/, so every deploy
  # goes through `prisma migrate deploy`. Existing prod DBs bootstrapped via
  # the old `db push` flow are auto-baselined: when migrate deploy errors
  # with P3005 ("schema is not empty") and the prod DB has no
  # `_prisma_migrations` row yet, we mark the very first migration as
  # already applied (its CREATE TABLEs match what `db push` produced) and
  # retry. Subsequent migrations are additive and apply normally.
  log "Running prisma migrate deploy …"
  MIGRATE_LOG=$(prisma migrate deploy 2>&1) || MIGRATE_RC=$?
  printf '%s\n' "$MIGRATE_LOG"

  if [ -n "${MIGRATE_RC:-}" ]; then
    if printf '%s' "$MIGRATE_LOG" | grep -q "P3005"; then
      FIRST_MIGRATION=$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d 2>/dev/null \
        | xargs -n1 basename 2>/dev/null | sort | head -n 1)
      if [ -n "$FIRST_MIGRATION" ]; then
        log "P3005 — baselining existing schema as ${FIRST_MIGRATION}."
        if ! prisma migrate resolve --applied "$FIRST_MIGRATION"; then
          warn "Could not baseline ${FIRST_MIGRATION}."
          exit 1
        fi
        log "Retrying prisma migrate deploy …"
        if ! prisma migrate deploy; then
          warn "prisma migrate deploy still failed after baseline."
          exit 1
        fi
      else
        warn "P3005 with no migration directories — cannot baseline."
        exit 1
      fi
    else
      warn "prisma migrate deploy failed."
      exit 1
    fi
  fi

  # ─── 3. Seed (optional, idempotent) ────────────────────────────────────────
  if [ "$RUN_DB_SEED" = "1" ]; then
    log "Running seed …"
    if ! tsx prisma/seed.ts; then
      warn "Seed failed."
      exit 1
    fi
  fi
fi

# ─── 4. Hand off ─────────────────────────────────────────────────────────────
log "Starting app: $*"
exec "$@"

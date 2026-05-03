# Database migrations

This project uses **Prisma migrations** for production schema changes. The
container's entrypoint (`docker/entrypoint.sh`) handles two regimes:

| State                                    | Entrypoint runs           |
| ---------------------------------------- | ------------------------- |
| `prisma/migrations/` has migration dirs  | `prisma migrate deploy`   |
| `prisma/migrations/` empty / missing     | `prisma db push` (first-deploy mode) |

The seed is run only when `RUN_DB_SEED=1` is set, and is idempotent (every
`upsert`, no destructive ops). Set it to `1` on the first ever deploy and
back to `0` on subsequent deploys.

## Generating a new migration (developer workflow)

You need a Postgres reachable at `DATABASE_URL` (the dev `docker compose up db`
service is fine).

```bash
# 1. Edit prisma/schema.prisma with the new field/model.
# 2. Generate a migration directory + apply it locally.
pnpm prisma migrate dev --name add-something

# 3. Commit the new prisma/migrations/<timestamp>_add-something/ directory.
git add prisma/migrations
git commit -m "Migration: add-something"
```

When the new image is deployed, `migrate deploy` will pick up the new
migration directory and apply it before the app starts.

## Baselining an existing prod database

If a prod DB was built up via `db push` and you want to switch it onto the
migration track without nuking data:

```bash
# 1. Locally, generate an "initial" migration that matches the current schema.
pnpm prisma migrate dev --name init

# 2. On the prod host, mark that migration as already applied (no-op):
ssh shaman_web "cd /opt/shaman_web && docker compose exec app prisma migrate resolve --applied <timestamp>_init"
```

After that, all future `migrate deploy` calls only apply *new* migrations.

## Rollback

Prisma does not auto-generate down migrations. To roll back:

1. Hand-write a counter migration in a new `prisma/migrations/<timestamp>_rollback-foo/migration.sql` and deploy it.
2. Or restore the volume from a Postgres backup.

The container does **not** automatically roll back on startup — a failed
`migrate deploy` exits the entrypoint non-zero and Watchtower / docker
restart-policy will keep retrying. Inspect logs with
`docker compose logs app` and fix forward.

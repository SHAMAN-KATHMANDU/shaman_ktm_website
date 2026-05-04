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

The container's entrypoint **auto-baselines** any existing prod DB that was
built up via `db push`. If `prisma migrate deploy` errors with `P3005`
("schema is not empty") on first boot after migrations land, the entrypoint
marks the very first migration as already applied (its CREATE TABLEs match
what `db push` produced) and retries. Subsequent migrations run normally.

You only need to baseline by hand if the auto-baseline can't (e.g. you've
added an unrelated migration before `init` in the directory listing). The
manual command, run inside the app image:

```bash
ssh shaman_web "cd /opt/shaman_web && \
  docker compose run --rm --no-deps --entrypoint '' app sh -c \
    'prisma migrate resolve --applied <timestamp>_init'"
```

After that, future `migrate deploy` calls only apply *new* migrations.

## Rollback

Prisma does not auto-generate down migrations. To roll back:

1. Hand-write a counter migration in a new `prisma/migrations/<timestamp>_rollback-foo/migration.sql` and deploy it.
2. Or restore the volume from a Postgres backup.

The container does **not** automatically roll back on startup — a failed
`migrate deploy` exits the entrypoint non-zero and Watchtower / docker
restart-policy will keep retrying. Inspect logs with
`docker compose logs app` and fix forward.

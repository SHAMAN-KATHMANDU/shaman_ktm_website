# Shaman Kathmandu — Website + CMS

Next.js 16 storefront and admin CMS for Shaman Kathmandu. Postgres-backed,
S3 media uploads, iron-session admin auth.

## Architecture

```
shamanktm-website/
  app/                      Next.js App Router
    api/public/v1/*         Public data API (storefront calls these)
    api/sysuser/*           Admin API — guarded by iron-session cookie
    sysuser/(authed)/*      Admin UI (CMS dashboards & editors)
    sysuser/login/          Admin login page
    [public routes...]      Storefront pages (home, products, stories, ...)
  components/
    site/                   Storefront components
    sysuser/                Admin-specific components
    ui/                     Shared design-system primitives
  lib/
    api/                    Public API client + server DTOs
    auth/                   Session + password hashing + role guards
    audit.ts                AdminLog write helper (called from every mutation)
    env.ts                  Zod-validated env loader (boot-time)
    seo.ts                  Metadata + canonical helpers
    site-content.ts         CMS-backed home copy + nav resolvers
    validation/schemas.ts   Single source of Zod schemas
  prisma/
    schema.prisma           Data model
    migrations/             Versioned migration history (apply via migrate deploy)
    seed.ts                 Idempotent seed (RUN_DB_SEED=1)
  test/                     Vitest unit tests (lib/*)
  middleware.ts             CSRF + API-key + session gating at the edge
  instrumentation.ts        Boot hook: validates env via lib/env.ts
  docker/entrypoint.sh      Wait-for-DB → migrate deploy → seed → exec server
```

## Site mode

Same build outputs either the live storefront or the coming-soon page based
on `NEXT_PUBLIC_SITE_MODE` (`live` | `coming-soon`, default `live`).

## Quick start (local dev)

```bash
# 1. Postgres — easiest is the compose db service.
docker compose up -d db

# 2. .env
cp .env.example .env
# Set:
#   SESSION_PASSWORD=...               (32+ chars; e.g. `openssl rand -base64 48`)
#   ADMIN_BOOTSTRAP_EMAIL=you@...
#   ADMIN_BOOTSTRAP_PASSWORD=...       (12+, mixed-case, digit, symbol; not "changeme")
#   DATABASE_URL=postgresql://shaman:shaman@localhost:5432/shaman

# 3. Install deps + apply schema + seed.
pnpm install
pnpm db:deploy
RUN_DB_SEED=1 pnpm db:seed

# 4. Run the app.
pnpm dev   # → http://localhost:3000
#                  /sysuser/login (admin)
```

## Available scripts

| Command            | What                                                      |
| ------------------ | --------------------------------------------------------- |
| `pnpm dev`         | Next dev server                                           |
| `pnpm build`       | `prisma generate` + `next build`                          |
| `pnpm start`       | Start the standalone production server                    |
| `pnpm lint`        | ESLint                                                    |
| `pnpm typecheck`   | `tsc --noEmit`                                            |
| `pnpm test`        | Vitest unit tests                                         |
| `pnpm test:watch`  | Vitest watch mode                                         |
| `pnpm verify`      | typecheck + lint + test                                   |
| `pnpm db:migrate`  | `prisma migrate dev` (creates a new migration locally)    |
| `pnpm db:deploy`   | `prisma migrate deploy` (apply pending migrations)        |
| `pnpm db:seed`     | Seed mock content + bootstrap admin                       |
| `pnpm db:studio`   | Prisma Studio                                             |

## Environment variables

Validated at boot by `lib/env.ts` — a missing or malformed value fails the
container loud and early instead of at first request.

| Var                          | Required | Notes                                                  |
| ---------------------------- | :------: | ------------------------------------------------------ |
| `DATABASE_URL`               | ✓        | Postgres connection string                             |
| `SESSION_PASSWORD`           | ✓        | 32+ char random for iron-session cookies               |
| `ADMIN_BOOTSTRAP_EMAIL`      | ✓        | First admin user created by seed                       |
| `ADMIN_BOOTSTRAP_PASSWORD`   | ✓        | 12+ chars, must include upper/lower/digit/symbol       |
| `S3_PUBLIC_BASE`             | ✓        | Public S3/CDN base URL for uploaded media              |
| `S3_REGION`, `S3_BUCKET`     |          | Default `ap-south-1` / `ims-shaman-photos`             |
| `S3_ACCESS_KEY_ID/SECRET`    |          | Leave empty on EC2 (instance role provides creds)      |
| `PROJECTX_API_MODE`          |          | `live` (DB) or `mock` (data/mock/*) — defaults `live`  |
| `NEXT_PUBLIC_SITE_MODE`      |          | `live` or `coming-soon`                                |
| `NEXT_PUBLIC_PROJECTX_API_KEY` |        | When set, middleware enforces `Authorization: Bearer`  |
| `RUN_DB_SEED`                |          | `1` runs seed on container start                       |

See `.env.example` for the full list.

## Admin / CMS walkthrough

The CMS lives at `/sysuser`. Login with the credentials from
`ADMIN_BOOTSTRAP_*`. Sections:

- **Site** (`/sysuser/site`) — brand, home copy (hero, brand-strip cards,
  section headings, newsletter, footer copy), navigation editor (header
  links, footer columns, social icons, hero CTAs), contact, SEO, locale,
  price-filter tiers.
- **Modules** — feature flags for storefront sections.
- **Homepage** — choose featured products, posts, services for the home page.
- **Products / Bundles / Collections / Categories / Elements** — full CRUD.
  Each editor exposes a full SEO panel (title, description, OG image,
  canonical, `noindex`, twitter card).
- **Blog (posts + categories)** — full CRUD with markdown body, hero
  image/video, tags.
- **Pages** — about / faq / privacy / terms etc., editable as Markdown.
- **Services** — energy services with what-to-expect + related products.
- **Showrooms** — branch directory powering the `/contact` page + footer.
- **Reviews** — moderation queue (pending → approved). Public submissions
  always land unapproved.
- **Media** — uploaded files with search, alt-text editing, dimensions.
- **Redirects** — versioned URL forwards.
- **Announcement** — site-wide top bar (gated by `announcementBar` module).
- **Activity** — read-only audit log (`AdminLog`) of every mutation.
- **Team** — owner-only user management with role-based permissions.

### Roles

- **owner** — everything, including team management.
- **editor** — content CRUD on every section above except Team.
- **viewer** — read-only.

The first bootstrapped admin is auto-promoted to `owner`. Create more
admins via `/sysuser/users`.

### Audit log

Every POST / PUT / PATCH / DELETE on `/api/sysuser/*` writes a row to
`AdminLog` (actor, action, entity, entityId, summary, createdAt). Browse
the queue at `/sysuser/activity`.

### Password reset

If an owner gets locked out:

1. `POST /api/sysuser/auth/request-reset` with `{ email }` — in non-prod
   the response includes a `devToken`; in prod the same data is logged for
   the email sender to relay.
2. `POST /api/sysuser/auth/reset` with `{ userId, token, newPassword }`.

## Deploy

Production uses Docker on a single EC2 instance with Watchtower for
pull-based updates. See [`deploy/prod/README.md`](deploy/prod/README.md)
for runbook, healthchecks, and the backup/restore procedure.

Pre-flight checks before bumping a release:

```bash
pnpm verify              # typecheck + lint + tests
pnpm prisma migrate dev  # if schema.prisma changed — commits a new migration
```

CI builds on every push to `main` and pushes a fresh image to Docker Hub;
Watchtower pulls within 60s.

## Security posture

- **Authentication.** Iron-session encrypted cookies (14-day max age,
  HttpOnly, SameSite=lax, Secure outside dev). Session is regenerated on
  login (defends against session fixation).
- **Brute-force.** `/api/sysuser/auth/login` is rate-limited via the
  `AdminLog` table — 5 failed attempts per email per 15 min → 429.
- **Password policy.** 12+ chars, mixed case, digit, symbol. Enforced on
  bootstrap, change-password, reset, and team invite.
- **CSRF.** Edge middleware checks `Origin`/`Referer` on every state-
  changing request to `/api/sysuser/*` and `/api/public/v1/*`.
- **Public API key.** When `NEXT_PUBLIC_PROJECTX_API_KEY` is set, the
  middleware requires `Authorization: Bearer <key>` on `/api/public/v1/*`.
- **Audit log.** Every admin mutation records `actor`, `action`, `entity`,
  `entityId`, summary in `AdminLog`.
- **Env validation.** `lib/env.ts` runs at server boot and refuses to
  start with missing or insecure values (e.g. `ADMIN_BOOTSTRAP_PASSWORD`
  literally `"changeme"`).
- **Security headers.** `next.config.ts` emits HSTS, X-Frame-Options=DENY,
  X-Content-Type-Options=nosniff, Referrer-Policy, Permissions-Policy,
  and a Content-Security-Policy locked to S3 + YouTube + Vimeo.

## Migrations

`prisma/migrations/` is the source of truth — `entrypoint.sh` runs
`prisma migrate deploy` on every container start. Generate new migrations
locally with `pnpm db:migrate --name <descriptive-name>` and commit the
new directory. Existing prod DBs that predate the migration regime are
auto-baselined: on `P3005` the entrypoint marks the first migration as
already applied and retries.

See [`prisma/MIGRATIONS.md`](prisma/MIGRATIONS.md) for rollback strategy.

## Tests

```bash
pnpm test
```

Vitest unit tests cover:
- `lib/auth/password` (hash + verify round-trip, salt uniqueness)
- `lib/format` (NPR formatting, slugify)
- `lib/whatsapp` (URL builder)
- `lib/validation/schemas` (slug rules, MIME allowlist, redirect format)

Add new tests under `test/lib/<name>.test.ts`.

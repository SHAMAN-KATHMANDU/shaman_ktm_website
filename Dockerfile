# syntax=docker/dockerfile:1.7
#
# Multi-stage Node runtime build for the Shaman CMS + public site.
# Replaces the previous static-export + nginx setup.

# ─── Stage 1: install deps ───────────────────────────────────────────────────
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile || pnpm install

# ─── Stage 2: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

ARG NEXT_PUBLIC_SITE_MODE=live
ARG NEXT_PUBLIC_PROJECTX_API_BASE=
ARG NEXT_PUBLIC_PROJECTX_ORIGIN=https://shamankathmandu.com
ARG S3_PUBLIC_BASE=https://ims-shaman-photos.s3.ap-south-1.amazonaws.com

# Build with mock content — live mode would try to call /api over HTTP during
# static page-data collection, which has no server. Runtime container env
# sets PROJECTX_API_MODE=live to read from Postgres on each request.
ENV NEXT_PUBLIC_SITE_MODE=$NEXT_PUBLIC_SITE_MODE \
    NEXT_PUBLIC_PROJECTX_API_BASE=$NEXT_PUBLIC_PROJECTX_API_BASE \
    NEXT_PUBLIC_PROJECTX_ORIGIN=$NEXT_PUBLIC_PROJECTX_ORIGIN \
    S3_PUBLIC_BASE=$S3_PUBLIC_BASE \
    PROJECTX_API_MODE=mock \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm prisma generate
RUN pnpm run build

# ─── Stage 3: runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Install prisma CLI + tsx globally with npm so they work without pnpm's
# symlink layout (the COPYed pnpm symlinks resolve to nonexistent paths in
# the slimmed runtime image). bcryptjs is needed by prisma/seed.ts.
RUN npm install -g prisma@6.19.3 tsx@4.19.2

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# Seed reads /data/mock/* — keep it in the image so RUN_DB_SEED=1 works.
COPY --from=builder --chown=nextjs:nodejs /app/data ./data
# Seed (tsx) imports from data/mock which import from "@/lib/*"; copy the
# minimum needed for those re-exports plus tsconfig.json so tsx resolves "@".
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --chown=nextjs:nodejs docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "server.js"]

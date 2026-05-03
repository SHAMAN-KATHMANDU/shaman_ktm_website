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
    PORT=3000

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --chown=nextjs:nodejs docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "server.js"]

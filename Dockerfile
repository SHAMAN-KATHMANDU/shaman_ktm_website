# syntax=docker/dockerfile:1.7

# -----------------------------------------------------------------------------
# Stage 1: build the Next.js static export
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

ARG PROJECTX_API_MODE=mock
ARG NEXT_PUBLIC_SITE_MODE=live
ARG NEXT_PUBLIC_PROJECTX_API_BASE=https://api.projectx.example/api/v1
ARG NEXT_PUBLIC_PROJECTX_API_KEY=
ARG NEXT_PUBLIC_PROJECTX_ORIGIN=https://shamankathmandu.com

ENV PROJECTX_API_MODE=$PROJECTX_API_MODE \
    NEXT_PUBLIC_SITE_MODE=$NEXT_PUBLIC_SITE_MODE \
    NEXT_PUBLIC_PROJECTX_API_BASE=$NEXT_PUBLIC_PROJECTX_API_BASE \
    NEXT_PUBLIC_PROJECTX_API_KEY=$NEXT_PUBLIC_PROJECTX_API_KEY \
    NEXT_PUBLIC_PROJECTX_ORIGIN=$NEXT_PUBLIC_PROJECTX_ORIGIN \
    NEXT_TELEMETRY_DISABLED=1

COPY . .

RUN pnpm run build

# -----------------------------------------------------------------------------
# Stage 2: serve static files with nginx
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runner

RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/out /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]

#!/usr/bin/env bash
# Deploy one image tag to this host. It is the ONLY command the GitHub Actions
# deploy key may run: authorized_keys pins it with
#   restrict,command="/opt/shaman_web/deploy.sh" ssh-ed25519 … shaman-gha-deploy
# so the key cannot open a shell, forward ports or run anything else.
#
# CI:        printf '%s\n' "$GITHUB_TOKEN" | ssh ubuntu@<host> prod-<40-hex sha>
# Rollback:  /opt/shaman_web/deploy.sh prod-<sha>   (on the host; no token
#            needed while that image is still cached — the last 3 are kept)
#
# stdin carries the job's short-lived GITHUB_TOKEN (packages: read). It is used
# for one pull in a throwaway DOCKER_CONFIG and never written to the host's
# docker config, so the host holds no registry credential.
#
# Order matters — the running site is only touched once the new image has
# migrated the DB successfully:
#   1. pull   2. backup the DB (abort on failure)
#   3. migrate with the NEW image in a one-off container (abort on failure;
#      the running app is untouched)
#   4. retag :prod and recreate the app   5. wait for healthy, else put the
#      previous image back and exit non-zero.
# A rollback does NOT undo a migration that step 3 applied.
#
# This file is installed on the host BY HAND (/opt/shaman_web/deploy.sh);
# merging a change here does not update the host copy.
set -euo pipefail

TAG="${SSH_ORIGINAL_COMMAND:-${1:-}}"
[[ "$TAG" =~ ^prod-[0-9a-f]{40}$ ]] || { echo "usage: deploy.sh prod-<40-hex git sha>" >&2; exit 2; }
IMAGE=ghcr.io/shaman-kathmandu/shamanktmweb
# DEPLOY_DIR exists for test/deploy/deploy-sh.test.ts; the forced SSH command
# cannot set environment variables.
DIR="${DEPLOY_DIR:-/opt/shaman_web}"
cd "$DIR"

if ! docker image inspect "$IMAGE:$TAG" >/dev/null 2>&1; then
  CFG="$(mktemp -d)"; trap 'rm -rf "$CFG"' EXIT
  DOCKER_CONFIG="$CFG" docker login ghcr.io -u x-access-token --password-stdin >/dev/null
  DOCKER_CONFIG="$CFG" docker pull -q "$IMAGE:$TAG"
  rm -rf "$CFG"
fi
# stdin was the registry token; nothing below may read it.
exec </dev/null

health() {
  docker inspect shaman-web --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' 2>/dev/null || echo missing
}
wait_healthy() {
  local s
  for _ in $(seq 1 60); do
    s="$(health)"
    [ "$s" = healthy ] && return 0
    [ "$s" = unhealthy ] && return 1
    sleep 3
  done
  return 1
}
log() { echo "$(date -u +%FT%TZ) $TAG $*" | tee -a "$DIR/deploys.log"; }

PREV_ID="$(docker inspect shaman-web --format '{{.Image}}' 2>/dev/null || true)"
PREV_TAG=""
if [ -n "$PREV_ID" ]; then
  PREV_TAG="$(docker image inspect "$PREV_ID" --format '{{range .RepoTags}}{{println .}}{{end}}' \
    | sed -n 's/.*:\(prod-[0-9a-f]\{40\}\)$/\1/p' | head -n 1 || true)"
fi
PREV="previous=${PREV_TAG:-?} (${PREV_ID:-none})"

if ! sudo -n /opt/shaman_web/backup-db.sh; then
  log "ABORTED: pre-deploy backup failed; site untouched. $PREV"
  exit 1
fi

# The entrypoint waits for the DB, runs `prisma migrate deploy`, then execs
# the given command — `true` makes this a migrate-only run that exits 0.
# DOCKER_IMAGE from the shell overrides .env, so this runs the NEW image.
# Own name: the service's container_name (shaman-web) belongs to the live app.
docker rm -f shaman-web-migrate >/dev/null 2>&1 || true
if ! DOCKER_IMAGE="$IMAGE:$TAG" docker compose run --rm --no-deps -T --name shaman-web-migrate \
    -e RUN_DB_SEED=0 app true; then
  log "ABORTED: migration failed; site untouched. $PREV"
  exit 1
fi

# The compose file runs $DOCKER_IMAGE (= …:prod), so retagging is the switch.
docker tag "$IMAGE:$TAG" "$IMAGE:prod"
docker compose up -d --no-deps app

if ! wait_healthy; then
  STATUS="$(health)"
  docker logs --tail 40 shaman-web >&2 || true
  if [ -n "$PREV_ID" ]; then
    docker tag "$PREV_ID" "$IMAGE:prod"
    docker compose up -d --no-deps app
    if wait_healthy; then RB=ok; else RB="FAILED ($(health))"; fi
    log "FAILED health=$STATUS; rolled back to $PREV: $RB"
  else
    log "FAILED health=$STATUS; no previous image to roll back to"
  fi
  echo "deploy FAILED: $TAG was $STATUS" >&2
  exit 1
fi
log "health=healthy $PREV"

# Keep the 3 newest prod-<sha> images for offline rollback; drop older ones.
docker images "$IMAGE" --format '{{.Tag}}' | grep '^prod-' | tail -n +4 \
  | xargs -r -I{} docker rmi "$IMAGE:{}" >/dev/null 2>&1 || true
docker image prune -f >/dev/null

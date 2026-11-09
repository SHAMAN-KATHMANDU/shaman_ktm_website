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
set -euo pipefail

TAG="${SSH_ORIGINAL_COMMAND:-${1:-}}"
[[ "$TAG" =~ ^prod-[0-9a-f]{40}$ ]] || { echo "usage: deploy.sh prod-<40-hex git sha>" >&2; exit 2; }
IMAGE=ghcr.io/shaman-kathmandu/shamanktmweb
cd /opt/shaman_web

if ! docker image inspect "$IMAGE:$TAG" >/dev/null 2>&1; then
  CFG="$(mktemp -d)"; trap 'rm -rf "$CFG"' EXIT
  DOCKER_CONFIG="$CFG" docker login ghcr.io -u x-access-token --password-stdin >/dev/null
  DOCKER_CONFIG="$CFG" docker pull -q "$IMAGE:$TAG"
  rm -rf "$CFG"
fi

PREV="$(docker inspect shaman-web --format '{{.Image}}' 2>/dev/null || true)"
# The compose file runs $DOCKER_IMAGE (= …:prod), so retagging is the switch.
docker tag "$IMAGE:$TAG" "$IMAGE:prod"
docker compose up -d --no-deps app

for _ in $(seq 1 60); do
  case "$(docker inspect shaman-web --format '{{.State.Health.Status}}')" in
    healthy) break ;;
    unhealthy) break ;;
  esac
  sleep 3
done
STATUS="$(docker inspect shaman-web --format '{{.State.Health.Status}}')"
echo "$(date -u +%FT%TZ) $TAG health=$STATUS previous=$PREV" | tee -a /opt/shaman_web/deploys.log
if [ "$STATUS" != healthy ]; then
  docker logs --tail 40 shaman-web >&2
  echo "deploy FAILED: $TAG is $STATUS. Roll back with: deploy.sh prod-<previous sha>" >&2
  exit 1
fi

# Keep the 3 newest prod-<sha> images for offline rollback; drop older ones.
docker images "$IMAGE" --format '{{.Tag}}' | grep '^prod-' | tail -n +4 \
  | xargs -r -I{} docker rmi "$IMAGE:{}" >/dev/null 2>&1 || true
docker image prune -f >/dev/null

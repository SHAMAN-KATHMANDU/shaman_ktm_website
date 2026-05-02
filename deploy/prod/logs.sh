#!/usr/bin/env bash
# =============================================================================
# deploy/prod/logs.sh
# View logs for the shamanktmweb stack.
#
# Usage:
#   ./logs.sh                         -- last 100 lines from shamanktmweb
#   ./logs.sh -f                      -- follow shamanktmweb logs
#   ./logs.sh --tail 50               -- last 50 lines
#   ./logs.sh watchtower              -- watchtower logs (last 100)
#   ./logs.sh watchtower -f           -- follow watchtower logs
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=functions.sh
source "${SCRIPT_DIR}/functions.sh"

cd "$SCRIPT_DIR"

require_docker

TARGET="web"
FOLLOW=false
TAIL_LINES=100
EXTRA_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -f|--follow)
      FOLLOW=true
      shift
      ;;
    --tail)
      TAIL_LINES="$2"
      shift 2
      ;;
    --tail=*)
      TAIL_LINES="${1#--tail=}"
      shift
      ;;
    web|shamanktmweb)
      TARGET="web"
      shift
      ;;
    watchtower)
      TARGET="watchtower"
      shift
      ;;
    -*)
      EXTRA_ARGS+=("$1")
      shift
      ;;
    *)
      error "Unknown target: '$1'"
      echo "Valid: web (default), watchtower"
      exit 1
      ;;
  esac
done

COMPOSE_ARGS=("--tail=${TAIL_LINES}")
if $FOLLOW; then
  COMPOSE_ARGS+=("-f")
fi
COMPOSE_ARGS+=("${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}")

if [[ "$TARGET" == "watchtower" ]]; then
  docker compose -f watchtower.yml logs "${COMPOSE_ARGS[@]}" watchtower
else
  docker compose logs "${COMPOSE_ARGS[@]}" shamanktmweb
fi

#!/usr/bin/env bash
# =============================================================================
# deploy/prod/restart.sh
# Restart the production stack or a single component.
#
# Usage:
#   ./restart.sh             -- restart shamanktmweb (default)
#   ./restart.sh web         -- restart shamanktmweb
#   ./restart.sh watchtower  -- restart Watchtower
#   ./restart.sh all         -- restart both
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=functions.sh
source "${SCRIPT_DIR}/functions.sh"

cd "$SCRIPT_DIR"

require_docker

TARGET="${1:-web}"

case "$TARGET" in
  web|shamanktmweb)
    step "Restarting shamanktmweb..."
    docker compose restart shamanktmweb
    success "shamanktmweb restarted"
    ;;
  watchtower)
    step "Restarting Watchtower..."
    docker compose -f watchtower.yml restart watchtower
    success "Watchtower restarted"
    ;;
  all)
    step "Restarting shamanktmweb..."
    docker compose restart shamanktmweb
    step "Restarting Watchtower..."
    docker compose -f watchtower.yml restart watchtower
    success "All services restarted"
    ;;
  *)
    error "Unknown target: '${TARGET}'"
    echo ""
    echo "Valid options: web (default), watchtower, all"
    exit 1
    ;;
esac

echo ""
docker compose ps
echo ""

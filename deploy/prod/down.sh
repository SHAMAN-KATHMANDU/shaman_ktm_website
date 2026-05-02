#!/usr/bin/env bash
# =============================================================================
# deploy/prod/down.sh
# Stop the production stack (Watchtower first, then the website container).
#
# Usage:
#   ./down.sh            -- stop containers (no app data, but kept for parity)
#   ./down.sh --volumes  -- also remove the docker network/volumes
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=functions.sh
source "${SCRIPT_DIR}/functions.sh"

cd "$SCRIPT_DIR"

REMOVE_VOLUMES=false
if [[ "${1:-}" == "--volumes" ]]; then
  REMOVE_VOLUMES=true
fi

step "Stopping Production Stack"
divider

require_docker

# -----------------------------------------------------------------------------
# 1. Stop Watchtower first (so it can't restart the website while we're stopping)
# -----------------------------------------------------------------------------
step "Stopping Watchtower..."
if docker compose -f watchtower.yml ps --quiet 2>/dev/null | grep -q .; then
  docker compose -f watchtower.yml down
  success "Watchtower stopped"
else
  info "Watchtower is not running -- skipping"
fi

# -----------------------------------------------------------------------------
# 2. Stop the website container
# -----------------------------------------------------------------------------
step "Stopping shamanktmweb..."
if $REMOVE_VOLUMES; then
  docker compose down --volumes
  success "App stack stopped and volumes removed"
else
  docker compose down
  success "App stack stopped"
fi

divider
success "Production stack is down."
echo ""
echo "To start again: ./up.sh"
echo ""

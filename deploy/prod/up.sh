#!/usr/bin/env bash
# =============================================================================
# deploy/prod/up.sh
# Start the production stack: shamanktmweb container + Watchtower.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=functions.sh
source "${SCRIPT_DIR}/functions.sh"

cd "$SCRIPT_DIR"

step "Starting Production Stack"
divider

require_docker
require_env "."

# -----------------------------------------------------------------------------
# 1. Start the website container
# -----------------------------------------------------------------------------
step "Starting shamanktmweb..."
docker compose up -d
success "App stack started"

# -----------------------------------------------------------------------------
# 2. Wait for it to become healthy
# -----------------------------------------------------------------------------
step "Waiting for shamanktmweb to be healthy..."
wait_for_health "shamanktmweb" 60 || warn "Container did not report healthy in time -- check ./logs.sh"

# -----------------------------------------------------------------------------
# 3. Start Watchtower
# -----------------------------------------------------------------------------
step "Starting Watchtower (auto-pull :prod every 15s)..."
docker compose -f watchtower.yml up -d
success "Watchtower started"

# -----------------------------------------------------------------------------
# 4. Print summary
# -----------------------------------------------------------------------------
divider
success "Production stack is up!"
echo ""
docker compose ps
echo ""
echo "Endpoint:"
echo "  Web: http://localhost:3000  (host nginx -> https://shamankathmandu.com)"
echo ""
echo "Useful commands:"
echo "  ./logs.sh -f             -- follow website logs"
echo "  ./logs.sh watchtower -f  -- follow Watchtower logs"
echo "  ./status.sh              -- container status + resource usage"
echo "  ./health.sh              -- quick health probe"
echo "  ./restart.sh             -- restart everything"
echo "  ./down.sh                -- stop everything"
echo ""

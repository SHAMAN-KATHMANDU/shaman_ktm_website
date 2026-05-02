#!/usr/bin/env bash
# =============================================================================
# deploy/prod/status.sh
# Show container status + resource usage for the shamanktmweb stack.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=functions.sh
source "${SCRIPT_DIR}/functions.sh"

cd "$SCRIPT_DIR"

require_docker

step "Production Stack Status"
divider

# -----------------------------------------------------------------------------
# 1. Containers
# -----------------------------------------------------------------------------
step "Container Status"
docker compose ps
echo ""
if docker compose -f watchtower.yml ps --quiet 2>/dev/null | grep -q .; then
  echo "Watchtower:"
  docker compose -f watchtower.yml ps
  echo ""
fi

# -----------------------------------------------------------------------------
# 2. Resource usage
# -----------------------------------------------------------------------------
step "Resource Usage (CPU / Memory / Net I/O)"
docker stats --no-stream \
  --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" \
  shamanktmweb watchtower-prod 2>/dev/null || \
  docker stats --no-stream 2>/dev/null || true
echo ""

# -----------------------------------------------------------------------------
# 3. Image info (handy to confirm Watchtower has updated)
# -----------------------------------------------------------------------------
step "Current image"
docker inspect --format='  {{.Config.Image}}@{{.Image}}{{"\n  Started: "}}{{.State.StartedAt}}' shamanktmweb 2>/dev/null || \
  warn "shamanktmweb container is not running"
echo ""

# -----------------------------------------------------------------------------
# 4. Host disk
# -----------------------------------------------------------------------------
step "Host Disk Usage"
df -h / 2>/dev/null || true
echo ""

divider
info "Run './health.sh' for a quick HTTP health probe."
echo ""

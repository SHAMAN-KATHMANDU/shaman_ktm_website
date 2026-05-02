#!/usr/bin/env bash
# =============================================================================
# deploy/prod/health.sh
# Quick health probe for the shamanktmweb stack.
# Exits 0 if all checks pass, 1 if any fail.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=functions.sh
source "${SCRIPT_DIR}/functions.sh"

cd "$SCRIPT_DIR"

ALL_PASS=true

step "Production Health Check"
divider

# -----------------------------------------------------------------------------
# Website (GET /)
# -----------------------------------------------------------------------------
echo -n "Web    http://localhost:3000     ... "
if curl -sf --max-time 5 -o /dev/null http://localhost:3000 2>/dev/null; then
  echo -e "${COLOR_GREEN}PASS${COLOR_RESET}"
else
  echo -e "${COLOR_RED}FAIL${COLOR_RESET}"
  ALL_PASS=false
fi

# -----------------------------------------------------------------------------
# Container health status
# -----------------------------------------------------------------------------
echo -n "shamanktmweb container health    ... "
WEB_STATUS=$(docker inspect --format='{{.State.Health.Status}}' shamanktmweb 2>/dev/null || echo "not_found")
if [[ "$WEB_STATUS" == "healthy" ]]; then
  echo -e "${COLOR_GREEN}PASS${COLOR_RESET} (${WEB_STATUS})"
else
  echo -e "${COLOR_RED}FAIL${COLOR_RESET} (${WEB_STATUS})"
  ALL_PASS=false
fi

# -----------------------------------------------------------------------------
# Watchtower presence (warn only, not a hard fail)
# -----------------------------------------------------------------------------
echo -n "watchtower-prod running          ... "
WT_STATE=$(docker inspect --format='{{.State.Status}}' watchtower-prod 2>/dev/null || echo "not_found")
if [[ "$WT_STATE" == "running" ]]; then
  echo -e "${COLOR_GREEN}PASS${COLOR_RESET}"
else
  echo -e "${COLOR_YELLOW}WARN${COLOR_RESET} (${WT_STATE}) -- auto-deploy will not work"
fi

divider

if $ALL_PASS; then
  success "All health checks passed"
  exit 0
else
  error "One or more health checks failed"
  echo ""
  echo "Debug tips:"
  echo "  ./logs.sh -f         -- follow website logs"
  echo "  ./status.sh          -- container + resource info"
  exit 1
fi

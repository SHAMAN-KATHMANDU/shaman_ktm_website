#!/usr/bin/env bash
# =============================================================================
# deploy/prod/setup.sh
# First-time setup for the PRODUCTION EC2 instance running shamanktmweb.
# Run this once before ./up.sh on a fresh server.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=functions.sh
source "${SCRIPT_DIR}/functions.sh"

cd "$SCRIPT_DIR"

step "shamanktmweb -- First-time EC2 Setup"
divider

# -----------------------------------------------------------------------------
# 1. Check Docker
# -----------------------------------------------------------------------------
step "Checking Docker..."
require_docker

# -----------------------------------------------------------------------------
# 2. Create .env from template (kept for parity; no required vars today)
# -----------------------------------------------------------------------------
step "Environment file..."
if [[ -f ".env" ]]; then
  success ".env already exists -- skipping copy"
else
  cp .env.example .env
  success "Created .env from .env.example"
  info "No host-side runtime vars are required for this static site."
  info "Build-time NEXT_PUBLIC_* values are set in GitHub Actions secrets/vars."
fi

# -----------------------------------------------------------------------------
# 3. Docker Hub login (optional; required only if image becomes private)
# -----------------------------------------------------------------------------
step "Docker Hub login..."
echo ""
echo "If rpandox/shamanktmweb is a private repository, log in so the"
echo "first ./up.sh and Watchtower can pull the image."
echo ""
read -r -p "Log in to Docker Hub now? [y/N] " answer
if [[ "$answer" =~ ^[Yy]$ ]]; then
  docker login
  success "Docker Hub login successful"
else
  info "Skipped Docker Hub login -- assuming public image."
fi

divider
success "Setup complete!"
echo ""
echo "Next steps:"
echo "  1. ./up.sh                -- start shamanktmweb + Watchtower"
echo "  2. ./health.sh            -- verify the site responds on :3000"
echo "  3. sudo ./setup-nginx.sh  -- install host nginx + Let's Encrypt HTTPS"
echo ""

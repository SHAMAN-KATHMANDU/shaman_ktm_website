#!/usr/bin/env bash
# =============================================================================
# deploy/prod/setup-nginx.sh
# Install host nginx + Let's Encrypt HTTPS for the shamanktmweb production EC2.
#
# Domains:
#   www.shamankathmandu.com   -> shamanktmweb container (port 3000)  [canonical]
#   shamankathmandu.com       -> 301 redirect to www
#
# Prerequisites:
#   - DNS A records for both domains must point to this server's public IP
#   - Run as root (sudo ./setup-nginx.sh)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=functions.sh
source "${SCRIPT_DIR}/functions.sh"

require_root

APEX_DOMAIN="shamankathmandu.com"
WWW_DOMAIN="www.shamankathmandu.com"
ADMIN_EMAIL="${CERTBOT_EMAIL:-admin@shamankathmandu.com}"
NGINX_CONF_NAME="shamanktmweb"
NGINX_AVAILABLE="/etc/nginx/sites-available/${NGINX_CONF_NAME}.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/${NGINX_CONF_NAME}.conf"

step "Nginx + HTTPS Setup (shamanktmweb)"
divider

# -----------------------------------------------------------------------------
# 1. Install nginx + certbot
# -----------------------------------------------------------------------------
step "Installing nginx and certbot..."
if ! command -v nginx &>/dev/null; then
  apt-get update -q
  apt-get install -y nginx
  success "nginx installed"
else
  success "nginx already installed ($(nginx -v 2>&1 | head -1))"
fi

if ! command -v certbot &>/dev/null; then
  apt-get update -q
  apt-get install -y certbot python3-certbot-nginx
  success "certbot installed"
else
  success "certbot already installed"
fi

# -----------------------------------------------------------------------------
# 2. Drop config
# -----------------------------------------------------------------------------
step "Installing nginx site config..."
cp "${SCRIPT_DIR}/nginx.conf" "$NGINX_AVAILABLE"
success "Copied nginx.conf -> ${NGINX_AVAILABLE}"

if [[ -L "/etc/nginx/sites-enabled/default" ]]; then
  rm -f "/etc/nginx/sites-enabled/default"
  info "Removed default nginx site"
fi

if [[ ! -L "$NGINX_ENABLED" ]]; then
  ln -s "$NGINX_AVAILABLE" "$NGINX_ENABLED"
  success "Enabled: ${NGINX_ENABLED}"
else
  success "Already enabled: ${NGINX_ENABLED}"
fi

# -----------------------------------------------------------------------------
# 3. Test + reload
# -----------------------------------------------------------------------------
step "Testing nginx config..."
nginx -t
success "nginx config is valid"

step "Reloading nginx..."
systemctl reload nginx
success "nginx reloaded"

# -----------------------------------------------------------------------------
# 4. Let's Encrypt
# -----------------------------------------------------------------------------
step "Requesting HTTPS certificates..."
echo ""
SERVER_IP=$(curl -sf --max-time 3 https://api.ipify.org 2>/dev/null || echo '<this server IP>')
warn "DNS A records must already point to this server before certbot can succeed."
warn "  ${APEX_DOMAIN} -> ${SERVER_IP}"
warn "  ${WWW_DOMAIN}  -> ${SERVER_IP}"
echo ""
read -r -p "Run certbot now? [y/N] " answer

if [[ "$answer" =~ ^[Yy]$ ]]; then
  certbot --nginx \
    -d "${APEX_DOMAIN}" \
    -d "${WWW_DOMAIN}" \
    --non-interactive \
    --agree-tos \
    --redirect \
    -m "${ADMIN_EMAIL}"
  success "HTTPS certificates obtained!"

  step "Reloading nginx with HTTPS config..."
  systemctl reload nginx
  success "nginx reloaded with HTTPS"
else
  info "Skipped certbot. Run manually when DNS is ready:"
  echo ""
  echo "  sudo certbot --nginx -d ${APEX_DOMAIN} -d ${WWW_DOMAIN}"
  echo ""
fi

# -----------------------------------------------------------------------------
# 5. Auto-renewal
# -----------------------------------------------------------------------------
step "Verifying certbot auto-renewal timer..."
if systemctl is-enabled certbot.timer &>/dev/null; then
  success "certbot.timer is enabled (auto-renewal active)"
else
  systemctl enable certbot.timer 2>/dev/null || true
  info "certbot.timer enabled for auto-renewal"
fi

divider
success "Nginx setup complete!"
echo ""
echo "Verify:"
echo "  https://${WWW_DOMAIN}"
echo "  https://${APEX_DOMAIN}   (should 301 to www)"
echo ""

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

if [[ -L "/etc/nginx/sites-enabled/default" ]]; then
  rm -f "/etc/nginx/sites-enabled/default"
  info "Removed default nginx site"
fi

# THE GUARD RUNS BEFORE THE COPY, DELIBERATELY.
#
# It used to run after. That ordering meant a refused run had already
# overwritten sites-available — the script would say "I refuse to touch
# anything" while having just replaced a file, which is the worst of both
# answers. Nothing below this point writes until the guard has passed.
#
# The enable step must handle three states, not two. The old guard was
# `if [[ ! -L $NGINX_ENABLED ]]; then ln -s ...`, which treats "a regular file
# is sitting there" the same as "nothing is there" — and `ln -s` without -f
# then fails with "File exists". Under `set -e` that aborted the script, so
# sites-enabled kept the old config and nginx -t / reload never ran.
#
# That is not hypothetical: it is the state production has been in. On the live
# host sites-enabled/shamanktmweb.conf is a REGULAR FILE dated 2026-05-03 while
# sites-available is newer and differs — every run since has been updating a
# file nginx does not read.
if [[ -e "$NGINX_ENABLED" && ! -L "$NGINX_ENABLED" ]]; then
  # A real file where the symlink belongs. REFUSE, and refuse before writing
  # anything at all. The two copies have diverged in both directions on this
  # host, so replacing the live one applies every pending difference at once,
  # on a production server. That is a decision, not a cleanup.
  error "${NGINX_ENABLED} is a regular file, not a symlink to sites-available."
  error "nginx is loading THAT file, so this script cannot take effect without replacing it."
  error "NOTHING HAS BEEN CHANGED. sites-available is untouched."
  error ""
  error "Do NOT simply symlink over it. The live file carries TLS and a 25m body"
  error "cap; a config lacking either will pass \`nginx -t\` and still take the"
  error "site off HTTPS or start rejecting uploads that work today."
  error ""
  error "The reconciliation, the diff and the ordered steps are written up in:"
  error "    deploy/prod/RECONCILIATION-2026-08-21.md   (section: \"Steps to apply\")"
  error ""
  error "Before anyone symlinks anything, the file being enabled must contain"
  error "BOTH of these, or the site loses something it has today:"
  error "    listen 443 ssl"
  error "    client_max_body_size 25m"
  exit 1
fi

# Pick the config this box can actually load.
#
# nginx.conf is the reconciled production config and references certificate
# paths under /etc/letsencrypt/live/. On a box that has never run certbot those
# files do not exist, `nginx -t` fails, and this script would die before
# reaching the certbot step that would have created them — a deadlock. So a
# certificate-less box gets the http-only bootstrap config, certbot injects TLS
# into it, and a later run of this script installs the real one.
if [[ -d "/etc/letsencrypt/live/${WWW_DOMAIN}" ]]; then
  SITE_SOURCE="${SCRIPT_DIR}/nginx.conf"
  info "Certificates found for ${WWW_DOMAIN} — installing the reconciled TLS config."
else
  SITE_SOURCE="${SCRIPT_DIR}/nginx-bootstrap.conf"
  warn "No certificates for ${WWW_DOMAIN} yet — installing the HTTP-only bootstrap config."
  warn "Run this script again after certbot succeeds to install the full config."
fi

cp "$SITE_SOURCE" "$NGINX_AVAILABLE"
success "Copied $(basename "$SITE_SOURCE") -> ${NGINX_AVAILABLE}"

if [[ -L "$NGINX_ENABLED" ]]; then
  # Already a symlink. Repoint it anyway: it may aim somewhere else entirely.
  ln -sfn "$NGINX_AVAILABLE" "$NGINX_ENABLED"
  success "Already enabled: ${NGINX_ENABLED}"
else
  ln -s "$NGINX_AVAILABLE" "$NGINX_ENABLED"
  success "Enabled: ${NGINX_ENABLED}"
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

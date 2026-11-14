#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 Lightsail host for shamankathmandu.com.
# Run as root: sudo ./provision.sh   (idempotent; safe to re-run)
# Installs Docker + compose, host nginx + certbot, AWS CLI (for backups) and a
# 2 GB swapfile, and creates /opt/shaman_web. It does NOT copy .env, restore
# the database or start the stack — see README.md "Rebuild a host".
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "run as root" >&2; exit 1; }

export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -yq docker.io docker-compose-v2 nginx certbot python3-certbot-nginx
systemctl enable --now docker nginx
usermod -aG docker ubuntu
snap list aws-cli >/dev/null 2>&1 || snap install aws-cli --classic

if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
sysctl -q vm.swappiness=10 && echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf

install -d -o ubuntu -g ubuntu -m 755 /opt/shaman_web

# Nightly backup, 20:45 UTC = 02:30 NPT. Rewritten on every run (idempotent).
# backup-db.sh still has to be copied to /opt/shaman_web (README step 3).
cat > /etc/cron.d/shaman-backup <<'CRON'
45 20 * * * root /opt/shaman_web/backup-db.sh >> /var/log/shaman-backup.log 2>&1
CRON
chmod 644 /etc/cron.d/shaman-backup
echo "provisioned: $(docker --version), $(nginx -v 2>&1), swap $(swapon --show --noheadings | awk '{print $3}')"

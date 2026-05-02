#!/usr/bin/env bash
# =============================================================================
# deploy/prod/functions.sh
# Helper functions for all prod scripts.
# Source this file at the top of each script:
#   source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/functions.sh"
# =============================================================================

# -----------------------------------------------------------------------------
# Colors (only when stdout is a terminal)
# -----------------------------------------------------------------------------
if [[ -t 1 ]]; then
  COLOR_RESET="\033[0m"
  COLOR_BLUE="\033[1;34m"
  COLOR_GREEN="\033[1;32m"
  COLOR_YELLOW="\033[1;33m"
  COLOR_RED="\033[1;31m"
  COLOR_CYAN="\033[1;36m"
  COLOR_BOLD="\033[1m"
else
  COLOR_RESET="" COLOR_BLUE="" COLOR_GREEN="" COLOR_YELLOW=""
  COLOR_RED="" COLOR_CYAN="" COLOR_BOLD=""
fi

# -----------------------------------------------------------------------------
# Logging
# -----------------------------------------------------------------------------
info()    { echo -e "${COLOR_BLUE}[INFO]${COLOR_RESET}  $*"; }
success() { echo -e "${COLOR_GREEN}[OK]${COLOR_RESET}    $*"; }
warn()    { echo -e "${COLOR_YELLOW}[WARN]${COLOR_RESET}  $*"; }
error()   { echo -e "${COLOR_RED}[ERROR]${COLOR_RESET} $*" >&2; }
step()    { echo -e "\n${COLOR_BOLD}${COLOR_CYAN}==> $*${COLOR_RESET}"; }
divider() { echo -e "${COLOR_BOLD}──────────────────────────────────────────${COLOR_RESET}"; }

# -----------------------------------------------------------------------------
# require_docker
# Exits with code 2 if docker or docker compose is not installed/running.
# -----------------------------------------------------------------------------
require_docker() {
  if ! command -v docker &>/dev/null; then
    error "Docker is not installed. Install from https://docs.docker.com/get-docker/"
    exit 2
  fi
  if ! docker compose version &>/dev/null; then
    error "Docker Compose plugin not found. Install from https://docs.docker.com/compose/install/"
    exit 2
  fi
  if ! docker info &>/dev/null; then
    error "Docker daemon is not running. Start Docker and try again."
    exit 2
  fi
  success "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
}

# -----------------------------------------------------------------------------
# require_env [dir]
# Exits with code 1 if .env does not exist in the given directory (default: cwd).
# -----------------------------------------------------------------------------
require_env() {
  local dir="${1:-.}"
  if [[ ! -f "${dir}/.env" ]]; then
    error ".env file not found in ${dir}/"
    error "Run ./setup.sh first, or: cp .env.example .env"
    exit 1
  fi
}

# -----------------------------------------------------------------------------
# confirm_action [prompt]
# Prompts the user for confirmation. Exits with code 1 if not confirmed.
# -----------------------------------------------------------------------------
confirm_action() {
  local prompt="${1:-Are you sure?}"
  echo -e "${COLOR_YELLOW}${prompt}${COLOR_RESET}"
  read -r -p "Type 'yes' to confirm: " answer
  if [[ "$answer" != "yes" ]]; then
    info "Aborted."
    exit 1
  fi
}

# -----------------------------------------------------------------------------
# wait_for_health [container_name] [max_wait_seconds]
# Waits until a container's health status is 'healthy'.
# -----------------------------------------------------------------------------
wait_for_health() {
  local container="$1"
  local max_wait="${2:-60}"
  local elapsed=0
  info "Waiting for ${container} to be healthy (max ${max_wait}s)..."
  while [[ $elapsed -lt $max_wait ]]; do
    local status
    status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "not_found")
    if [[ "$status" == "healthy" ]]; then
      success "${container} is healthy"
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
    echo -n "."
  done
  echo ""
  warn "${container} did not become healthy within ${max_wait}s (current: ${status})"
  return 1
}

# -----------------------------------------------------------------------------
# require_root
# Exits if the script is not run as root (or via sudo).
# -----------------------------------------------------------------------------
require_root() {
  if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root (use sudo)."
    exit 1
  fi
}

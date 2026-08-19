#!/usr/bin/env bash
#
# ServerSpot one-command production installer
#
# Recommended:
#   curl -fsSL https://raw.githubusercontent.com/C-h-a-r/serverspot-ts/main/scripts/install.sh -o install.sh
#   sudo bash install.sh
#
# Also works (pipe):
#   curl -fsSL https://raw.githubusercontent.com/C-h-a-r/serverspot-ts/main/scripts/install.sh | sudo bash
#
set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────
readonly REPO_URL="https://github.com/C-h-a-r/serverspot-ts.git"
readonly REPO_BRANCH="main"
readonly INSTALL_DIR="/opt/serverspot"
readonly CTL_BIN="/usr/local/bin/serverspot"

# ─── Colors (enable when we have a real terminal via /dev/tty) ────────────────
if [[ -n "${TERM:-}" && "${TERM}" != "dumb" && -e /dev/tty ]]; then
  readonly RED='\033[0;31m'
  readonly GREEN='\033[0;32m'
  readonly YELLOW='\033[1;33m'
  readonly BLUE='\033[0;34m'
  readonly CYAN='\033[0;36m'
  readonly BOLD='\033[1m'
  readonly DIM='\033[2m'
  readonly NC='\033[0m'
else
  readonly RED='' GREEN='' YELLOW='' BLUE='' CYAN='' BOLD='' DIM='' NC=''
fi

STEP=0
TOTAL_STEPS=8
UPDATE_MODE=false

# ─── Terminal I/O (always use /dev/tty so prompts work when script is piped) ─
require_tty() {
  if [[ ! -e /dev/tty ]]; then
    echo "ERROR: No terminal found." >&2
    echo "Download the script first, then run it:" >&2
    echo "  curl -fsSL https://raw.githubusercontent.com/C-h-a-r/serverspot-ts/main/scripts/install.sh -o install.sh" >&2
    echo "  sudo bash install.sh" >&2
    exit 1
  fi
}

# Print a line to the user's terminal (not stdout — that may be a pipe).
tty_echo() {
  printf '%b\n' "$*" >/dev/tty
}

# Print without trailing newline (for prompts).
tty_print() {
  printf '%b' "$*" >/dev/tty
}

# ─── UI helpers ───────────────────────────────────────────────────────────────
print_banner() {
  if [[ -e /dev/tty ]]; then
    clear >/dev/tty 2>/dev/null || true
  fi
  tty_echo "${CYAN}${BOLD}"
  tty_echo ""
  tty_echo "   ███████╗███████╗██████╗ ██╗   ██╗███████╗██████╗ ███████╗██████╗  ██████╗ ████████╗"
  tty_echo "   ██╔════╝██╔════╝██╔══██╗██║   ██║██╔════╝██╔══██╗██╔════╝██╔══██╗██╔═══██╗╚══██╔══╝"
  tty_echo "   ███████╗█████╗  ██████╔╝██║   ██║█████╗  ██████╔╝█████╗  ██████╔╝██║   ██║   ██║"
  tty_echo "   ╚════██║██╔══╝  ██╔══██╗╚██╗ ██╔╝██╔══╝  ██╔══██╗██╔══╝  ██╔═══╝ ██║   ██║   ██║"
  tty_echo "   ███████║███████╗██║  ██║ ╚████╔╝ ███████╗██║  ██║███████╗██║     ╚██████╔╝   ██║"
  tty_echo "   ╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝      ╚═════╝    ╚═╝"
  tty_echo "${NC}${DIM}  Production installer — store, community, support & game integrations${NC}"
  tty_echo ""
}

step() {
  STEP=$((STEP + 1))
  tty_echo ""
  tty_echo "${BLUE}${BOLD}  [$STEP/$TOTAL_STEPS]${NC} ${BOLD}$1${NC}"
  tty_echo "${DIM}  ─────────────────────────────────────────────────────────${NC}"
}

info()  { tty_echo "  ${CYAN}›${NC} $*"; }
ok()    { tty_echo "  ${GREEN}✓${NC} $*"; }
warn()  { tty_echo "  ${YELLOW}!${NC} $*"; }
fail()  { tty_echo "  ${RED}✗${NC} $*"; exit 1; }

read_tty() {
  local var_name="$1"
  local value=""
  if ! IFS= read -r value </dev/tty; then
    fail "Could not read input. Try: curl -fsSL ... -o install.sh && sudo bash install.sh"
  fi
  printf -v "$var_name" '%s' "$value"
}

read_secret_tty() {
  local var_name="$1"
  local value=""
  if ! IFS= read -rs value </dev/tty; then
    fail "Could not read input. Try: curl -fsSL ... -o install.sh && sudo bash install.sh"
  fi
  tty_echo ""
  printf -v "$var_name" '%s' "$value"
}

ask() {
  local prompt="$1" default="${2:-}" answer=""
  if [[ -n "$default" ]]; then
    tty_print "  ${BOLD}${prompt}${NC} ${DIM}[${default}]${NC}: "
  else
    tty_print "  ${BOLD}${prompt}${NC}: "
  fi
  read_tty answer
  if [[ -z "$answer" && -n "$default" ]]; then
    answer="$default"
  fi
  printf '%s' "$answer"
}

ask_secret() {
  local prompt="$1" answer=""
  tty_print "  ${BOLD}${prompt}${NC}: "
  read_secret_tty answer
  printf '%s' "$answer"
}

confirm() {
  local prompt="$1" answer=""
  tty_print "  ${BOLD}${prompt}${NC} ${DIM}[y/N]${NC}: "
  read_tty answer
  [[ "$answer" =~ ^[Yy]$ ]]
}

generate_secret() {
  openssl rand -base64 36 | tr -d '/+=' | head -c 48
}

require_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    fail "Please run as root: sudo bash install.sh"
  fi
}

# ─── System setup ─────────────────────────────────────────────────────────────
install_docker() {
  if command -v docker >/dev/null 2>&1; then
    ok "Docker already installed"
    return
  fi
  info "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker 2>/dev/null || service docker start 2>/dev/null || true
  ok "Docker installed"
}

install_git() {
  if command -v git >/dev/null 2>&1; then
    ok "Git already installed"
    return
  fi
  info "Installing Git..."
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -qq && apt-get install -y -qq git curl openssl
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y git curl openssl
  elif command -v yum >/dev/null 2>&1; then
    yum install -y git curl openssl
  else
    fail "Could not install git — please install git, curl, and openssl manually"
  fi
  ok "Git installed"
}

clone_or_update_repo() {
  if [[ -d "$INSTALL_DIR/.git" ]]; then
    warn "Existing installation found at $INSTALL_DIR"
    if confirm "Update existing installation?"; then
      UPDATE_MODE=true
      info "Pulling latest changes..."
      git -C "$INSTALL_DIR" fetch origin "$REPO_BRANCH"
      git -C "$INSTALL_DIR" reset --hard "origin/$REPO_BRANCH"
      ok "Repository updated"
      return 0
    fi
    if ! confirm "Continue and overwrite configuration?"; then
      fail "Installation cancelled"
    fi
    rm -rf "$INSTALL_DIR"
  fi

  mkdir -p "$(dirname "$INSTALL_DIR")"
  info "Cloning ServerSpot..."
  git clone --depth 1 --branch "$REPO_BRANCH" "$REPO_URL" "$INSTALL_DIR"
  ok "Repository cloned to $INSTALL_DIR"
}

# ─── Questionnaire ────────────────────────────────────────────────────────────
run_questionnaire() {
  tty_echo ""
  tty_echo "  ${BOLD}Let's configure your instance.${NC} ${DIM}Type your answers and press Enter.${NC}"
  tty_echo ""

  DOMAIN="$(ask "Your domain (must point to this server)" "")"
  while [[ -z "$DOMAIN" ]]; do
    warn "Domain is required for HTTPS and login redirects"
    DOMAIN="$(ask "Your domain" "")"
  done

  APP_URL="https://${DOMAIN}"

  tty_echo ""
  tty_echo "  ${BOLD}Admin account${NC} ${DIM}(used to sign in at /login)${NC}"
  ADMIN_NAME="$(ask "Admin name" "Admin")"
  ADMIN_EMAIL="$(ask "Admin email" "")"
  while [[ -z "$ADMIN_EMAIL" ]]; do
    warn "Email is required"
    ADMIN_EMAIL="$(ask "Admin email" "")"
  done

  while true; do
    ADMIN_PASSWORD="$(ask_secret "Admin password (min 8 characters)")"
    if [[ ${#ADMIN_PASSWORD} -lt 8 ]]; then
      warn "Password must be at least 8 characters"
      continue
    fi
    ADMIN_PASSWORD_CONFIRM="$(ask_secret "Confirm password")"
    if [[ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]]; then
      warn "Passwords do not match — try again"
      continue
    fi
    break
  done

  tty_echo ""
  if confirm "Generate a secure database password automatically?"; then
    POSTGRES_PASSWORD="$(generate_secret)"
    ok "Database password generated"
  else
    POSTGRES_PASSWORD="$(ask_secret "PostgreSQL password")"
    while [[ ${#POSTGRES_PASSWORD} -lt 8 ]]; do
      warn "Use at least 8 characters"
      POSTGRES_PASSWORD="$(ask_secret "PostgreSQL password")"
    done
  fi

  AUTH_SECRET="$(generate_secret)"

  tty_echo ""
  tty_echo "  ${BOLD}Optional integrations${NC} ${DIM}(y/N prompts — Enter skips)${NC}"
  ENABLE_GATEWAY=false
  if confirm "Enable game gateway (Minecraft linking, port 3001)?"; then
    ENABLE_GATEWAY=true
    GAME_GATEWAY_SECRET="$(generate_secret)"
  fi

  SMTP_HOST=""
  if confirm "Configure email (SMTP) now?"; then
    SMTP_HOST="$(ask "SMTP host" "")"
    SMTP_PORT="$(ask "SMTP port" "587")"
    SMTP_USER="$(ask "SMTP username" "")"
    SMTP_PASS="$(ask_secret "SMTP password")"
    SMTP_FROM="$(ask "From address" "noreply@${DOMAIN}")"
  fi
}

write_env_file() {
  local env_file="$INSTALL_DIR/.env"
  DATABASE_URL="postgresql://serverspot:${POSTGRES_PASSWORD}@postgres:5432/serverspot"

  cat >"$env_file" <<ENV
# Generated by ServerSpot installer on $(date -u +"%Y-%m-%dT%H:%M:%SZ")
NODE_ENV=production
SKIP_ENV_VALIDATION=false

DATABASE_URL=${DATABASE_URL}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

AUTH_SECRET=${AUTH_SECRET}
AUTH_URL=${APP_URL}
NEXT_PUBLIC_APP_URL=${APP_URL}

UPLOAD_DIR=./uploads
LOG_LEVEL=info
ENV

  if [[ "$ENABLE_GATEWAY" == true ]]; then
    cat >>"$env_file" <<ENV

GAME_GATEWAY_URL=http://game-gateway:3001
GAME_GATEWAY_PORT=3001
GAME_GATEWAY_SECRET=${GAME_GATEWAY_SECRET}
ENV
  fi

  if [[ -n "$SMTP_HOST" ]]; then
    cat >>"$env_file" <<ENV

SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_USER=${SMTP_USER}
SMTP_PASS=${SMTP_PASS}
SMTP_FROM=${SMTP_FROM}
ENV
  fi

  chmod 600 "$env_file"
  ok "Environment configured"
}

write_caddyfile() {
  cat >"$INSTALL_DIR/docker/caddy/Caddyfile" <<CADDY
${DOMAIN} {
	reverse_proxy web:3000
}
CADDY
  ok "HTTPS reverse proxy configured for ${DOMAIN}"
}

install_ctl() {
  install -m 755 "$INSTALL_DIR/scripts/serverspot-ctl.sh" "$CTL_BIN"
  ok "Management command installed: serverspot"
}

compose() {
  docker compose -f "$INSTALL_DIR/docker-compose.yml" --project-directory "$INSTALL_DIR" "$@"
}

run_setup() {
  compose --profile setup run --rm --no-TTY setup "$@"
}

# ─── Main install flow ────────────────────────────────────────────────────────
main() {
  require_tty
  print_banner
  require_root

  step "Checking system requirements"
  install_git
  install_docker
  command -v openssl >/dev/null 2>&1 || fail "openssl is required"
  command -v curl >/dev/null 2>&1 || fail "curl is required"
  ok "System ready"

  step "Downloading ServerSpot"
  clone_or_update_repo

  step "Configuration"
  if [[ "$UPDATE_MODE" == true && -f "$INSTALL_DIR/.env" ]]; then
    ok "Keeping existing .env"
    if grep -q '^GAME_GATEWAY_URL=' "$INSTALL_DIR/.env"; then
      ENABLE_GATEWAY=true
    else
      ENABLE_GATEWAY=false
    fi
    # shellcheck disable=SC1091
    source "$INSTALL_DIR/.env"
    APP_URL="${AUTH_URL:-https://localhost}"
    DOMAIN="${APP_URL#https://}"
    DOMAIN="${DOMAIN#http://}"
  else
    run_questionnaire
    write_env_file
    write_caddyfile
  fi

  step "Building containers (this may take a few minutes)"
  compose build
  ok "Containers built"

  step "Starting database"
  compose up -d postgres
  info "Waiting for PostgreSQL..."
  local i=0
  until compose exec -T postgres pg_isready -U serverspot -d serverspot >/dev/null 2>&1; do
    i=$((i + 1))
    [[ $i -gt 60 ]] && fail "PostgreSQL did not become ready in time"
    sleep 2
  done
  ok "PostgreSQL is ready"

  step "Initializing database"
  run_setup migrate
  ok "Migrations applied"
  if [[ "$UPDATE_MODE" != true ]]; then
    run_setup seed
    ok "Default data seeded"
    run_setup create-admin --name "$ADMIN_NAME" --email "$ADMIN_EMAIL" --password "$ADMIN_PASSWORD"
    ok "Admin account created"
  else
    ok "Skipped seed & admin (update mode)"
  fi

  step "Starting ServerSpot"
  local profiles="--profile caddy"
  if [[ "$ENABLE_GATEWAY" == true ]]; then
    profiles="$profiles --profile gateway"
  fi
  # shellcheck disable=SC2086
  compose $profiles up -d
  ok "All services started (restart automatically on reboot)"

  step "Finishing up"
  install_ctl

  tty_echo ""
  tty_echo "${GREEN}${BOLD}"
  tty_echo "  ╔══════════════════════════════════════════════════════════════╗"
  tty_echo "  ║                    Installation complete!                    ║"
  tty_echo "  ╚══════════════════════════════════════════════════════════════╝"
  tty_echo "${NC}"
  tty_echo "  ${BOLD}Your site${NC}     ${CYAN}${APP_URL}${NC}"
  tty_echo "  ${BOLD}Admin login${NC}   ${CYAN}${APP_URL}/login${NC}"
  tty_echo "  ${BOLD}Dashboard${NC}     ${CYAN}${APP_URL}/admin${NC}"
  tty_echo ""
  if [[ "$UPDATE_MODE" != true ]]; then
    tty_echo "  ${BOLD}Admin email${NC}   ${ADMIN_EMAIL}"
    tty_echo "  ${DIM}Password      (the one you chose during setup)${NC}"
    tty_echo ""
  fi
  tty_echo "  ${BOLD}Manage your instance${NC}"
  tty_echo "  ${DIM}serverspot status${NC}   — check service health"
  tty_echo "  ${DIM}serverspot logs${NC}     — follow application logs"
  tty_echo "  ${DIM}serverspot update${NC}   — pull updates & restart"
  tty_echo "  ${DIM}serverspot restart${NC}  — restart all services"
  tty_echo ""
  tty_echo "  ${YELLOW}Make sure DNS for ${DOMAIN} points to this server's IP.${NC}"
  tty_echo "  ${DIM}HTTPS certificates are issued automatically by Caddy.${NC}"
  tty_echo ""
}

main "$@"

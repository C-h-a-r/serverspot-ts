#!/usr/bin/env bash
#
# ServerSpot one-command production installer
# Usage: curl -fsSL https://raw.githubusercontent.com/C-h-a-r/serverspot-ts/main/scripts/install.sh | sudo bash
#
set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────
readonly REPO_URL="https://github.com/C-h-a-r/serverspot-ts.git"
readonly REPO_BRANCH="main"
readonly INSTALL_DIR="/opt/serverspot"
readonly CTL_BIN="/usr/local/bin/serverspot"

# ─── Colors ───────────────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
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

# ─── UI helpers ───────────────────────────────────────────────────────────────
print_banner() {
  clear || true
  echo -e "${CYAN}${BOLD}"
  cat <<'BANNER'

   ███████╗███████╗██████╗ ██╗   ██╗███████╗██████╗ ███████╗██████╗  ██████╗ ████████╗
   ██╔════╝██╔════╝██╔══██╗██║   ██║██╔════╝██╔══██╗██╔════╝██╔══██╗██╔═══██╗╚══██╔══╝
   ███████╗█████╗  ██████╔╝██║   ██║█████╗  ██████╔╝█████╗  ██████╔╝██║   ██║   ██║
   ╚════██║██╔══╝  ██╔══██╗╚██╗ ██╔╝██╔══╝  ██╔══██╗██╔══╝  ██╔═══╝ ██║   ██║   ██║
   ███████║███████╗██║  ██║ ╚████╔╝ ███████╗██║  ██║███████╗██║     ╚██████╔╝   ██║
   ╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝      ╚═════╝    ╚═╝

BANNER
  echo -e "${NC}${DIM}  Production installer — store, community, support & game integrations${NC}"
  echo ""
}

step() {
  STEP=$((STEP + 1))
  echo ""
  echo -e "${BLUE}${BOLD}  [$STEP/$TOTAL_STEPS]${NC} ${BOLD}$1${NC}"
  echo -e "${DIM}  ─────────────────────────────────────────────────────────${NC}"
}

info()  { echo -e "  ${CYAN}›${NC} $*"; }
ok()    { echo -e "  ${GREEN}✓${NC} $*"; }
warn()  { echo -e "  ${YELLOW}!${NC} $*"; }
fail()  { echo -e "  ${RED}✗${NC} $*" >&2; exit 1; }

ask() {
  local prompt="$1" default="${2:-}" answer=""
  if [[ -n "$default" ]]; then
    echo -ne "  ${BOLD}$prompt${NC} ${DIM}[$default]${NC}: "
  else
    echo -ne "  ${BOLD}$prompt${NC}: "
  fi
  read -r answer </dev/tty
  echo "${answer:-$default}"
}

ask_secret() {
  local prompt="$1" answer=""
  echo -ne "  ${BOLD}$prompt${NC}: "
  read -rs answer </dev/tty
  echo "" >&2
  echo "$answer"
}

confirm() {
  local prompt="$1" answer=""
  echo -ne "  ${BOLD}$prompt${NC} ${DIM}[y/N]${NC}: "
  read -r answer </dev/tty
  [[ "$answer" =~ ^[Yy]$ ]]
}

spinner_wait() {
  local message="$1" cmd="$2" i=0
  local frames=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
  echo -ne "  ${CYAN}${frames[0]}${NC} $message"
  while eval "$cmd"; do
    printf "\r  ${CYAN}%s${NC} $message" "${frames[$((i % ${#frames[@]}))]}"
    i=$((i + 1))
    sleep 0.15
  done
  printf "\r"
}

generate_secret() {
  openssl rand -base64 36 | tr -d '/+=' | head -c 48
}

require_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    fail "Please run as root: curl -fsSL ... | sudo bash"
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
  echo ""
  echo -e "  ${BOLD}Let's configure your instance.${NC} ${DIM}Press Enter to accept defaults.${NC}"
  echo ""

  DOMAIN=$(ask "Your domain (must point to this server)" "")
  while [[ -z "$DOMAIN" ]]; do
    warn "Domain is required for HTTPS and login redirects"
    DOMAIN=$(ask "Your domain" "")
  done

  APP_URL="https://${DOMAIN}"

  echo ""
  echo -e "  ${BOLD}Admin account${NC} ${DIM}(used to sign in at /login)${NC}"
  ADMIN_NAME=$(ask "Admin name" "Admin")
  ADMIN_EMAIL=$(ask "Admin email" "")
  while [[ -z "$ADMIN_EMAIL" ]]; do
    warn "Email is required"
    ADMIN_EMAIL=$(ask "Admin email" "")
  done

  while true; do
    ADMIN_PASSWORD=$(ask_secret "Admin password (min 8 characters)")
    if [[ ${#ADMIN_PASSWORD} -lt 8 ]]; then
      warn "Password must be at least 8 characters"
      continue
    fi
    ADMIN_PASSWORD_CONFIRM=$(ask_secret "Confirm password")
    if [[ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]]; then
      warn "Passwords do not match — try again"
      continue
    fi
    break
  done

  echo ""
  if confirm "Generate a secure database password automatically?"; then
    POSTGRES_PASSWORD=$(generate_secret)
    ok "Database password generated"
  else
    POSTGRES_PASSWORD=$(ask_secret "PostgreSQL password")
    while [[ ${#POSTGRES_PASSWORD} -lt 8 ]]; do
      warn "Use at least 8 characters"
      POSTGRES_PASSWORD=$(ask_secret "PostgreSQL password")
    done
  fi

  AUTH_SECRET=$(generate_secret)

  echo ""
  echo -e "  ${BOLD}Optional integrations${NC} ${DIM}(press Enter to skip each)${NC}"
  ENABLE_GATEWAY=false
  if confirm "Enable game gateway (Minecraft linking, port 3001)?"; then
    ENABLE_GATEWAY=true
    GAME_GATEWAY_SECRET=$(generate_secret)
  fi

  SMTP_HOST=""
  if confirm "Configure email (SMTP) now?"; then
    SMTP_HOST=$(ask "SMTP host" "")
    SMTP_PORT=$(ask "SMTP port" "587")
    SMTP_USER=$(ask "SMTP username" "")
    SMTP_PASS=$(ask_secret "SMTP password")
    SMTP_FROM=$(ask "From address" "noreply@${DOMAIN}")
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

  echo ""
  echo -e "${GREEN}${BOLD}"
  cat <<DONE

  ╔══════════════════════════════════════════════════════════════╗
  ║                    Installation complete!                    ║
  ╚══════════════════════════════════════════════════════════════╝

DONE
  echo -e "${NC}"
  echo -e "  ${BOLD}Your site${NC}     ${CYAN}${APP_URL}${NC}"
  echo -e "  ${BOLD}Admin login${NC}   ${CYAN}${APP_URL}/login${NC}"
  echo -e "  ${BOLD}Dashboard${NC}     ${CYAN}${APP_URL}/admin${NC}"
  echo ""
  if [[ "$UPDATE_MODE" != true ]]; then
    echo -e "  ${BOLD}Admin email${NC}   ${ADMIN_EMAIL}"
    echo -e "  ${DIM}Password      (the one you chose during setup)${NC}"
    echo ""
  fi
  echo -e "  ${BOLD}Manage your instance${NC}"
  echo -e "  ${DIM}serverspot status${NC}   — check service health"
  echo -e "  ${DIM}serverspot logs${NC}     — follow application logs"
  echo -e "  ${DIM}serverspot update${NC}   — pull updates & restart"
  echo -e "  ${DIM}serverspot restart${NC}  — restart all services"
  echo ""
  echo -e "  ${YELLOW}Make sure DNS for ${DOMAIN} points to this server's IP.${NC}"
  echo -e "  ${DIM}HTTPS certificates are issued automatically by Caddy.${NC}"
  echo ""
}

main "$@"

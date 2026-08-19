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
HTTP_PORT=80
HTTPS_PORT=443
USE_CADDY=true

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

# Write answers into a variable name — never use command substitution $(ask ...)
# for prompts; subshells hide inline prompts on many terminals.
ask_into() {
  local __answer_var="$1" prompt="$2" default="${3:-}" answer=""
  tty_echo ""
  if [[ -n "$default" ]]; then
    tty_echo "  ${BOLD}${prompt}${NC}"
    tty_echo "  ${DIM}Press Enter for default: ${default}${NC}"
  else
    tty_echo "  ${BOLD}${prompt}${NC}"
  fi
  tty_print "  ${CYAN}>${NC} "
  read_tty answer
  if [[ -z "$answer" && -n "$default" ]]; then
    answer="$default"
  fi
  printf -v "$__answer_var" '%s' "$answer"
}

ask_secret_into() {
  local __answer_var="$1" prompt="$2" answer=""
  tty_echo ""
  tty_echo "  ${BOLD}${prompt}${NC}"
  tty_print "  ${CYAN}>${NC} "
  read_secret_tty answer
  printf -v "$__answer_var" '%s' "$answer"
}

confirm() {
  local prompt="$1" answer=""
  tty_echo ""
  tty_echo "  ${BOLD}${prompt}${NC}"
  tty_echo "  ${DIM}Type y for yes, anything else for no${NC}"
  tty_print "  ${CYAN}>${NC} "
  read_tty answer
  [[ "$answer" =~ ^[Yy]$ ]]
}

generate_secret() {
  openssl rand -base64 36 | tr -d '/+=' | head -c 48
}

port_in_use() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -tlnH "sport = :${port}" 2>/dev/null | grep -q .
    return
  fi
  if command -v netstat >/dev/null 2>&1; then
    netstat -tln 2>/dev/null | grep -q ":${port} "
    return
  fi
  (echo >/dev/tcp/127.0.0.1/"${port}") >/dev/null 2>&1
}

port_usage_hint() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -tlnp "sport = :${port}" 2>/dev/null | tail -n +2 | head -3
  fi
}

valid_port() {
  local port="$1"
  [[ "$port" =~ ^[0-9]+$ && "$port" -ge 1 && "$port" -le 65535 ]]
}

build_app_url() {
  local host="${DOMAIN%%:*}"
  if [[ "$USE_CADDY" == "true" && "$HTTPS_PORT" != "443" ]]; then
    APP_URL="https://${host}:${HTTPS_PORT}"
  else
    APP_URL="https://${host}"
  fi
}

pick_free_port() {
  local __var="$1" prompt="$2" default="$3" candidate=""
  while true; do
    ask_into candidate "$prompt" "$default"
    if ! valid_port "$candidate"; then
      warn "Enter a port number between 1 and 65535"
      continue
    fi
    if port_in_use "$candidate"; then
      warn "Port ${candidate} is already in use:"
      port_usage_hint "$candidate" | while read -r line; do info "$line"; done
      continue
    fi
    printf -v "$__var" '%s' "$candidate"
    return
  done
}

configure_networking() {
  tty_echo ""
  tty_echo "  ${BOLD}── Web ports ──${NC}"
  tty_echo "  ${DIM}ServerSpot uses Caddy for HTTPS on ports 80 and 443 by default.${NC}"

  local port80_busy=false port443_busy=false
  port_in_use 80 && port80_busy=true
  port_in_use 443 && port443_busy=true

  if [[ "$port80_busy" != true && "$port443_busy" != true ]]; then
    HTTP_PORT=80
    HTTPS_PORT=443
    USE_CADDY=true
    build_app_url
    ok "Ports 80 and 443 are available for Caddy"
    return
  fi

  if [[ "$port80_busy" == true ]]; then
    warn "Port 80 (HTTP) is already in use:"
    port_usage_hint 80 | while read -r line; do [[ -n "$line" ]] && info "    $line"; done
  fi
  if [[ "$port443_busy" == true ]]; then
    warn "Port 443 (HTTPS) is already in use:"
    port_usage_hint 443 | while read -r line; do [[ -n "$line" ]] && info "    $line"; done
  fi

  tty_echo ""
  tty_echo "  ${BOLD}How would you like to handle this?${NC}"
  tty_echo "    ${BOLD}1${NC}) Use alternate ports ${DIM}(8080 HTTP, 8443 HTTPS)${NC}"
  tty_echo "    ${BOLD}2${NC}) Choose custom ports"
  tty_echo "    ${BOLD}3${NC}) Skip Caddy ${DIM}(use nginx/Coolify/etc. — proxy to 127.0.0.1:3000)${NC}"
  ask_into PROXY_CHOICE "Enter choice" "1"

  case "$PROXY_CHOICE" in
    3)
      USE_CADDY=false
      HTTP_PORT=80
      HTTPS_PORT=443
      build_app_url
      ok "Caddy disabled — point your reverse proxy to 127.0.0.1:3000"
      return
      ;;
    1)
      if ! port_in_use 8080 && ! port_in_use 8443; then
        USE_CADDY=true
        HTTP_PORT=8080
        HTTPS_PORT=8443
        build_app_url
        ok "Using alternate ports 8080 (HTTP) and 8443 (HTTPS)"
        warn "Site URL: ${APP_URL} — open port ${HTTPS_PORT} in your firewall if needed"
        if port_in_use 80; then
          warn "Automatic HTTPS may fail while port 80 is taken (needed for certificate issuance)"
        fi
        return
      fi
      warn "Ports 8080/8443 are also in use — choose custom ports"
      USE_CADDY=true
      pick_free_port HTTP_PORT "HTTP port on this server (maps to Caddy :80)" "8080"
      pick_free_port HTTPS_PORT "HTTPS port on this server (maps to Caddy :443)" "8443"
      build_app_url
      ok "Using ports ${HTTP_PORT} (HTTP) and ${HTTPS_PORT} (HTTPS)"
      ok "Site URL: ${APP_URL}"
      if [[ "$HTTP_PORT" != "80" ]]; then
        warn "Automatic HTTPS may fail unless port 80 is free for certificate issuance"
      fi
      ;;
    2|*)
      USE_CADDY=true
      pick_free_port HTTP_PORT "HTTP port on this server (maps to Caddy :80)" "8080"
      pick_free_port HTTPS_PORT "HTTPS port on this server (maps to Caddy :443)" "8443"
      build_app_url
      ok "Using ports ${HTTP_PORT} (HTTP) and ${HTTPS_PORT} (HTTPS)"
      ok "Site URL: ${APP_URL}"
      if [[ "$HTTP_PORT" != "80" ]]; then
        warn "Automatic HTTPS may fail unless port 80 is free for certificate issuance"
      fi
      ;;
  esac
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
  tty_echo "  ${BOLD}Let's configure your instance.${NC}"
  tty_echo "  ${DIM}Each question is shown below — type your answer at the > line.${NC}"

  ask_into DOMAIN "Your domain (must point to this server)" ""
  while [[ -z "$DOMAIN" ]]; do
    warn "Domain is required for HTTPS and login redirects"
    ask_into DOMAIN "Your domain" ""
  done

  DOMAIN="${DOMAIN%%/*}"
  DOMAIN="${DOMAIN%%:*}"

  tty_echo ""
  tty_echo "  ${BOLD}── Admin account ──${NC} ${DIM}(used to sign in at /login)${NC}"

  ask_into ADMIN_NAME "Admin name" "Admin"
  ask_into ADMIN_EMAIL "Admin email" ""
  while [[ -z "$ADMIN_EMAIL" ]]; do
    warn "Email is required"
    ask_into ADMIN_EMAIL "Admin email" ""
  done

  while true; do
    ask_secret_into ADMIN_PASSWORD "Admin password (min 8 characters)"
    if [[ ${#ADMIN_PASSWORD} -lt 8 ]]; then
      warn "Password must be at least 8 characters"
      continue
    fi
    ask_secret_into ADMIN_PASSWORD_CONFIRM "Confirm password"
    if [[ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]]; then
      warn "Passwords do not match — try again"
      continue
    fi
    break
  done

  tty_echo ""
  tty_echo "  ${BOLD}── Database ──${NC}"
  if confirm "Generate a secure database password automatically?"; then
    POSTGRES_PASSWORD="$(generate_secret)"
    ok "Database password generated"
  else
    ask_secret_into POSTGRES_PASSWORD "PostgreSQL password (min 8 characters)"
    while [[ ${#POSTGRES_PASSWORD} -lt 8 ]]; do
      warn "Use at least 8 characters"
      ask_secret_into POSTGRES_PASSWORD "PostgreSQL password (min 8 characters)"
    done
  fi

  AUTH_SECRET="$(generate_secret)"

  tty_echo ""
  tty_echo "  ${BOLD}── Optional integrations ──${NC}"
  ENABLE_GATEWAY=false
  if confirm "Enable game gateway (Minecraft linking, port 3001)?"; then
    ENABLE_GATEWAY=true
    GAME_GATEWAY_SECRET="$(generate_secret)"
  fi

  SMTP_HOST=""
  if confirm "Configure email (SMTP) now?"; then
    ask_into SMTP_HOST "SMTP host" ""
    ask_into SMTP_PORT "SMTP port" "587"
    ask_into SMTP_USER "SMTP username" ""
    ask_secret_into SMTP_PASS "SMTP password"
    ask_into SMTP_FROM "From address" "noreply@${DOMAIN}"
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

HTTP_PORT=${HTTP_PORT}
HTTPS_PORT=${HTTPS_PORT}
USE_CADDY=${USE_CADDY}
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
  if [[ "${USE_CADDY:-true}" != "true" ]]; then
    ok "Skipped Caddy config (using external reverse proxy)"
    return
  fi
  cat >"$INSTALL_DIR/docker/caddy/Caddyfile" <<CADDY
${DOMAIN} {
	reverse_proxy web:3000
}
CADDY
  ok "HTTPS reverse proxy configured for ${DOMAIN} on ports ${HTTP_PORT}/${HTTPS_PORT}"
}

patch_env_file() {
  local env_file="$INSTALL_DIR/.env"
  [[ -f "$env_file" ]] || return
  local tmp
  tmp="$(mktemp)"
  grep -v '^AUTH_URL=' "$env_file" | grep -v '^NEXT_PUBLIC_APP_URL=' | grep -v '^HTTP_PORT=' | grep -v '^HTTPS_PORT=' | grep -v '^USE_CADDY=' >"$tmp" || true
  cat >>"$tmp" <<ENV
AUTH_URL=${APP_URL}
NEXT_PUBLIC_APP_URL=${APP_URL}
HTTP_PORT=${HTTP_PORT}
HTTPS_PORT=${HTTPS_PORT}
USE_CADDY=${USE_CADDY}
ENV
  mv "$tmp" "$env_file"
  chmod 600 "$env_file"
  ok "Updated site URL and port settings in .env"
}

get_compose_profiles() {
  local profiles=""
  if [[ "${USE_CADDY:-true}" == "true" ]]; then
    profiles="--profile caddy"
  fi
  if [[ "${ENABLE_GATEWAY:-false}" == "true" ]]; then
    profiles="$profiles --profile gateway"
  fi
  printf '%s' "$profiles"
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
    ok "Keeping existing .env (will update URL/ports if changed)"
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
    DOMAIN="${DOMAIN%%:*}"
    HTTP_PORT="${HTTP_PORT:-80}"
    HTTPS_PORT="${HTTPS_PORT:-443}"
    USE_CADDY="${USE_CADDY:-true}"
  else
    run_questionnaire
  fi

  configure_networking

  if [[ "$UPDATE_MODE" == true && -f "$INSTALL_DIR/.env" ]]; then
    patch_env_file
    write_caddyfile
  else
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
  local profiles
  profiles="$(get_compose_profiles)"
  # shellcheck disable=SC2086
  compose $profiles up -d
  ok "All services started (restart automatically on reboot)"
  if [[ "${USE_CADDY:-true}" != "true" ]]; then
    warn "Proxy web → 127.0.0.1:3000 in your existing reverse proxy (nginx/Coolify/etc.)"
  fi

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
  if [[ "${USE_CADDY:-true}" == "true" ]]; then
    tty_echo "  ${DIM}HTTPS via Caddy on ports ${HTTP_PORT}/${HTTPS_PORT}.${NC}"
  else
    tty_echo "  ${DIM}Configure your reverse proxy to forward to 127.0.0.1:3000${NC}"
  fi
  tty_echo ""
}

main "$@"

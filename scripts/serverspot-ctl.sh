#!/usr/bin/env bash
#
# ServerSpot instance management (installed to /usr/local/bin/serverspot)
#
set -euo pipefail

readonly INSTALL_DIR="/opt/serverspot"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

if [[ ! -d "$INSTALL_DIR" ]]; then
  echo "ServerSpot is not installed at $INSTALL_DIR" >&2
  exit 1
fi

load_env() {
  # shellcheck disable=SC1091
  [[ -f "$INSTALL_DIR/.env" ]] && source "$INSTALL_DIR/.env"
  USE_CADDY="${USE_CADDY:-true}"
  HTTP_PORT="${HTTP_PORT:-80}"
  HTTPS_PORT="${HTTPS_PORT:-443}"
}

compose() {
  docker compose -f "$INSTALL_DIR/docker-compose.yml" --project-directory "$INSTALL_DIR" "$@"
}

get_profiles() {
  load_env
  local profiles=""
  if [[ "$USE_CADDY" == "true" ]]; then
    profiles="--profile caddy"
  fi
  if grep -q '^GAME_GATEWAY_URL=' "$INSTALL_DIR/.env" 2>/dev/null; then
    profiles="$profiles --profile gateway"
  fi
  printf '%s' "$profiles"
}

usage() {
  cat <<HELP
${BOLD}ServerSpot${NC} — manage your instance

  ${BOLD}serverspot status${NC}    Show container status and health
  ${BOLD}serverspot logs${NC}      Follow web + worker logs
  ${BOLD}serverspot restart${NC}   Restart all services
  ${BOLD}serverspot update${NC}    Pull latest code, migrate, rebuild, restart
  ${BOLD}serverspot migrate${NC}   Run database migrations only
  ${BOLD}serverspot doctor${NC}    Check configuration and database connection

Install dir: ${INSTALL_DIR}
HELP
}

cmd_status() {
  load_env
  echo -e "${BOLD}ServerSpot status${NC}\n"
  compose ps
  echo ""
  if curl -fsS "http://127.0.0.1:3000/api/health" >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Web health check passed (127.0.0.1:3000)"
  else
    echo -e "${RED}✗${NC} Web health check failed (is the stack running?)"
  fi
  if [[ "$USE_CADDY" == "true" ]]; then
    echo -e "${DIM}Caddy ports: ${HTTP_PORT} (HTTP) / ${HTTPS_PORT} (HTTPS)${NC}"
  else
    echo -e "${DIM}Caddy disabled — proxy to 127.0.0.1:3000${NC}"
  fi
}

cmd_logs() {
  compose logs -f --tail=100 web worker
}

cmd_restart() {
  local profiles
  profiles="$(get_profiles)"
  # shellcheck disable=SC2086
  compose $profiles up -d
  echo -e "${GREEN}✓${NC} Services restarted"
}

cmd_migrate() {
  compose --profile setup run --rm --no-TTY setup migrate
  echo -e "${GREEN}✓${NC} Migrations complete"
}

cmd_doctor() {
  compose --profile setup run --rm --no-TTY setup doctor
}

cmd_update() {
  echo -e "${BOLD}Updating ServerSpot...${NC}\n"
  git -C "$INSTALL_DIR" fetch origin main
  git -C "$INSTALL_DIR" reset --hard origin/main
  compose build
  compose up -d postgres
  sleep 3
  cmd_migrate
  cmd_restart
  echo -e "\n${GREEN}✓${NC} Update complete"
}

case "${1:-}" in
  status)  cmd_status ;;
  logs)    cmd_logs ;;
  restart) cmd_restart ;;
  update)  cmd_update ;;
  migrate) cmd_migrate ;;
  doctor)  cmd_doctor ;;
  *)       usage ;;
esac

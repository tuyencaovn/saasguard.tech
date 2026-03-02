#!/bin/bash
# SaaSGuard Installer
# Usage: curl -s https://saasguard.tech/install.sh | bash
# Supports: Ubuntu 20.04+, Debian 11+, CentOS 8+
# Idempotent: safe to run multiple times

set -e

INSTALL_DIR="${HOME}/saasguard"
COMPOSE_URL="https://saasguard.tech/docker-compose.prod.yml"
DASHBOARD_PORT=3006

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo ""
echo "  ███████╗ █████╗  █████╗ ███████╗ ██████╗ ██╗   ██╗ █████╗ ██████╗ ██████╗ "
echo "  ██╔════╝██╔══██╗██╔══██╗██╔════╝██╔════╝ ██║   ██║██╔══██╗██╔══██╗██╔══██╗"
echo "  ███████╗███████║███████║███████╗██║  ███╗██║   ██║███████║██████╔╝██║  ██║"
echo "  ╚════██║██╔══██║██╔══██║╚════██║██║   ██║██║   ██║██╔══██║██╔══██╗██║  ██║"
echo "  ███████║██║  ██║██║  ██║███████║╚██████╔╝╚██████╔╝██║  ██║██║  ██║██████╔╝"
echo "  ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ "
echo ""
echo "  SaaSGuard — Server Crash Monitor for Founders"
echo ""

# ── Prerequisites ────────────────────────────────────────────────────────────

info "Checking prerequisites..."

command -v docker >/dev/null 2>&1 || error "Docker is required. Install at: https://get.docker.com"

# Accept both `docker-compose` (v1) and `docker compose` (v2)
if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
elif docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
else
  error "Docker Compose is required. Install at: https://docs.docker.com/compose/install/"
fi

command -v curl >/dev/null 2>&1 || error "curl is required. Install with: apt-get install curl"
command -v openssl >/dev/null 2>&1 || error "openssl is required. Install with: apt-get install openssl"

info "Docker: $(docker --version)"
info "Compose: $($COMPOSE_CMD version 2>/dev/null || echo 'detected')"

# ── Installation directory ───────────────────────────────────────────────────

mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"
info "Install directory: $INSTALL_DIR"

# ── Download docker-compose.yml ──────────────────────────────────────────────

info "Downloading docker-compose configuration..."
curl -fsSL "$COMPOSE_URL" -o docker-compose.yml || error "Failed to download docker-compose.yml from $COMPOSE_URL"

# ── Generate or reuse secrets ────────────────────────────────────────────────

if [ -f ".env" ]; then
  warn ".env already exists — reusing existing secrets (idempotent re-run)"
  # Load existing env to check required keys
  # shellcheck disable=SC1091
  set -a; source .env 2>/dev/null; set +a
else
  info "Generating secrets..."
  JWT_SECRET=$(openssl rand -hex 32)
  DB_PASSWORD=$(openssl rand -hex 16)
  NEED_CONFIG=true
fi

# ── Configuration prompts ────────────────────────────────────────────────────

if [ "${NEED_CONFIG:-false}" = "true" ]; then
  echo ""
  echo "─── Configuration ───────────────────────────────────────────"
  read -r -p "  Admin email: " ADMIN_EMAIL
  if [ -z "$ADMIN_EMAIL" ]; then
    error "Admin email is required"
  fi

  read -r -p "  Telegram Bot Token (optional, press Enter to skip): " TELEGRAM_TOKEN
  if [ -n "$TELEGRAM_TOKEN" ]; then
    read -r -p "  Telegram Chat ID: " TELEGRAM_CHAT_ID
  fi
  echo "─────────────────────────────────────────────────────────────"
  echo ""

  # Write .env (restricted permissions)
  cat > .env <<EOF
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
DATABASE_PASSWORD=${DB_PASSWORD}
ADMIN_EMAIL=${ADMIN_EMAIL}
TELEGRAM_BOT_TOKEN=${TELEGRAM_TOKEN}
TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}
APP_NAME=SaaSGuard
APP_SHORT_NAME=SaaSGuard
NEXT_PUBLIC_APP_NAME=SaaSGuard
NEXT_PUBLIC_API_URL=http://localhost:3005
EOF

  chmod 600 .env
  info ".env created with restricted permissions (600)"
fi

# ── Detect Docker containers and PM2 ────────────────────────────────────────

if [ -S /var/run/docker.sock ]; then
  info "Docker socket detected — container monitoring will be available"
else
  warn "Docker socket not found at /var/run/docker.sock — container monitoring limited"
fi

if command -v pm2 >/dev/null 2>&1; then
  info "PM2 detected — process monitoring will be available"
else
  warn "PM2 not found — process monitoring will be limited"
fi

# ── Start services ───────────────────────────────────────────────────────────

info "Starting SaaSGuard services..."
$COMPOSE_CMD up -d

# ── Wait for health ──────────────────────────────────────────────────────────

info "Waiting for services to be ready..."
RETRIES=30
until curl -sf "http://localhost:${DASHBOARD_PORT}/api/health" >/dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
  printf "."
  sleep 2
  RETRIES=$((RETRIES - 1))
done
echo ""

if [ $RETRIES -gt 0 ]; then
  info "Services are ready!"
else
  warn "Services may still be starting. Check with: $COMPOSE_CMD logs"
fi

# ── Summary ──────────────────────────────────────────────────────────────────

HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo ""
echo "  ✓ SaaSGuard installed successfully!"
echo ""
echo "  Dashboard: http://${HOST_IP}:${DASHBOARD_PORT}"
echo "  Admin:     ${ADMIN_EMAIL:-see .env}"
echo ""
echo "  Useful commands:"
echo "    cd ${INSTALL_DIR}"
echo "    ${COMPOSE_CMD} logs -f          # view logs"
echo "    ${COMPOSE_CMD} down             # stop services"
echo "    ${COMPOSE_CMD} pull && ${COMPOSE_CMD} up -d  # update"
echo ""
echo "  Note: docker.sock is mounted for container monitoring."
echo "  This requires your user to be in the 'docker' group."
echo ""

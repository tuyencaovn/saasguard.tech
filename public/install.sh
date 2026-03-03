#!/bin/bash
# SaaSGuard Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/tuyencaovn/saasguard.tech/master/public/install.sh | bash
# Supports: Ubuntu 20.04+, Debian 11+
# Idempotent: safe to run multiple times

set -e

INSTALL_DIR="${HOME}/saasguard"
COMPOSE_URL="https://raw.githubusercontent.com/tuyencaovn/saasguard.tech/master/public/docker-compose.prod.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
step()    { echo -e "\n${CYAN}▸ $1${NC}"; }

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

step "Checking prerequisites..."

command -v docker >/dev/null 2>&1 || error "Docker is required. Install: curl -fsSL https://get.docker.com | sh"

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  error "Docker Compose is required. Install: https://docs.docker.com/compose/install/"
fi

command -v curl >/dev/null 2>&1 || error "curl required: apt-get install curl"
command -v openssl >/dev/null 2>&1 || error "openssl required: apt-get install openssl"

info "Docker: $(docker --version | awk '{print $3}' | tr -d ',')"
info "Compose: $($COMPOSE_CMD version 2>/dev/null | head -1)"

# ── Installation directory ───────────────────────────────────────────────────

mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"
info "Install directory: $INSTALL_DIR"

# ── Download docker-compose.yml ──────────────────────────────────────────────

step "Downloading docker-compose configuration..."
curl -fsSL "$COMPOSE_URL" -o docker-compose.yml || error "Failed to download docker-compose.yml"

# ── Generate or reuse secrets ────────────────────────────────────────────────

if [ -f ".env" ]; then
  warn ".env already exists — reusing existing config (idempotent re-run)"
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

  # Admin credentials
  read -r -p "  Admin email: " ADMIN_EMAIL
  [ -z "$ADMIN_EMAIL" ] && error "Admin email is required"

  read -r -s -p "  Admin password (min 8 chars): " ADMIN_PASSWORD
  echo ""
  [ ${#ADMIN_PASSWORD} -lt 8 ] && error "Password must be at least 8 characters"

  # Domain or IP mode
  echo ""
  echo "  Access mode:"
  echo "    1) Domain (e.g. monitor.myapp.com) — with Nginx + SSL"
  echo "    2) IP only (e.g. http://123.45.67.89:3006)"
  read -r -p "  Choose [1/2, default=2]: " ACCESS_MODE
  ACCESS_MODE="${ACCESS_MODE:-2}"

  if [ "$ACCESS_MODE" = "1" ]; then
    # Domain mode
    read -r -p "  Dashboard domain (e.g. monitor.myapp.com): " DASHBOARD_DOMAIN
    [ -z "$DASHBOARD_DOMAIN" ] && error "Domain is required"

    # Auto-derive API domain: monitor.abc.com → api-monitor.abc.com
    API_DOMAIN="api-${DASHBOARD_DOMAIN}"
    info "API domain: ${API_DOMAIN} (auto-generated)"

    DEPLOY_MODE="domain"
    PROTOCOL="https"
    FRONTEND_URL="${PROTOCOL}://${DASHBOARD_DOMAIN}"
    API_URL="${PROTOCOL}://${API_DOMAIN}"
    BIND_HOST="127.0.0.1"
  else
    # IP mode
    PUBLIC_IP=$(curl -sf https://ifconfig.me 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
    read -r -p "  Server IP [${PUBLIC_IP}]: " USER_IP
    SERVER_HOST="${USER_IP:-$PUBLIC_IP}"

    DEPLOY_MODE="ip"
    FRONTEND_URL="http://${SERVER_HOST}:3006"
    API_URL="http://${SERVER_HOST}:3005"
    BIND_HOST="0.0.0.0"
  fi

  # Port configuration — auto-detect conflicts
  DEFAULT_API_PORT=3005
  DEFAULT_DASH_PORT=3006
  if command -v ss >/dev/null 2>&1; then
    while ss -tlnp 2>/dev/null | grep -q ":${DEFAULT_API_PORT} "; do DEFAULT_API_PORT=$((DEFAULT_API_PORT + 10)); done
    while ss -tlnp 2>/dev/null | grep -q ":${DEFAULT_DASH_PORT} "; do DEFAULT_DASH_PORT=$((DEFAULT_DASH_PORT + 10)); done
  fi
  read -r -p "  Backend port [${DEFAULT_API_PORT}]: " USER_API_PORT
  API_PORT="${USER_API_PORT:-$DEFAULT_API_PORT}"
  read -r -p "  Dashboard port [${DEFAULT_DASH_PORT}]: " USER_DASH_PORT
  DASH_PORT="${USER_DASH_PORT:-$DEFAULT_DASH_PORT}"

  # Update URLs with actual ports (IP mode shows ports, domain mode hides them)
  if [ "$DEPLOY_MODE" = "ip" ]; then
    FRONTEND_URL="http://${SERVER_HOST}:${DASH_PORT}"
    API_URL="http://${SERVER_HOST}:${API_PORT}"
  fi

  # Telegram (optional)
  read -r -p "  Telegram Bot Token (optional, Enter to skip): " TELEGRAM_TOKEN
  if [ -n "$TELEGRAM_TOKEN" ]; then
    read -r -p "  Telegram Chat ID: " TELEGRAM_CHAT_ID
  fi
  echo "─────────────────────────────────────────────────────────────"

  # Write .env
  cat > .env <<EOF
NODE_ENV=production
DEPLOY_MODE=${DEPLOY_MODE}
JWT_SECRET=${JWT_SECRET}
DATABASE_PASSWORD=${DB_PASSWORD}
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
TELEGRAM_BOT_TOKEN=${TELEGRAM_TOKEN}
TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}
APP_NAME=SaaSGuard
NEXT_PUBLIC_APP_NAME=SaaSGuard
NEXT_PUBLIC_API_URL=${API_URL}
NEXT_PUBLIC_WS_URL=${API_URL}
FRONTEND_URL=${FRONTEND_URL}
BIND_HOST=${BIND_HOST}
API_PORT=${API_PORT}
DASH_PORT=${DASH_PORT}
BACKEND_PORT=${API_PORT}
EOF

  chmod 600 .env
  info ".env created (permissions: 600)"
fi

# ── Detect runtime features ──────────────────────────────────────────────────

[ -S /var/run/docker.sock ] && info "Docker socket detected — container monitoring available" || warn "Docker socket not found — container monitoring limited"
command -v pm2 >/dev/null 2>&1 && info "PM2 detected — process monitoring available" || true

# ── Start services ───────────────────────────────────────────────────────────

step "Starting SaaSGuard services..."
$COMPOSE_CMD up -d

# Wait for health
info "Waiting for services to be ready..."
RETRIES=30
DASH_PORT="${DASH_PORT:-3006}"
API_PORT="${API_PORT:-3005}"
until curl -sf "http://localhost:${DASH_PORT}" >/dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
  printf "."
  sleep 2
  RETRIES=$((RETRIES - 1))
done
echo ""
[ $RETRIES -gt 0 ] && info "Services are ready!" || warn "Services may still be starting. Check: $COMPOSE_CMD logs"

# ── Nginx + SSL (domain mode only) ──────────────────────────────────────────

if [ "${DEPLOY_MODE}" = "domain" ]; then
  step "Setting up Nginx reverse proxy..."

  # Install nginx if missing
  if ! command -v nginx >/dev/null 2>&1; then
    info "Installing Nginx..."
    apt-get update -qq && apt-get install -y -qq nginx >/dev/null 2>&1 || error "Failed to install Nginx. Run as root or with sudo."
  fi

  # Generate Nginx config
  NGINX_CONF="/etc/nginx/sites-available/saasguard"
  cat > "$NGINX_CONF" <<NGINX
# SaaSGuard — auto-generated by install.sh
server {
    listen 80;
    server_name ${DASHBOARD_DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:${DASH_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}

server {
    listen 80;
    server_name ${API_DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:${API_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

  # Enable site
  ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/saasguard
  # Remove default site if it exists (conflicts on port 80)
  rm -f /etc/nginx/sites-enabled/default

  nginx -t 2>/dev/null && systemctl reload nginx
  info "Nginx configured for ${DASHBOARD_DOMAIN} + ${API_DOMAIN}"

  # SSL with Certbot
  step "Setting up SSL certificates..."
  if ! command -v certbot >/dev/null 2>&1; then
    info "Installing Certbot..."
    apt-get install -y -qq certbot python3-certbot-nginx >/dev/null 2>&1 || warn "Failed to install Certbot. Install manually: apt install certbot python3-certbot-nginx"
  fi

  if command -v certbot >/dev/null 2>&1; then
    info "Requesting SSL certificates (this may take a moment)..."
    certbot --nginx -d "${DASHBOARD_DOMAIN}" -d "${API_DOMAIN}" --non-interactive --agree-tos -m "${ADMIN_EMAIL}" --redirect 2>&1 | tail -3 || warn "Certbot failed. Ensure DNS points to this server and run: certbot --nginx -d ${DASHBOARD_DOMAIN} -d ${API_DOMAIN}"
  fi
fi

# ── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo -e "  ${GREEN}✓ SaaSGuard installed successfully!${NC}"
echo ""

if [ "${DEPLOY_MODE}" = "domain" ]; then
  echo "  Dashboard: https://${DASHBOARD_DOMAIN}"
  echo "  API:       https://${API_DOMAIN}"
else
  DISPLAY_HOST="${SERVER_HOST:-$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'localhost')}"
  echo "  Dashboard: http://${DISPLAY_HOST}:3006"
  echo "  API:       http://${DISPLAY_HOST}:3005"
fi

echo "  Admin:     ${ADMIN_EMAIL:-see .env}"
echo ""
echo "  Useful commands:"
echo "    cd ${INSTALL_DIR}"
echo "    ${COMPOSE_CMD} logs -f                              # view logs"
echo "    ${COMPOSE_CMD} down                                 # stop services"
echo "    ${COMPOSE_CMD} pull && ${COMPOSE_CMD} up -d         # update"
echo ""

if [ "${DEPLOY_MODE}" = "domain" ]; then
  echo "  DNS required: Point these records to this server's IP"
  echo "    ${DASHBOARD_DOMAIN}  → A record"
  echo "    ${API_DOMAIN}  → A record"
  echo ""
fi

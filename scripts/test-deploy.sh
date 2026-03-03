#!/bin/bash
# SaaSGuard — Test Deploy (build from source on VPS)
# Usage: SSH into VPS, clone repo, then run:
#   ./scripts/test-deploy.sh
# Builds images locally (no GHCR needed) and starts everything.

set -e
cd "$(dirname "$0")/.."
ROOT=$(pwd)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
step()  { echo -e "\n${CYAN}▸ $1${NC}"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }

echo ""
echo -e "${CYAN}  SaaSGuard — Test Deploy (build from source)${NC}"
echo ""

# ── Prerequisites ──────────────────────────────────────────────────────────
step "Checking prerequisites..."
command -v docker >/dev/null 2>&1 || error "Docker required: curl -fsSL https://get.docker.com | sh"
docker compose version >/dev/null 2>&1 || error "Docker Compose required"
info "Docker ready"

# ── Prepare deploy directory ───────────────────────────────────────────────
DEPLOY_DIR="${HOME}/saasguard"
mkdir -p "$DEPLOY_DIR"

# ── Configuration (BEFORE build — frontend needs API URL at build time) ──
if [ ! -f "$DEPLOY_DIR/.env" ]; then
  step "Configuring..."

  read -r -p "  Admin email: " ADMIN_EMAIL
  [ -z "$ADMIN_EMAIL" ] && error "Admin email required"

  read -r -s -p "  Admin password (min 8 chars): " ADMIN_PASSWORD
  echo ""
  [ ${#ADMIN_PASSWORD} -lt 8 ] && error "Password must be at least 8 characters"

  echo ""
  echo "  Access mode:"
  echo "    1) Domain (e.g. monitor.myapp.com) — Nginx + SSL"
  echo "    2) IP only"
  read -r -p "  Choose [1/2, default=2]: " ACCESS_MODE
  ACCESS_MODE="${ACCESS_MODE:-2}"

  if [ "$ACCESS_MODE" = "1" ]; then
    read -r -p "  Dashboard domain: " DASHBOARD_DOMAIN
    [ -z "$DASHBOARD_DOMAIN" ] && error "Domain required"
    FRONTEND_URL="https://${DASHBOARD_DOMAIN}"
    API_URL="https://${DASHBOARD_DOMAIN}/api"
    BIND_HOST="127.0.0.1"
    DEPLOY_MODE="domain"
  else
    PUBLIC_IP=$(curl -sf https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}' || echo "localhost")
    read -r -p "  Server IP [${PUBLIC_IP}]: " USER_IP
    SERVER_HOST="${USER_IP:-$PUBLIC_IP}"
    # Auto-detect ports
    API_PORT=3005; DASH_PORT=3006
    if command -v ss >/dev/null 2>&1; then
      while ss -tlnp 2>/dev/null | grep -q ":${API_PORT} "; do API_PORT=$((API_PORT + 10)); done
      while ss -tlnp 2>/dev/null | grep -q ":${DASH_PORT} "; do DASH_PORT=$((DASH_PORT + 10)); done
    fi
    FRONTEND_URL="http://${SERVER_HOST}:${DASH_PORT}"
    API_URL="http://${SERVER_HOST}:${API_PORT}"
    BIND_HOST="0.0.0.0"
    DEPLOY_MODE="ip"
  fi

  read -r -p "  Telegram Bot Token (optional): " TELEGRAM_TOKEN
  [ -n "$TELEGRAM_TOKEN" ] && read -r -p "  Telegram Chat ID: " TELEGRAM_CHAT_ID

  WS_URL="https://${DASHBOARD_DOMAIN}"
  [ "$DEPLOY_MODE" = "ip" ] && WS_URL="http://${SERVER_HOST}:${API_PORT:-3005}"
  cat > "$DEPLOY_DIR/.env" <<EOF
NODE_ENV=production
DEPLOY_MODE=${DEPLOY_MODE}
DASHBOARD_DOMAIN=${DASHBOARD_DOMAIN}
JWT_SECRET=$(openssl rand -hex 32)
DATABASE_PASSWORD=$(openssl rand -hex 16)
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
TELEGRAM_BOT_TOKEN=${TELEGRAM_TOKEN}
TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}
APP_NAME=SaaSGuard
NEXT_PUBLIC_APP_NAME=SaaSGuard
NEXT_PUBLIC_API_URL=${API_URL}
NEXT_PUBLIC_WS_URL=${WS_URL}
FRONTEND_URL=${FRONTEND_URL}
BIND_HOST=${BIND_HOST}
API_PORT=${API_PORT:-3005}
DASH_PORT=${DASH_PORT:-3006}
BACKEND_PORT=${API_PORT:-3005}
DOCKER_GID=$(getent group docker 2>/dev/null | cut -d: -f3 || stat -c '%g' /var/run/docker.sock 2>/dev/null || echo 999)
EOF
  chmod 600 "$DEPLOY_DIR/.env"
  info ".env created"
else
  warn ".env exists — reusing"
  set -a; source "$DEPLOY_DIR/.env" 2>/dev/null; set +a
fi

# Read API URL from .env for build args
set -a; source "$DEPLOY_DIR/.env" 2>/dev/null; set +a

# ── Build images ───────────────────────────────────────────────────────────
step "Building backend image (this may take a few minutes)..."
docker build -t saasguard-backend -f apps/backend/Dockerfile apps/backend
info "Backend image built"

step "Building frontend image..."
docker build -t saasguard-frontend \
  --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL}" \
  --build-arg NEXT_PUBLIC_WS_URL="${NEXT_PUBLIC_WS_URL}" \
  --build-arg NEXT_PUBLIC_APP_NAME="${NEXT_PUBLIC_APP_NAME:-SaaSGuard}" \
  -f apps/frontend/Dockerfile apps/frontend
info "Frontend image built"

# Copy and patch docker-compose to use local images
sed \
  -e 's|ghcr.io/tuyencaovn/saasguard.tech/backend:latest|saasguard-backend|' \
  -e 's|ghcr.io/tuyencaovn/saasguard.tech/frontend:latest|saasguard-frontend|' \
  public/docker-compose.prod.yml > "$DEPLOY_DIR/docker-compose.yml"
info "docker-compose.yml prepared"

cd "$DEPLOY_DIR"

# ── Start services ─────────────────────────────────────────────────────────
step "Starting services..."
docker compose down 2>/dev/null || true
docker compose up -d

info "Waiting for services..."
RETRIES=30
DASH_PORT="${DASH_PORT:-3006}"
until curl -sf "http://localhost:${DASH_PORT}" >/dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
  printf "."
  sleep 2
  RETRIES=$((RETRIES - 1))
done
echo ""
[ $RETRIES -gt 0 ] && info "Services ready!" || warn "Still starting — check: docker compose logs"

# ── Nginx + SSL (domain mode) ─────────────────────────────────────────────
if [ "${DEPLOY_MODE}" = "domain" ]; then
  step "Setting up Nginx + SSL..."
  command -v nginx >/dev/null 2>&1 || apt-get install -y -qq nginx >/dev/null 2>&1
  API_PORT="${API_PORT:-3005}"
  DASH_PORT="${DASH_PORT:-3006}"

  cat > /etc/nginx/sites-available/saasguard <<NGINX
server {
    listen 80;
    server_name ${DASHBOARD_DOMAIN};

    # API requests — strip /api prefix, proxy to backend
    location /api/ {
        proxy_pass http://127.0.0.1:${API_PORT}/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://127.0.0.1:${API_PORT}/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Frontend (default)
    location / {
        proxy_pass http://127.0.0.1:${DASH_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX
  ln -sf /etc/nginx/sites-available/saasguard /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default
  nginx -t 2>/dev/null && systemctl reload nginx && info "Nginx configured"

  if ! command -v certbot >/dev/null 2>&1; then
    apt-get install -y -qq certbot python3-certbot-nginx >/dev/null 2>&1
  fi
  certbot --nginx -d "${DASHBOARD_DOMAIN}" \
    --non-interactive --agree-tos -m "${ADMIN_EMAIL}" --redirect 2>&1 | tail -3 \
    || warn "Certbot failed — run manually: certbot --nginx -d ${DASHBOARD_DOMAIN}"
fi

# ── Summary ────────────────────────────────────────────────────────────────
echo ""
echo -e "  ${GREEN}✓ SaaSGuard deployed!${NC}"
echo ""
if [ "${DEPLOY_MODE}" = "domain" ]; then
  echo "  Dashboard: https://${DASHBOARD_DOMAIN}"
  echo "  API:       https://${DASHBOARD_DOMAIN}/api"
else
  echo "  Dashboard: ${FRONTEND_URL}"
  echo "  API:       ${API_URL}"
fi
echo "  Admin:     ${ADMIN_EMAIL}"
echo ""
echo "  Commands:"
echo "    cd ${DEPLOY_DIR} && docker compose logs -f"
echo "    cd ${DEPLOY_DIR} && docker compose down"
echo ""
echo "  Re-deploy after code changes:"
echo "    cd ${ROOT} && git pull && ./scripts/test-deploy.sh"
echo ""

#!/usr/bin/env bash
set -euo pipefail

# Deploy marketing site (landing page only) on a given domain
# Usage: ./scripts/deploy-marketing.sh
#   or:  ./scripts/deploy-marketing.sh yourdomain.com

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'
step()  { echo -e "\n${BLUE}▸ $1${NC}"; }
info()  { echo -e "${GREEN}✓ $1${NC}"; }
err()   { echo -e "${RED}✗ $1${NC}"; exit 1; }

DOMAIN="${1:-}"
CONTAINER_NAME="saasguard-marketing"
PORT=3007

# --- Prompt for domain if not provided ---
if [ -z "$DOMAIN" ]; then
  read -rp "Domain (e.g. saasguard.tech): " DOMAIN
fi
[ -z "$DOMAIN" ] && err "Domain is required"

echo ""
echo "  SaaSGuard — Marketing Site Deploy"
echo "  Domain: $DOMAIN"
echo "  Port:   $PORT"
echo ""

# --- Prerequisites ---
step "Checking prerequisites..."
command -v docker >/dev/null 2>&1 || err "Docker not found"
command -v nginx  >/dev/null 2>&1 || err "Nginx not found"
info "Prerequisites OK"

# --- Build ---
step "Building marketing image..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

docker build -t saasguard-marketing \
  --build-arg NEXT_PUBLIC_MARKETING=true \
  --build-arg NEXT_PUBLIC_APP_NAME=SaaSGuard \
  -f "$PROJECT_DIR/apps/frontend/Dockerfile" "$PROJECT_DIR/apps/frontend"
info "Image built"

# --- Stop old container ---
docker rm -f "$CONTAINER_NAME" 2>/dev/null || true

# --- Run ---
step "Starting container on port $PORT..."
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p "127.0.0.1:${PORT}:3006" \
  saasguard-marketing
info "Container running"

# --- Nginx ---
step "Configuring Nginx..."
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"
cat > "$NGINX_CONF" <<NGINX
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
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

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
info "Nginx configured"

# --- SSL ---
step "Setting up SSL with Certbot..."
if command -v certbot >/dev/null 2>&1; then
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email || {
    echo "  Certbot failed — you can run manually later:"
    echo "  certbot --nginx -d $DOMAIN -d www.$DOMAIN"
  }
else
  echo "  Certbot not found. Install with: apt install certbot python3-certbot-nginx"
  echo "  Then run: certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

echo ""
info "Marketing site deployed at https://$DOMAIN"
echo "  Container: $CONTAINER_NAME"
echo "  Port:      $PORT"
echo ""
echo "  Update: git pull && ./scripts/deploy-marketing.sh $DOMAIN"

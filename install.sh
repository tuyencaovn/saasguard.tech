#!/bin/bash
set -e

# Server Monitor Docker Installation Script
# Usage: ./install.sh (interactive) or curl -fsSL https://...install.sh | bash

REPO_URL="https://raw.githubusercontent.com/tuyencaovn/saasguard.tech/master"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Set by generate_secrets when the admin password is auto-created
ADMIN_PW=""
ADMIN_PW_GENERATED=false

# --force / --reset: wipe the existing deployment (containers, DB volume, .env)
# and install clean from scratch.
FORCE=false
for arg in "$@"; do
  case "$arg" in
    --force | --reset) FORCE=true ;;
  esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Helper functions
info() { echo -e "${BLUE}ℹ${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
step() { echo -e "\n${BLUE}→${NC} $1"; }

# Read a single value from .env (trimmed)
get_env_var() {
  grep "^${1}=" .env 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

# Write/replace a value in .env in place (portable for GNU + BSD sed)
set_env_var() {
  local key=$1 value=$2
  if grep -q "^${key}=" .env 2>/dev/null; then
    sed -i.bak "s|^${key}=.*|${key}=${value}|" .env && rm -f .env.bak
  else
    echo "${key}=${value}" >> .env
  fi
}

# Return 0 if TCP port is free, 1 if in use
is_port_free() {
  local port=$1
  if command -v ss &> /dev/null; then
    ! ss -ltnH "sport = :$port" 2>/dev/null | grep -q .
  elif command -v lsof &> /dev/null; then
    ! lsof -iTCP:"$port" -sTCP:LISTEN &> /dev/null
  else
    ! (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null
  fi
}

# Find the first free port at or above the given start
find_free_port() {
  local port=$1
  while ! is_port_free "$port"; do
    port=$((port + 1))
    [ "$port" -gt 65535 ] && error "No free port found above $1"
  done
  echo "$port"
}

# Prompt the user on the terminal. Reads from /dev/tty so it works under
# `curl ... | bash`. Usage: ask "Question" "default" -> echoes the answer.
ask() {
  local prompt=$1 default=$2 answer
  if [ ! -e /dev/tty ]; then
    echo "$default"
    return
  fi
  if [ -n "$default" ]; then
    read -rp "  $prompt [$default]: " answer < /dev/tty
    echo "${answer:-$default}"
  else
    read -rp "  $prompt: " answer < /dev/tty
    echo "$answer"
  fi
}

# Generate a random alphanumeric secret of the given length (default 32).
# Alphanumeric only — safe for sed replacement, env files, and URLs.
gen_secret() {
  local len=${1:-32}
  if command -v openssl &> /dev/null; then
    openssl rand -base64 64 | tr -dc 'A-Za-z0-9' | cut -c1-"$len"
  else
    LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c "$len"
  fi
}

# Check prerequisites
check_docker() {
  if ! command -v docker &> /dev/null; then
    error "Docker not found. Please install Docker first: https://docs.docker.com/get-docker/"
  fi
  success "Docker found: $(docker --version)"
}

check_docker_compose() {
  if ! docker compose version &> /dev/null; then
    error "Docker Compose v2 not found. Please upgrade: https://docs.docker.com/compose/install/"
  fi
  success "Docker Compose found: $(docker compose version --short)"
}

check_nginx_for_domain() {
  if ! command -v nginx &> /dev/null; then
    error "Nginx not found. Install with: sudo apt-get install nginx"
  fi
  if ! command -v certbot &> /dev/null; then
    error "Certbot not found. Install with: sudo apt-get install certbot python3-certbot-nginx"
  fi
  success "Nginx and Certbot found"
}

# Force reset: tear down containers + DB volume and drop the old .env so the
# install starts completely fresh. Destroys all existing data.
reset_existing() {
  step "Force reset — wiping existing deployment (containers, volumes, .env)"
  warn "This deletes the database and all existing data"

  if [ -f docker-compose.prod.yml ]; then
    docker compose -f docker-compose.prod.yml down -v 2>/dev/null \
      && success "Stopped containers and removed volumes" \
      || info "No running stack to stop"
  fi
  rm -f .env && info "Removed old .env (will be regenerated)"
}

# Download docker-compose.prod.yml if it is not already present.
# Makes the `curl ... | bash` one-liner self-contained.
fetch_compose() {
  if [ -f "docker-compose.prod.yml" ]; then
    success "docker-compose.prod.yml found"
    return
  fi

  step "Downloading docker-compose.prod.yml"
  curl -fsSL "$REPO_URL/docker-compose.prod.yml" -o docker-compose.prod.yml \
    || error "Failed to download docker-compose.prod.yml"
  success "docker-compose.prod.yml downloaded"
}

# Auto-generate secrets for any variable still at its CHANGE_ME placeholder.
# ADMIN_PASSWORD is surfaced at the end so the user can log in.
generate_secrets() {
  step "Generating secrets"
  local generated=()

  if grep -q "^DATABASE_PASSWORD=CHANGE_ME" .env; then
    set_env_var DATABASE_PASSWORD "$(gen_secret 32)"
    generated+=("DATABASE_PASSWORD")
  fi

  if grep -q "^JWT_SECRET=CHANGE_ME" .env; then
    set_env_var JWT_SECRET "$(gen_secret 48)"
    generated+=("JWT_SECRET")
  fi

  if grep -q "^ADMIN_PASSWORD=CHANGE_ME" .env; then
    ADMIN_PW=$(gen_secret 20)
    set_env_var ADMIN_PASSWORD "$ADMIN_PW"
    ADMIN_PW_GENERATED=true
    generated+=("ADMIN_PASSWORD")
  fi

  if [ ${#generated[@]} -gt 0 ]; then
    success "Auto-generated: ${generated[*]}"
  else
    info "No placeholders found — keeping existing secrets"
  fi
}

# Interactively collect the only two values the user must provide, then write
# them into .env (overwriting the placeholders from .env.example).
prompt_config() {
  step "Enter your configuration"

  local email domain url current
  current=$(get_env_var ADMIN_EMAIL)
  [ "$current" = "admin@example.com" ] && current=""
  email=$(ask "Admin email (login + SSL registration)" "$current")
  [ -z "$email" ] && error "Admin email is required"
  set_env_var ADMIN_EMAIL "$email"

  domain=$(ask "Domain or server IP (e.g. monitor.example.com)" "")
  [ -z "$domain" ] && error "Domain or IP is required"

  # IP → http:// (port auto-appended later by resolve_ports); domain → https://
  if [[ "$domain" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    url="http://${domain}"
  else
    url="https://${domain}"
  fi
  set_env_var FRONTEND_URL "$url"

  success "ADMIN_EMAIL  = $email"
  success "FRONTEND_URL = $url"
  info "Optional (SMTP, Telegram) can be edited in .env later"
}

# Load or create .env file
setup_env() {
  if [ ! -f ".env" ]; then
    step "Setting up .env file"

    # Download or copy .env.example
    if [ ! -f ".env.example" ]; then
      info "Downloading .env.example..."
      curl -fsSL "$REPO_URL/.env.example" -o .env.example || error "Failed to download .env.example"
    fi

    cp .env.example .env
    success ".env created from .env.example"
    NEW_ENV=true
  else
    success ".env file found"
    NEW_ENV=false
  fi

  # Secrets are filled automatically; the user is only prompted for the two
  # values that cannot be guessed (admin email + domain/IP).
  generate_secrets

  if [ "$NEW_ENV" = true ]; then
    prompt_config
  fi
}

# Validate required env variables
validate_env() {
  local required_vars=("DATABASE_PASSWORD" "JWT_SECRET" "ADMIN_EMAIL" "ADMIN_PASSWORD" "FRONTEND_URL")
  local missing=()

  for var in "${required_vars[@]}"; do
    if [ -z "$(grep "^${var}=" .env | cut -d= -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')" ] || grep "^${var}=CHANGE_ME" .env > /dev/null; then
      missing+=("$var")
    fi
  done

  if [ ${#missing[@]} -gt 0 ]; then
    error "Missing or unchanged required variables: ${missing[*]}"
  fi

  success "All required variables configured"
}

# Detect deployment mode from FRONTEND_URL
detect_mode() {
  FRONTEND_URL=$(grep "^FRONTEND_URL=" .env | cut -d= -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

  if [[ "$FRONTEND_URL" =~ ^https?://[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+ ]]; then
    DEPLOY_MODE="ip"
    DOMAIN=""
    info "IP mode detected: $FRONTEND_URL"
  elif [[ "$FRONTEND_URL" =~ ^https?:// ]]; then
    DEPLOY_MODE="domain"
    DOMAIN=$(echo "$FRONTEND_URL" | sed 's|^https\?://||' | sed 's|/.*||')
    info "Domain mode detected: $DOMAIN"
  else
    error "Invalid FRONTEND_URL: $FRONTEND_URL (must start with http:// or https://)"
  fi
}

# Auto-resolve valid, free host ports and persist them to .env.
# In IP mode the resolved frontend port is appended to FRONTEND_URL.
resolve_ports() {
  step "Resolving service ports"

  local api_port dash_port
  api_port=$(pick_port "$(get_env_var API_PORT)" 3005 "API_PORT")
  dash_port=$(pick_port "$(get_env_var DASH_PORT)" 3006 "DASH_PORT")

  set_env_var API_PORT "$api_port"
  set_env_var DASH_PORT "$dash_port"

  if [ "$DEPLOY_MODE" = "ip" ]; then
    local base
    base=$(echo "$FRONTEND_URL" | sed 's|:[0-9]\{1,5\}$||')   # strip any existing port
    FRONTEND_URL="${base}:${dash_port}"
    set_env_var FRONTEND_URL "$FRONTEND_URL"
    success "Frontend URL:  $FRONTEND_URL"
  fi

  success "Backend port:  $api_port"
  success "Frontend port: $dash_port"
}

# Auto-detect the host PM2 home and persist it to .env.
# PM2 names its daemon process "PM2 vX: God Daemon (<PM2_HOME>)", so the exact
# path can be read straight from `ps` — no guessing the user. Running this
# before `up -d` means the first start already has the correct mount.
detect_pm2_home() {
  step "Detecting PM2"

  local line home
  line=$(ps -eo args= 2>/dev/null | grep -m1 "God Daemon (")
  if [ -z "$line" ]; then
    info "No running PM2 daemon found — skipping (set PM2_HOME manually if needed)"
    return
  fi

  home=$(echo "$line" | sed -n 's/.*God Daemon (\([^)]*\)).*/\1/p')
  if [ -n "$home" ] && [ -d "$home" ]; then
    set_env_var PM2_HOME "$home"
    success "PM2 detected — PM2_HOME=$home"
  else
    info "PM2 daemon found but home unresolved — leaving PM2_HOME unchanged"
  fi
}

# pick_port <current> <default> <name>
# Resolves "auto"/empty to the first free port; validates explicit values and
# reassigns to the next free port if the requested one is taken.
pick_port() {
  local current=$1 default=$2 name=$3 port

  if [ -z "$current" ] || [ "$current" = "auto" ]; then
    port=$(find_free_port "$default")
    info "$name auto-assigned to $port" >&2
  elif ! [[ "$current" =~ ^[0-9]+$ ]] || [ "$current" -lt 1 ] || [ "$current" -gt 65535 ]; then
    error "$name invalid: '$current' (must be 1-65535 or 'auto')"
  elif is_port_free "$current"; then
    port=$current
  else
    port=$(find_free_port "$((current + 1))")
    warn "$name port $current in use → using $port instead" >&2
  fi

  echo "$port"
}

# Setup nginx for domain mode
setup_nginx() {
  if [ "$DEPLOY_MODE" != "domain" ]; then
    return
  fi

  step "Setting up Nginx reverse proxy for $DOMAIN"
  check_nginx_for_domain

  # Load ports from .env
  API_PORT=$(grep "^API_PORT=" .env | cut -d= -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' || echo "3005")
  DASH_PORT=$(grep "^DASH_PORT=" .env | cut -d= -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' || echo "3006")

  NGINX_CONF="/etc/nginx/sites-available/saasguard"
  NGINX_ENABLED="/etc/nginx/sites-enabled/saasguard"

  # Detect other enabled sites already serving this domain (old/manual configs).
  # Two server blocks for the same server_name make Nginx pick the wrong one.
  local conflicts
  conflicts=$(sudo grep -RlE "server_name[^;]*\b${DOMAIN}\b" /etc/nginx/sites-enabled/ 2>/dev/null | grep -v '/saasguard$' || true)
  if [ -n "$conflicts" ]; then
    warn "Other Nginx sites already serve ${DOMAIN} (will conflict):"
    echo "$conflicts" | sed 's/^/      /'
    local ans
    ans=$(ask "Disable these conflicting sites?" "y")
    if [ "$ans" = y ] || [ "$ans" = Y ]; then
      while IFS= read -r f; do
        [ -n "$f" ] && sudo rm -f "$f" && info "Disabled $f"
      done <<< "$conflicts"
    else
      warn "Left in place — they may shadow this config and cause wrong routing"
    fi
  fi

  # Write nginx config
  sudo tee "$NGINX_CONF" > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    # API endpoints
    location /api/ {
        proxy_pass http://127.0.0.1:$API_PORT/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://127.0.0.1:$API_PORT/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:$DASH_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

  success "Nginx config written to $NGINX_CONF"

  # Enable site
  sudo ln -sf "$NGINX_CONF" "$NGINX_ENABLED" || true

  # Test and reload
  if sudo nginx -t; then
    sudo systemctl reload nginx || sudo systemctl restart nginx
    success "Nginx reloaded"
  else
    error "Nginx config test failed"
  fi

  # Setup SSL with Certbot — --nginx installs the cert into nginx AND adds the
  # 443 server block; --redirect forces HTTP → HTTPS. Certbot also installs a
  # systemd timer for automatic renewal.
  step "Setting up SSL with Let's Encrypt"
  local admin_email
  admin_email=$(get_env_var ADMIN_EMAIL)

  if sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect -m "$admin_email"; then
    success "SSL certificate installed — HTTPS enabled with auto-renewal"
  else
    warn "Could not obtain SSL certificate. Site is running on HTTP for now."
    warn "Retry later with: sudo certbot --nginx -d $DOMAIN"
  fi
}

# Pull docker images
pull_images() {
  step "Pulling Docker images from GitHub Container Registry"

  if ! docker compose -f docker-compose.prod.yml pull; then
    error "Failed to pull images. Check your internet connection and Docker credentials."
  fi

  success "Images pulled successfully"
}

# Start services
start_services() {
  step "Starting Server Monitor services"

  if ! docker compose -f docker-compose.prod.yml up -d; then
    error "Failed to start services"
  fi

  success "Services started"
}

# Wait for health
wait_for_health() {
  step "Waiting for services to be ready (this may take up to 60 seconds)..."

  local max_attempts=30
  local attempt=0

  while [ $attempt -lt $max_attempts ]; do
    if curl -sf http://127.0.0.1:3005/health > /dev/null 2>&1; then
      success "Backend is healthy"
      return 0
    fi

    attempt=$((attempt + 1))
    echo -n "."
    sleep 2
  done

  warn "Backend health check timed out. Services may still be starting."
  return 0
}

# Print summary
print_summary() {
  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║  Server Monitor installation complete!   ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
  echo ""

  if [ "$DEPLOY_MODE" = "domain" ]; then
    echo -e "  📍 ${BLUE}URL:${NC}      $FRONTEND_URL"
    echo -e "  🔒 ${BLUE}SSL:${NC}      Enabled (via Let's Encrypt)"
    echo -e "  🌐 ${BLUE}Proxy:${NC}     Nginx reverse proxy"
  else
    echo -e "  📍 ${BLUE}URL:${NC}      $FRONTEND_URL"
    echo -e "  ⚠️  ${YELLOW}Note:${NC}     No SSL (HTTP only)"
    echo -e "  🌐 ${BLUE}Mode:${NC}     Direct IP access"
  fi

  echo ""
  echo -e "  ${BLUE}Admin login:${NC}"
  echo -e "    • Email:    $(get_env_var ADMIN_EMAIL)"
  if [ "$ADMIN_PW_GENERATED" = true ]; then
    echo -e "    • Password: ${YELLOW}${ADMIN_PW}${NC}"
    echo -e "    ${YELLOW}⚠ Save this password now — it is stored only in .env${NC}"
  else
    echo -e "    • Password: (as set in .env)"
  fi

  echo ""
  echo -e "  ${BLUE}Services:${NC}"
  echo "    • Backend:   http://127.0.0.1:3005/health"
  echo "    • Frontend:  http://127.0.0.1:3006"
  echo "    • Database:  PostgreSQL (internal)"
  echo ""
  echo -e "  ${BLUE}Useful commands:${NC}"
  echo "    • View logs:       docker compose -f docker-compose.prod.yml logs -f"
  echo "    • Stop services:   docker compose -f docker-compose.prod.yml down"
  echo "    • Restart:         docker compose -f docker-compose.prod.yml restart"
  echo ""
  echo -e "  📖 ${BLUE}Documentation:${NC} https://github.com/tuyencaovn/saasguard.tech"
  echo ""
}

# Main flow
main() {
  echo ""
  echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  Server Monitor Docker Installation      ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
  echo ""

  step "Checking prerequisites"
  check_docker
  check_docker_compose

  [ "$FORCE" = true ] && reset_existing

  step "Setting up configuration"
  fetch_compose
  setup_env
  validate_env

  step "Detecting deployment mode"
  detect_mode

  resolve_ports
  detect_pm2_home
  setup_nginx

  pull_images
  start_services
  wait_for_health
  print_summary
}

# Run main
main

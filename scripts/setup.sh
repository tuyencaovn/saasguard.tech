#!/bin/bash
# SaaSGuard — Local Development Setup
# Usage: ./scripts/setup.sh
# Idempotent: safe to run multiple times

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
echo -e "${CYAN}  SaaSGuard — Local Dev Setup${NC}"
echo ""

# ── Prerequisites ──────────────────────────────────────────────────────────

step "Checking prerequisites..."

command -v node >/dev/null 2>&1 || error "Node.js required (>=20). Install: https://nodejs.org"
NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
[ "$NODE_VER" -ge 20 ] || error "Node.js >=20 required (found v${NODE_VER})"
info "Node.js $(node -v)"

command -v npm >/dev/null 2>&1 || error "npm required"
info "npm $(npm -v)"

command -v docker >/dev/null 2>&1 || error "Docker required. Install: https://docs.docker.com/get-docker/"
info "Docker $(docker --version | awk '{print $3}' | tr -d ',')"

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  error "Docker Compose required"
fi
info "Compose: $($COMPOSE_CMD version 2>/dev/null | head -1)"

# ── Database ───────────────────────────────────────────────────────────────

step "Starting PostgreSQL..."

$COMPOSE_CMD up -d postgres 2>/dev/null || $COMPOSE_CMD up -d 2>/dev/null
# Wait for healthy
RETRIES=15
until docker exec saasguard_postgres pg_isready -U saasguard >/dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
  sleep 1
  RETRIES=$((RETRIES - 1))
done
[ $RETRIES -gt 0 ] && info "PostgreSQL ready on port 5435" || warn "PostgreSQL may still be starting"

# ── Environment files ──────────────────────────────────────────────────────

step "Setting up environment files..."

if [ ! -f apps/backend/.env ]; then
  cp apps/backend/.env.example apps/backend/.env
  info "Created apps/backend/.env from .env.example"
else
  warn "apps/backend/.env already exists — skipping"
fi

if [ ! -f apps/frontend/.env ]; then
  cp apps/frontend/.env.example apps/frontend/.env
  info "Created apps/frontend/.env from .env.example"
else
  warn "apps/frontend/.env already exists — skipping"
fi

# ── Dependencies ───────────────────────────────────────────────────────────

step "Installing dependencies..."

# Create .npmrc if missing
[ -f .npmrc ] || echo "legacy-peer-deps=true" > .npmrc

npm install --legacy-peer-deps 2>&1 | tail -1
info "Dependencies installed"

# ── Build backend (TypeORM needs compiled JS) ─────────────────────────────

step "Building backend..."
cd apps/backend
npm run build 2>&1 | tail -1
info "Backend built"
cd "$ROOT"

# ── Summary ────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}  ✓ Setup complete!${NC}"
echo ""
echo "  Start dev servers:"
echo "    npm run dev           # both backend + frontend"
echo "    npm run dev:backend   # backend only (port 3005)"
echo "    npm run dev:frontend  # frontend only (port 3006)"
echo ""
echo "  Default admin login:"
echo "    Email:    admin@localhost.dev"
echo "    Password: admin123456"
echo ""
echo "  Database:"
echo "    Host: localhost:5435"
echo "    DB:   saasguard_dev"
echo "    User: saasguard"
echo ""
echo "  Useful commands:"
echo "    docker compose logs postgres  # DB logs"
echo "    docker compose down           # stop DB"
echo "    npm run build                 # build all"
echo ""

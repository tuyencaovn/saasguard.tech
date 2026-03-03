#!/bin/bash
# Build and optionally push SaaSGuard Docker images
# Usage:
#   ./scripts/build-docker.sh          # build only
#   ./scripts/build-docker.sh --push   # build + push to GHCR

set -e
cd "$(dirname "$0")/.."

REGISTRY="ghcr.io/tuyencaovn/saasguard.tech"
TAG="${DOCKER_TAG:-latest}"
PUSH=false

[ "$1" = "--push" ] && PUSH=true

GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

step() { echo -e "\n${CYAN}▸ $1${NC}"; }
info() { echo -e "${GREEN}✓${NC} $1"; }

echo ""
echo -e "${CYAN}  SaaSGuard Docker Build${NC}"
echo ""

# Build backend
step "Building backend image..."
docker build \
  -t "${REGISTRY}/backend:${TAG}" \
  -f apps/backend/Dockerfile \
  apps/backend

BACKEND_SIZE=$(docker image inspect "${REGISTRY}/backend:${TAG}" --format='{{.Size}}' | awk '{printf "%.0f", $1/1024/1024}')
info "Backend: ${REGISTRY}/backend:${TAG} (${BACKEND_SIZE}MB)"

# Build frontend
step "Building frontend image..."
docker build \
  -t "${REGISTRY}/frontend:${TAG}" \
  -f apps/frontend/Dockerfile \
  apps/frontend

FRONTEND_SIZE=$(docker image inspect "${REGISTRY}/frontend:${TAG}" --format='{{.Size}}' | awk '{printf "%.0f", $1/1024/1024}')
info "Frontend: ${REGISTRY}/frontend:${TAG} (${FRONTEND_SIZE}MB)"

# Push if requested
if [ "$PUSH" = true ]; then
  step "Pushing to GHCR..."
  docker push "${REGISTRY}/backend:${TAG}"
  docker push "${REGISTRY}/frontend:${TAG}"
  info "Pushed both images to ${REGISTRY}"
fi

echo ""
echo -e "${GREEN}  ✓ Build complete!${NC}"
echo ""
echo "  Images:"
echo "    ${REGISTRY}/backend:${TAG}   (${BACKEND_SIZE}MB)"
echo "    ${REGISTRY}/frontend:${TAG}  (${FRONTEND_SIZE}MB)"
echo ""
if [ "$PUSH" = false ]; then
  echo "  To push: ./scripts/build-docker.sh --push"
  echo "  Login first: echo \$GHCR_TOKEN | docker login ghcr.io -u USERNAME --password-stdin"
  echo ""
fi

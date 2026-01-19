#!/bin/bash
# BimNext Monitor - Rebuild Script
# Usage: ./rebuild.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "  BimNext Monitor - Rebuild"
echo "=========================================="

# Step 1: Git pull
echo ""
echo "[1/4] Pulling latest changes..."
git pull

# Step 2: Build backend
echo ""
echo "[2/4] Building backend..."
cd "$SCRIPT_DIR/apps/backend"
yarn build

# Step 3: Build frontend
echo ""
echo "[3/4] Building frontend..."
cd "$SCRIPT_DIR/apps/frontend"
yarn build

# Step 4: Restart PM2 processes
echo ""
echo "[4/4] Restarting PM2 processes..."
pm2 restart bimnext-monitor-backend
pm2 restart bimnext-monitor-frontend

echo ""
echo "=========================================="
echo "  Rebuild completed!"
echo "=========================================="
pm2 status | grep bimnext-monitor

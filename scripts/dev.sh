#!/bin/bash

# BimNext Monitor - Development Script
# Starts PostgreSQL via Docker Compose and runs frontend/backend with hot reload

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "🚀 Starting BimNext Monitor Development Environment..."

# Start PostgreSQL
echo "📦 Starting PostgreSQL container..."
docker compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 3

# Check if PostgreSQL is ready
until docker compose exec -T postgres pg_isready -U monitor -d bimnext_monitor > /dev/null 2>&1; do
  echo "   PostgreSQL is starting..."
  sleep 2
done
echo "✅ PostgreSQL is ready!"

# Start backend and frontend using PM2
echo "🔄 Starting Backend & Frontend with hot reload..."
pm2 start ecosystem.config.js

echo ""
echo "========================================"
echo "✅ Development environment is running!"
echo "========================================"
echo ""
echo "📊 Services:"
echo "   • PostgreSQL: localhost:5435"
echo "   • Backend:    http://localhost:3005"
echo "   • Frontend:   http://localhost:3006"
echo ""
echo "📝 Useful commands:"
echo "   • View logs:     pnpm dev:logs"
echo "   • Stop all:      pnpm dev:stop"
echo "   • Restart all:   pnpm dev:restart"
echo "   • Stop DB:       docker compose down"
echo ""

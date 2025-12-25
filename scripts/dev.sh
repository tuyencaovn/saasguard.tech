#!/bin/bash
cd "$(dirname "$0")/.."

# Kill existing
lsof -ti:3005 | xargs kill -9 2>/dev/null
lsof -ti:3006 | xargs kill -9 2>/dev/null

# Backend (port 3005)
cd apps/backend && PORT=3005 npm run start:dev &

# Frontend (port 3006)
cd apps/frontend && PORT=3006 npm run dev &

wait

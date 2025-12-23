# Tech Stack - BimNext Server Monitor

**Project:** Server Monitoring Web Application
**Date:** 2025-12-23

## Overview

Full-stack TypeScript application for real-time server monitoring with alert notifications.

## Core Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Frontend** | Next.js | 14.x | React framework with SSR/SSG |
| **Backend** | NestJS | 10.x | Modular Node.js framework |
| **Database** | PostgreSQL | 16.x | Relational data storage |
| **Real-time** | Socket.IO | 4.x | WebSocket communication |
| **ORM** | TypeORM | 0.3.x | Database abstraction |

## Key Dependencies

### Backend (NestJS)

| Package | Purpose |
|---------|---------|
| `systeminformation` | System metrics (CPU/RAM/Disk) |
| `dockerode` | Docker container monitoring |
| `@nestjs/websockets` | WebSocket gateway |
| `socket.io` | Real-time communication |
| `@sendgrid/mail` | Email notifications |
| `telegraf` | Telegram bot integration |
| `bcrypt` | Password hashing |
| `@nestjs/jwt` | JWT authentication |
| `class-validator` | DTO validation |
| `class-transformer` | Object transformation |

### Frontend (Next.js)

| Package | Purpose |
|---------|---------|
| `socket.io-client` | WebSocket client |
| `@tanstack/react-query` | Server state management |
| `recharts` | Metrics visualization |
| `tailwindcss` | Utility-first CSS |
| `shadcn/ui` | UI components |
| `zustand` | Client state management |

## Architecture Decisions

### 1. Monorepo Structure
```
bimnext_monitor/
├── apps/
│   ├── backend/      # NestJS API
│   └── frontend/     # Next.js App
├── packages/
│   └── shared/       # Shared types/utils
└── docker-compose.yml
```

### 2. Real-time Architecture
- **Protocol:** Socket.IO (WebSocket with polling fallback)
- **Pattern:** Room-based subscriptions
- **Update frequency:** 3-5 seconds
- **Reconnection:** Auto with exponential backoff

### 3. Metrics Collection
- **Library:** systeminformation
- **Polling:** Server-side cron job (3s interval)
- **Caching:** In-memory cache for latest values
- **History:** PostgreSQL with time-series queries

### 4. Docker Monitoring
- **Library:** dockerode
- **Connection:** Unix socket `/var/run/docker.sock`
- **Events:** Real-time stream for start/stop/restart

### 5. Alert System
- **Throttling:** Redis-backed deduplication
- **Channels:** Email (SendGrid) + Telegram
- **Configuration:** Database-stored thresholds
- **History:** PostgreSQL with 90-day retention

### 6. Authentication
- **Strategy:** JWT with refresh tokens
- **Storage:** HTTP-only cookies
- **Session:** 24h access token, 7d refresh token

## Database Schema (Core)

```
Users
  - id, email, password_hash, role, created_at

AlertThresholds
  - id, metric_name, operator, value, channels, cooldown_ms, user_id

AlertHistory
  - id, threshold_id, metric_value, triggered_at, delivery_status

MetricsHistory
  - id, timestamp, cpu_percent, ram_percent, disk_percent, disk_details (JSONB)

Containers
  - id, container_id, name, image, status, last_seen
```

## Service Ports

| Service | Port | URL |
|---------|------|-----|
| PostgreSQL | 5435 | localhost:5435 |
| Backend (NestJS) | 3005 | http://localhost:3005 |
| Frontend (Next.js) | 3006 | http://localhost:3006 |

## Environment Variables

```bash
# Backend (.env.example)
PORT=3005
DATABASE_HOST=localhost
DATABASE_PORT=5435
DATABASE_USER=monitor
DATABASE_PASSWORD=M0n!t0r_D3v@2025
DATABASE_NAME=bimnext_monitor
JWT_SECRET=your-secret-key
SENDGRID_API_KEY=SG.xxx
TELEGRAM_BOT_TOKEN=xxx:xxx

# Frontend (.env.example)
PORT=3006
NEXT_PUBLIC_API_URL=http://localhost:3005
NEXT_PUBLIC_WS_URL=http://localhost:3005
```

## Development Commands

```bash
pnpm dev          # Start all (PostgreSQL + BE + FE via PM2)
pnpm dev:logs     # View PM2 logs
pnpm dev:stop     # Stop BE & FE
pnpm dev:restart  # Restart BE & FE
pnpm db:up        # Start PostgreSQL only
pnpm db:down      # Stop PostgreSQL
```

## Implemented Features

### Dashboard
- **Real-time metrics**: CPU, RAM, Disk usage with circular gauges
- **System uptime**: Server uptime display (days/hours/minutes)
- **Performance chart**: Line chart with CPU/RAM/Disk history
  - Time range filter: 15m, 1h, 6h, 24h
  - Fixed X-axis ticks (5min/15min/1.5h/6h intervals)
  - Historical data loaded from database
  - Real-time updates via WebSocket
- **Quick stats**: Free RAM, CPU cores, container count
- **Container overview**: Top 4 containers with status

### Containers Page
- **Container list**: All Docker containers with status
- **View modes**: Grid and List view toggle
- **Status filter**: All, Running, Stopped, Error
- **Search**: Filter by container name or image
- **Container uptime**: Shows how long container has been running
- **Actions**: Start, Stop, Restart buttons
- **Recent events**: Docker events (start/stop/die/create)

### Alerts Page (Planned)
- Alert rules configuration
- Alert history

## Development Requirements

- Node.js >= 20.x
- pnpm >= 9.x (package manager)
- Docker >= 24.x (for PostgreSQL container)
- PM2 (process manager for dev)

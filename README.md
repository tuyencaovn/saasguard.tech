# BimNext Server Monitor

Server monitoring web application with real-time metrics, Docker monitoring, and alert notifications.

## Features

- **Real-time Metrics**: CPU, RAM, Disk, Network usage via WebSocket
- **Docker Monitoring**: Container status, events, Start/Stop/Restart, logs
- **PM2 Monitoring**: Process management, CPU/Memory stats, Start/Stop/Restart, logs
- **Alert System**: Email (SendGrid) & Telegram notifications
- **User Authentication**: JWT-based auth with role management (Admin/Viewer)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | NestJS 11 |
| Frontend | Next.js 14 |
| Database | PostgreSQL 16 |
| Real-time | Socket.IO |

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development (PostgreSQL + Backend + Frontend)
pnpm dev

# View logs
pnpm dev:logs

# Stop services
pnpm dev:stop
```

## Service Ports

| Service | Port |
|---------|------|
| PostgreSQL | 5435 |
| Backend | 3005 |
| Frontend | 3006 |

## Project Structure

```
bimnext_monitor/
├── apps/
│   ├── backend/      # NestJS API
│   └── frontend/     # Next.js Dashboard
├── scripts/
│   └── dev.sh        # Dev startup script
├── docs/             # Documentation
├── plans/            # Implementation plans
└── docker-compose.yml
```

## Documentation

- [Tech Stack](./docs/tech-stack.md)
- [Design Guidelines](./docs/design-guidelines.md)
- [Implementation Plan](./plans/251223-1942-server-monitor/plan.md)

## Wireframes

- [V2 Dashboard](./docs/wireframes/v2/dashboard.html)
- [V2 Containers](./docs/wireframes/v2/containers.html)
- [V2 Alerts](./docs/wireframes/v2/alerts.html)

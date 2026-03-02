# SaaSGuard — Silent Crash Monitor for Small SaaS

Monitor your VPS for crash loops, disk filling, and SSL expiry. Get alerted before your users notice. Built for small SaaS founders.

## Features

- **Crash-Loop Detection**: Detects when your app restarts repeatedly and alerts you immediately
- **Disk Risk Monitoring**: Predicts disk full events before they happen (warns at 80%, alerts at 90%)
- **SSL Expiry Monitor**: Tracks all SSL certificates and warns 30, 14, and 7 days before expiry
- **Health Score**: A single 0–100 score combining CPU, RAM, disk, and service health
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
npm install

# Start development (PostgreSQL + Backend + Frontend)
npm run dev

# View logs
npm run dev:logs

# Stop services
npm run dev:stop
```

## Service Ports

| Service | Port |
|---------|------|
| PostgreSQL | 5435 |
| Backend | 3005 |
| Frontend | 3006 |

## Project Structure

```
saasguard/
├── apps/
│   ├── backend/      # NestJS API
│   └── frontend/     # Next.js Dashboard + Landing
├── scripts/
│   └── dev.sh        # Dev startup script
├── docs/             # Documentation
├── plans/            # Implementation plans
└── docker-compose.yml
```

## Documentation

- [Deployment Guide](./docs/deployment-guide.md)
- [Design Guidelines](./docs/design-guidelines.md)
- [Code Standards](./docs/code-standards.md)

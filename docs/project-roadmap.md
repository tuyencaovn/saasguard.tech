# Project Roadmap

**Updated:** 2026-03-03

---

## Phase 1: Core Infrastructure — COMPLETE

- Real-time system metrics (CPU, RAM, Disk, Network)
- WebSocket-based live dashboard
- JWT authentication + RBAC (Admin / Viewer)
- PostgreSQL schema (users, metrics history, alert thresholds, alert logs)

## Phase 2: Alerting & Notifications — COMPLETE

- Threshold-based alerts (CPU, RAM, Disk)
- Multi-channel delivery (Email via SendGrid/SMTP, Telegram)
- Cooldown management to prevent alert spam
- Alert history with pagination

## Phase 3: Container & Process Monitoring — COMPLETE

- Docker container monitoring (list, start, stop, restart, logs)
- PM2 process monitoring (list, start, stop, restart, logs)
- Real-time event streaming for container state changes

## Phase 4: Deployment Pipeline — COMPLETE

| Milestone | Status |
|-----------|--------|
| Docker Compose deployment | COMPLETE |
| Production install script (`public/install.sh`) | COMPLETE |
| Source-build deploy script (`scripts/test-deploy.sh`) | COMPLETE |
| Single-domain Nginx path-based routing | COMPLETE |
| Certbot SSL (domain mode) | COMPLETE |
| IP mode (no domain, direct port access) | COMPLETE |
| Backend `root` user + host PID for metrics access | COMPLETE |
| PM2 monitoring via mounted `/root/.pm2` socket | COMPLETE |
| `NEXT_PUBLIC_*` vars baked as Docker build args | COMPLETE |
| `/health` public endpoint for Docker healthchecks | COMPLETE |
| VPS test deployment (monitor.saasguard.tech) | COMPLETE |

## Phase 5: User Management — COMPLETE

- User invitation flow (email → set password → login)
- Role management (Admin / Viewer)
- Password reset via email

## Phase 6: In Progress / Planned

| Feature | Status |
|---------|--------|
| SSL certificate management UI | In Progress |
| Multi-server monitoring | Planned |
| Prometheus metrics export | Planned |
| Redis session/cache layer | Planned |
| Audit log | Planned |
| Dark mode | Planned |

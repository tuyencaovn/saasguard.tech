# Deployment Guide

## Quick Start (Docker — Recommended)

One command to install SaaSGuard on any Ubuntu/Debian VPS:

```bash
curl -fsSL https://raw.githubusercontent.com/saasguard/saasguard/master/public/install.sh | bash
```

This will:
- Check prerequisites (Docker, Docker Compose)
- Prompt for deployment mode (IP or domain), admin credentials, and optional Telegram config
- Auto-detect server IP and Docker GID
- Build and start PostgreSQL + Backend + Frontend containers
- Configure Nginx with path-based routing (domain mode) or direct port access (IP mode)
- Obtain SSL certificate via Certbot (domain mode)

### Deployment Modes

| Mode | Access | Nginx Routing | SSL |
|------|--------|--------------|-----|
| IP mode | `http://IP:3006` (frontend), `http://IP:3005` (API) | None | No |
| Domain mode | `https://monitor.yourdomain.com` (all traffic) | Path-based (single domain) | Yes (Certbot) |

### Domain Mode — Single-Domain Routing

All traffic uses one domain with Nginx path-based routing (no separate API subdomain):

```
https://monitor.yourdomain.com/api/*     → backend (prefix stripped)
https://monitor.yourdomain.com/socket.io/* → WebSocket backend
https://monitor.yourdomain.com/*         → frontend
```

### Requirements

- Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- Docker & Docker Compose
- 1GB RAM minimum, 2GB recommended
- Domain mode: ports 80/443 open; IP mode: ports 3005 and 3006 open

### Routing

Root `/` always redirects to `/dashboard` (authenticated) or `/login` (guest). The landing page is served separately on `saasguard.tech`.

### Post-Install

- Open the dashboard and login with your admin credentials
- Configure alerts in Settings → Alerts
- Add SSL domains in SSL Certificates
- Optional: Set up Telegram notifications

### Useful Commands

```bash
cd ~/saasguard

# View logs
docker compose logs -f

# Stop
docker compose down

# Update
git pull && bash scripts/test-deploy.sh   # source build
# or
docker compose pull && docker compose up -d  # image-based
```

---

## Install Scripts

| Script | Purpose |
|--------|---------|
| `public/install.sh` | Production one-liner install |
| `scripts/test-deploy.sh` | Source-build deploy (dev/staging) |

Both scripts collect all configuration **before** the Docker build, because `NEXT_PUBLIC_*` frontend vars are baked into the image at build time.

---

## Manual Deployment (PM2)

### Prerequisites

- Node.js >= 20.x (use NVM)
- PM2 (`npm install -g pm2`)
- Docker & Docker Compose (for PostgreSQL)

### 1. Install Node 20

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20 && nvm alias default 20
```

### 2. Clone & Install

```bash
git clone <repo-url> saasguard
cd saasguard
echo "legacy-peer-deps=true" > .npmrc
npm install
```

### 3. Setup Database

```bash
docker compose up -d postgres
```

### 4. Configure Environment

**Backend** (`apps/backend/.env`):
```env
PORT=3005
NODE_ENV=production
APP_NAME=SaaSGuard
APP_SHORT_NAME=SaaSGuard
DATABASE_HOST=localhost
DATABASE_PORT=5435
DATABASE_USER=monitor
DATABASE_PASSWORD=your-secure-password
DATABASE_NAME=saasguard
JWT_SECRET=your-super-secure-random-string-min-32-chars
JWT_EXPIRES_IN=24h
FRONTEND_URL=https://monitor.yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
# Optional
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

**Frontend** (`apps/frontend/.env`):

Domain mode (single domain, path-based routing):
```env
PORT=3006
NEXT_PUBLIC_APP_NAME=SaaSGuard
NEXT_PUBLIC_APP_SHORT_NAME=SaaSGuard
NEXT_PUBLIC_API_URL=https://monitor.yourdomain.com/api
NEXT_PUBLIC_WS_URL=https://monitor.yourdomain.com
```

IP mode:
```env
PORT=3006
NEXT_PUBLIC_APP_NAME=SaaSGuard
NEXT_PUBLIC_APP_SHORT_NAME=SaaSGuard
NEXT_PUBLIC_API_URL=http://YOUR_IP:3005
NEXT_PUBLIC_WS_URL=http://YOUR_IP:3005
```

> **Note:** `NEXT_PUBLIC_*` vars are baked into the Next.js build. In Docker deployments they are passed as build args, not runtime env vars.

### 5. Build & Seed

```bash
npm run build
cd apps/backend && npm run seed:admin
```

### 6. Start with PM2

```bash
npm install -g pm2
pm2 start ecosystem.config.prod.js
pm2 save && pm2 startup
```

### PM2 Commands

| Command | Description |
|---------|-------------|
| `pm2 status` | View status |
| `pm2 logs` | View all logs |
| `pm2 logs saasguard-backend` | Backend logs |
| `pm2 logs saasguard-frontend` | Frontend logs |
| `pm2 reload all` | Zero-downtime reload |
| `pm2 restart all` | Restart all |

### Update (PM2)

```bash
cd saasguard
git pull
npm install --legacy-peer-deps
npm run build
pm2 reload all
```

### Troubleshooting

```bash
# Check logs
pm2 logs saasguard-backend --lines 100

# Database connection
docker exec saasguard_postgres psql -U monitor -d saasguard -c "SELECT 1"

# Restart
pm2 delete all && pm2 start ecosystem.config.prod.js
```

---

## Reverse Proxy (Nginx)

### Domain Mode — Single Domain (Recommended)

All frontend, API, and WebSocket traffic on one domain using path-based routing:

```nginx
server {
    listen 80;
    server_name monitor.yourdomain.com;

    # API — strip /api prefix before proxying to backend
    location /api/ {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend — catch-all
    location / {
        proxy_pass http://localhost:3006;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/monitor /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## SSL with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
# Domain mode — single domain only
sudo certbot --nginx -d monitor.yourdomain.com
```

---

## Docker Container Details

### Backend Container

The backend container runs as `root` to access:
- Docker socket (`/var/run/docker.sock`) for container monitoring
- PM2 daemon socket (`/root/.pm2` mounted from host) for process monitoring
- Host filesystem (`/:/hostfs:ro`) for accurate disk metrics
- Host PID namespace (`pid: host`) for process visibility

```yaml
# docker-compose.yml (backend service excerpt)
backend:
  user: root
  pid: host
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
    - /root/.pm2:/root/.pm2
    - /:/hostfs:ro
```

### Frontend Container

`NEXT_PUBLIC_*` environment variables are passed as Docker build args — they are baked into the Next.js static bundle at build time, not injected at runtime:

```yaml
frontend:
  build:
    args:
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
      - NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
      - NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
      - NEXT_PUBLIC_APP_SHORT_NAME=${NEXT_PUBLIC_APP_SHORT_NAME}
```

### Health Check

The backend exposes `/health` as a public endpoint (no JWT required) for Docker healthchecks:

```
GET /health → 200 OK  (no auth needed)
```

---

## Database

TypeORM `synchronize: true` is always enabled. SaaSGuard is a self-hosted product; schema is auto-managed — no manual migrations required.

---

## Environment Variables Reference

### Backend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3005 | Backend port |
| `NODE_ENV` | No | development | Environment |
| `APP_NAME` | No | SaaSGuard | Full app name (emails, UI) |
| `APP_SHORT_NAME` | No | SaaSGuard | Short brand name (sidebar, logo) |
| `DATABASE_HOST` | Yes | - | PostgreSQL host |
| `DATABASE_PORT` | Yes | - | PostgreSQL port |
| `DATABASE_USER` | Yes | - | PostgreSQL user |
| `DATABASE_PASSWORD` | Yes | - | PostgreSQL password |
| `DATABASE_NAME` | Yes | - | Database name |
| `JWT_SECRET` | Yes | - | JWT signing secret (min 32 chars) |
| `JWT_EXPIRES_IN` | No | 24h | JWT expiration |
| `FRONTEND_URL` | Yes | - | Frontend URL for emails |
| `ADMIN_EMAIL` | No | - | Fallback alert email |

### Frontend (.env / build args)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Frontend port (default 3006) |
| `NEXT_PUBLIC_APP_NAME` | No | Full app name (title, UI) |
| `NEXT_PUBLIC_APP_SHORT_NAME` | No | Short brand name (sidebar) |
| `NEXT_PUBLIC_API_URL` | Yes | Domain mode: `https://domain.com/api` · IP mode: `http://IP:3005` |
| `NEXT_PUBLIC_WS_URL` | Yes | Domain mode: `https://domain.com` · IP mode: `http://IP:3005` |

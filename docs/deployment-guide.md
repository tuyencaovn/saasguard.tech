# Deployment Guide

## Quick Start (Docker — Recommended)

One command to install SaaSGuard on any Ubuntu/Debian VPS:

```bash
curl -fsSL https://raw.githubusercontent.com/saasguard/saasguard/master/public/install.sh | bash
```

This will:
- Check prerequisites (Docker, Docker Compose)
- Prompt for admin email, password, and optional Telegram config
- Auto-detect your server IP
- Start PostgreSQL + Backend + Frontend containers
- Dashboard available at http://YOUR_IP:3006

### Requirements

- Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- Docker & Docker Compose
- 1GB RAM minimum, 2GB recommended
- Ports 3005 (API) and 3006 (Dashboard)

### Post-Install

- Open http://YOUR_IP:3006 and login with your admin email/password
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
docker compose pull && docker compose up -d
```

---

## Manual Deployment (PM2)

### Prerequisites

- Node.js >= 20.x (use NVM if needed)
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
```env
PORT=3006
NEXT_PUBLIC_APP_NAME=SaaSGuard
NEXT_PUBLIC_APP_SHORT_NAME=SaaSGuard
NEXT_PUBLIC_API_URL=https://api.monitor.yourdomain.com
NEXT_PUBLIC_WS_URL=https://api.monitor.yourdomain.com
```

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

```nginx
# Backend API
server {
    listen 80;
    server_name api.monitor.yourdomain.com;
    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
server {
    listen 80;
    server_name monitor.yourdomain.com;
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
sudo certbot --nginx -d monitor.yourdomain.com -d api.monitor.yourdomain.com
```

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

### Frontend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3006 | Frontend port |
| `NEXT_PUBLIC_APP_NAME` | No | SaaSGuard | Full app name (title, UI) |
| `NEXT_PUBLIC_APP_SHORT_NAME` | No | SaaSGuard | Short brand name (sidebar) |
| `NEXT_PUBLIC_API_URL` | Yes | - | Backend API URL |
| `NEXT_PUBLIC_WS_URL` | Yes | - | WebSocket URL (same as API) |

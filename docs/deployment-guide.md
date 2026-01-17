# Deployment Guide

Quick deployment guide for BimNext Server Monitor on host machine using PM2.

## Prerequisites

- Node.js >= 20.x (use NVM if needed)
- PM2 (`npm install -g pm2`)
- Docker & Docker Compose (for PostgreSQL)

## Install Node 20 (if needed)

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc

# Install Node 20
nvm install 20
nvm alias default 20

# Verify
node --version
```

## Quick Deploy

### 1. Clone & Install

```bash
git clone <repo-url> bimnext_monitor
cd bimnext_monitor

# Create .npmrc to handle peer deps
echo "legacy-peer-deps=true" > .npmrc

# Install dependencies
npm install
```

### 2. Setup Database

```bash
docker compose up -d postgres
```

Hoặc nếu có PostgreSQL sẵn, skip bước này và cấu hình connection trong `.env`.

### 3. Configure Environment

**Backend** (`apps/backend/.env`):
```env
# Server
PORT=3005
NODE_ENV=production

# Branding (optional - customize app name)
APP_NAME=BimNext Monitor
APP_SHORT_NAME=BimNext

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5435
DATABASE_USER=monitor
DATABASE_PASSWORD=your-secure-password
DATABASE_NAME=bimnext_monitor

# JWT (THAY ĐỔI!)
JWT_SECRET=your-super-secure-random-string-min-32-chars
JWT_EXPIRES_IN=24h

# Frontend URL (cho email links)
FRONTEND_URL=https://monitor.yourdomain.com

# SMTP (optional - cấu hình qua UI)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# Telegram (optional - cấu hình qua UI)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Admin email fallback
ADMIN_EMAIL=admin@yourdomain.com
```

**Frontend** (`apps/frontend/.env`):
```env
PORT=3006

# Branding (optional - customize app name)
NEXT_PUBLIC_APP_NAME=BimNext Monitor
NEXT_PUBLIC_APP_SHORT_NAME=BimNext

# API URLs
NEXT_PUBLIC_API_URL=https://api.monitor.yourdomain.com
NEXT_PUBLIC_WS_URL=https://api.monitor.yourdomain.com
```

### 4. Build

```bash
# Build all apps
npm run build

# Nếu lỗi, build từng app:
cd apps/backend && npm install --legacy-peer-deps && npm run build
cd ../frontend && npm install --legacy-peer-deps && npm run build
```

### 5. Create Admin User

```bash
cd apps/backend
npm run seed:admin
```

Nhập email và password cho admin account.

### 6. Start with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start production
pm2 start ecosystem.config.prod.js

# Save PM2 config
pm2 save

# Auto-start on reboot
pm2 startup
```

### 7. Verify

```bash
pm2 status
pm2 logs
```

## Reverse Proxy (Nginx)

```nginx
# /etc/nginx/sites-available/monitor

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

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/monitor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL với Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d monitor.yourdomain.com -d api.monitor.yourdomain.com
```

## PM2 Commands

| Command | Description |
|---------|-------------|
| `pm2 status` | Xem trạng thái |
| `pm2 logs` | Xem logs |
| `pm2 logs bimnext-backend` | Logs backend |
| `pm2 restart all` | Restart tất cả |
| `pm2 reload all` | Zero-downtime reload |
| `pm2 stop all` | Dừng tất cả |
| `pm2 delete all` | Xóa processes |

## Update App

```bash
cd bimnext_monitor
git pull
npm install --legacy-peer-deps
npm run build
pm2 reload all
```

## Troubleshooting

### Check logs
```bash
pm2 logs bimnext-backend --lines 100
pm2 logs bimnext-frontend --lines 100
```

### Database connection
```bash
docker exec bimnext_postgres psql -U monitor -d bimnext_monitor -c "SELECT 1"
```

### Restart từ đầu
```bash
pm2 delete all
pm2 start ecosystem.config.prod.js
```

### npm install lỗi peer deps
```bash
npm install --legacy-peer-deps
```

## Environment Variables Reference

### Backend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3005 | Backend port |
| `NODE_ENV` | No | development | Environment |
| `APP_NAME` | No | BimNext Monitor | Full app name (emails, UI) |
| `APP_SHORT_NAME` | No | BimNext | Short brand name (sidebar, logo) |
| `DATABASE_HOST` | Yes | - | PostgreSQL host |
| `DATABASE_PORT` | Yes | - | PostgreSQL port |
| `DATABASE_USER` | Yes | - | PostgreSQL user |
| `DATABASE_PASSWORD` | Yes | - | PostgreSQL password |
| `DATABASE_NAME` | Yes | - | Database name |
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `JWT_EXPIRES_IN` | No | 24h | JWT expiration |
| `FRONTEND_URL` | Yes | - | Frontend URL for emails |
| `ADMIN_EMAIL` | No | - | Fallback alert email |

### Frontend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3006 | Frontend port |
| `NEXT_PUBLIC_APP_NAME` | No | BimNext Monitor | Full app name (title, UI) |
| `NEXT_PUBLIC_APP_SHORT_NAME` | No | BimNext | Short brand name (sidebar) |
| `NEXT_PUBLIC_API_URL` | Yes | - | Backend API URL |
| `NEXT_PUBLIC_WS_URL` | Yes | - | WebSocket URL (same as API) |

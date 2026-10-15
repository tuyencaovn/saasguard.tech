# SaaSGuard Docker Deployment — Quick Start

## 🚀 Deploy in 2 Steps

### Step 1: Download & Configure
```bash
# Option A: One-liner installation
curl -fsSL https://raw.githubusercontent.com/tuyencaovn/saasguard.tech/master/install.sh | bash

# Option B: Manual (download files first)
mkdir -p ~/server-monitor && cd ~/server-monitor
wget https://raw.githubusercontent.com/tuyencaovn/saasguard.tech/master/docker-compose.prod.yml
wget https://raw.githubusercontent.com/tuyencaovn/saasguard.tech/master/.env.example
cp .env.example .env
nano .env  # Fill in your values
```

### Step 2: Run Installer
```bash
# If already downloaded files, run:
wget https://raw.githubusercontent.com/tuyencaovn/saasguard.tech/master/install.sh && bash install.sh

# If used one-liner, just wait for script to complete
```

**That's it!** The installer will:
- ✅ Check Docker & Docker Compose
- ✅ Validate your .env configuration
- ✅ Setup Nginx + SSL (if domain mode)
- ✅ Pull images from GitHub
- ✅ Start all services (backend + frontend + database)
- ✅ Show your access URL

---

## 🎯 What You Need

### Minimum
- Docker (v20+)
- Docker Compose v2
- Linux server (Ubuntu, Debian, CentOS)

### For Domain Mode (Recommended)
- Domain name pointed to your server
- Nginx installed: `sudo apt-get install nginx certbot python3-certbot-nginx`

### For IP Mode
- Direct server IP access

---

## ⚙️ Configuration (.env file)

**You only set two fields:**
```env
ADMIN_EMAIL=you@example.com
FRONTEND_URL=https://monitor.example.com  # or http://1.2.3.4:3006
```

**Auto-handled by `install.sh`** (leave at their defaults):
```env
DATABASE_PASSWORD=CHANGE_ME_RANDOM_PASSWORD   # auto-generated
JWT_SECRET=CHANGE_ME_64_CHARS_RANDOM_STRING   # auto-generated
ADMIN_PASSWORD=CHANGE_ME_STRONG_PASSWORD      # auto-generated, printed after install
API_PORT=auto                                 # first free port
DASH_PORT=auto                                # first free port
```

**Optional (email alerts):**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASSWORD=app-specific-password
SMTP_FROM=alerts@company.com
```

**Optional (Telegram alerts):**
```env
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_CHAT_ID=-1234567890
```

See `.env.example` for all options.

---

## 📍 Deployment Modes

### Domain Mode (Recommended)
```env
FRONTEND_URL=https://monitor.yourdomain.com
BIND_HOST=127.0.0.1
```
✅ **Pros:**
- Single domain, clean URL
- SSL via Let's Encrypt (auto-renewed)
- Professional appearance
- Nginx handles all routing

❌ **Cons:**
- Requires domain + Nginx setup

---

### IP Mode
```env
FRONTEND_URL=http://192.168.1.100:3006
BIND_HOST=0.0.0.0
```
✅ **Pros:**
- No domain needed
- Simple setup
- Works on internal networks

❌ **Cons:**
- HTTP only (no SSL)
- Ports visible to users

---

## 🛠️ Common Commands

After installation, use these commands on your server:

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Stop services
docker compose -f docker-compose.prod.yml down

# Restart
docker compose -f docker-compose.prod.yml restart

# Check status
docker compose -f docker-compose.prod.yml ps

# Update to latest images
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

Or use npm scripts (if you cloned the repo):
```bash
npm run docker:logs
npm run docker:down
npm run docker:restart
npm run docker:up
```

---

## ✅ Verify Installation

After installer completes:

```bash
# Check backend health
curl http://localhost:3005/health

# Check frontend
curl http://localhost:3006/login

# Via Nginx (domain mode)
curl https://monitor.yourdomain.com/login
```

Visit your `FRONTEND_URL` in browser → Login with admin email/password.

---

## 🔄 CI/CD Integration

GitHub Actions automatically:
1. Builds backend & frontend images on every push to `master` → `:latest` + `:sha-<commit>`
2. On a `vX.Y.Z` git tag, also publishes semver tags → `:1.0.0`, `:1.0`, `:1`, `:latest`

```bash
# Cut a release
git tag v1.0.0
git push origin v1.0.0
```

Your `install.sh` pulls `:latest` by default. To pin a stable version, edit the
`image:` tags in `docker-compose.prod.yml` (see docker-deployment.md → Pinning a Specific Version).

---

## 📚 Full Documentation

See `docs/docker-deployment.md` for:
- Step-by-step manual setup
- Nginx configuration
- SSL setup
- Database backups
- Troubleshooting
- Security recommendations

---

## 🚨 Troubleshooting

### "Docker not found"
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### "Nginx 502 Bad Gateway"
- Wait 30 seconds for services to start
- Check: `docker compose -f docker-compose.prod.yml logs backend`
- Verify `BIND_HOST=127.0.0.1` in `.env`

### "Port already in use"
Edit `.env`:
```env
API_PORT=3007
DASH_PORT=3008
```
Then update Nginx config accordingly.

### "Can't connect to database"
```bash
# Check database health
docker compose -f docker-compose.prod.yml exec db pg_isready -U server-monitor
```

---

## 📞 Support

- 📖 [Full Documentation](./docker-deployment.md)
- 🐛 [GitHub Issues](https://github.com/tuyencaovn/saasguard.tech/issues)
- 💬 [Discussions](https://github.com/tuyencaovn/saasguard.tech/discussions)

---

## 🎓 What Happens During Installation

```
install.sh runs:

1. Checks docker & docker compose v2
2. Checks if .env exists → if not, copies .env.example & opens editor
3. Auto-generates secrets + validates ADMIN_EMAIL & FRONTEND_URL are set
4. Reads FRONTEND_URL → detects domain vs IP mode

5. IF DOMAIN MODE:
   ├─ Checks nginx & certbot
   ├─ Generates /etc/nginx/sites-available/saasguard
   │  └─ Routes /api/* → backend, /socket.io/* → backend, /* → frontend
   ├─ Tests nginx config → reloads nginx
   └─ Runs certbot for SSL certificate

6. Pulls images from GHCR:
   ├─ ghcr.io/tuyencaovn/saasguard.tech/backend:latest
   ├─ ghcr.io/tuyencaovn/saasguard.tech/frontend:latest
   └─ postgres:16-alpine

7. Starts all services with docker compose up -d
   ├─ Database starts first
   ├─ Backend starts (depends on database)
   └─ Frontend starts (depends on backend)

8. Polls health endpoint until healthy

9. Prints access URL & next steps
```

---

**Ready to deploy?** Run: `curl -fsSL https://raw.githubusercontent.com/tuyencaovn/saasguard.tech/master/install.sh | bash`

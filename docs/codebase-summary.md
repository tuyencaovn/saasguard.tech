# Codebase Summary - BimNext Monitor

**Generated:** 2025-12-24
**Last Updated:** 2026-01-17
**Total Files:** 112
**Total Tokens:** 77,274

---

## Project Overview

BimNext Monitor is a full-stack TypeScript application providing real-time server monitoring with Docker/PM2 integration and intelligent alert notifications. The system uses a modern architecture with NestJS backend, Next.js frontend, PostgreSQL database, and WebSocket real-time communication.

---

## Repository Structure

```
bimnext_monitor/
├── apps/
│   ├── backend/                 # NestJS API (Node.js/TypeScript)
│   │   ├── src/
│   │   │   ├── config/          # App configuration (brand, etc.)
│   │   │   ├── database/        # Database seeding
│   │   │   ├── gateways/        # WebSocket gateways
│   │   │   ├── modules/         # Feature modules
│   │   │   │   ├── alerts/      # Alert system (thresholds, notifications)
│   │   │   │   ├── auth/        # JWT authentication & authorization
│   │   │   │   ├── docker/      # Docker monitoring & control
│   │   │   │   ├── email/       # Email service (SendGrid/SMTP)
│   │   │   │   ├── invitations/ # User invitation system
│   │   │   │   ├── metrics/     # System metrics collection
│   │   │   │   ├── pm2/         # PM2 process monitoring
│   │   │   │   └── users/       # User management
│   │   │   ├── app.module.ts    # Root module
│   │   │   ├── app.controller.ts
│   │   │   └── main.ts          # Entry point
│   │   └── test/                # E2E tests
│   │
│   └── frontend/                # Next.js Dashboard (React/TypeScript)
│       ├── src/
│       │   ├── config/          # App configuration (brand)
│       │   ├── app/             # Route pages
│       │   │   ├── page.tsx           # Dashboard
│       │   │   ├── alerts/page.tsx    # Alert management UI
│       │   │   ├── containers/page.tsx
│       │   │   ├── pm2/page.tsx
│       │   │   ├── users/page.tsx
│       │   │   ├── settings/page.tsx
│       │   │   ├── login/page.tsx
│       │   │   └── ...auth pages
│       │   ├── components/      # Reusable React components
│       │   │   ├── ui/          # shadcn/ui components
│       │   │   ├── threshold-modal.tsx    # Alert threshold editor
│       │   │   ├── performance-chart.tsx
│       │   │   ├── metric-gauge.tsx
│       │   │   ├── logs-modal.tsx
│       │   │   ├── sidebar.tsx
│       │   │   └── ...
│       │   ├── contexts/        # React context (auth)
│       │   ├── hooks/           # Custom hooks (useSocket)
│       │   ├── lib/             # Utilities
│       │   └── types/           # TypeScript types
│       └── ...config files
│
├── scripts/
│   └── dev.sh                   # Development startup script
│
├── .claude/                     # Claude AI configuration
├── docs/                        # Project documentation
├── plans/                       # Implementation plans
├── docker-compose.yml           # PostgreSQL container setup
├── ecosystem.config.js          # PM2 configuration
├── package.json                 # Root package manager
├── .npmrc                       # npm configuration
└── README.md                    # Quick start guide
```

---

## Core Modules

### Alerts Module (`apps/backend/src/modules/alerts/`)

**Purpose:** Comprehensive alert system for threshold-based notifications.

**Key Files:**
- `alerts.service.ts` - Threshold CRUD, cooldown logic
- `alerts.scheduler.ts` - Event listener, threshold checking, notification dispatch
- `alerts.controller.ts` - HTTP endpoints
- `alert-threshold.entity.ts` - Database schema
- `alert-log.entity.ts` - Notification history

**Features:**
- Create/read/update/delete alert thresholds
- Monitor CPU, RAM, Disk usage
- Operators: GT (>), GTE (>=), LT (<), LTE (<=), EQ (==), NE (!=)
- Multi-channel notifications: Email (SendGrid) + Telegram
- Cooldown mechanism (prevent alert spam)
- Enable/disable individual thresholds
- Alert history with delivery status tracking
- Pagination support for history logs

**Database Schema:**
```sql
AlertThreshold
  - id: UUID
  - userId: UUID (foreign key)
  - metricName: Enum (CPU, RAM, DISK)
  - operator: Enum (GT, GTE, LT, LTE, EQ, NE)
  - value: Float
  - channels: Enum[] (Email, Telegram)
  - cooldownMs: Integer (milliseconds)
  - isEnabled: Boolean
  - lastTriggeredAt: DateTime (nullable)
  - createdAt: DateTime
  - updatedAt: DateTime

AlertLog
  - id: UUID
  - thresholdId: UUID (foreign key)
  - metricValue: Float
  - deliveryStatus: Enum (Sent, Failed, Pending)
  - errorMessage: String (nullable)
  - createdAt: DateTime
```

### Authentication Module (`apps/backend/src/modules/auth/`)

**JWT Strategy:**
- Access token: 24h expiry
- Refresh token: 7d expiry
- HTTP-only cookies for secure storage

**Role-Based Access:**
- Admin: Full control (create thresholds, manage users, view logs)
- Viewer: Read-only access

### Email Service (`apps/backend/src/modules/email/`)

**Capabilities:**
- SendGrid integration for transactional emails
- SMTP fallback for password reset
- Alert notification formatting
- Template support

**Methods:**
- `sendAlertEmail()` - Format and send threshold alerts
- `sendInvitation()` - User invitation emails
- `sendPasswordReset()` - Reset token emails

### Metrics Module (`apps/backend/src/modules/metrics/`)

**Data Collection:**
- Uses `systeminformation` library
- Polls every 3 seconds
- Collects: CPU%, RAM%, Disk%, Network I/O
- Stores historical data in PostgreSQL
- Emits `metrics.updated` event for subscribers

### Docker Module (`apps/backend/src/modules/docker/`)

**Features:**
- List all containers
- Start/stop/restart containers
- View container logs
- Real-time event streaming
- Status tracking

### PM2 Module (`apps/backend/src/modules/pm2/`)

**Features:**
- List all PM2 processes
- Start/stop/restart processes
- CPU/Memory monitoring
- Uptime tracking
- View process logs
- 5-second polling refresh

---

## Frontend Components

### Alert Management UI

**Components:**
- `alerts/page.tsx` - Main alert management page with tabs:
  - Thresholds: Create/edit/delete/enable-disable alert rules
  - History: Pagination of past alerts with status/delivery info

- `threshold-modal.tsx` - Modal for threshold creation/editing:
  - Metric selector (CPU/RAM/Disk)
  - Operator selector
  - Float value input (with delete capability)
  - Multi-select channels (Email/Telegram)
  - Cooldown period input
  - Enable/disable toggle

**Features:**
- Real-time feedback from API
- Toast notifications for CRUD operations
- Confirmation dialogs for destructive actions
- Pagination controls for history

### Dashboard & Monitoring

- `page.tsx` - Main dashboard with real-time metrics
- `containers/page.tsx` - Docker container management (grid/list view)
- `pm2/page.tsx` - Process monitoring dashboard
- `performance-chart.tsx` - Historical metrics visualization

---

## Real-time Architecture

**WebSocket Integration:**
- Uses Socket.IO with fallback to polling
- Room-based subscriptions
- Update frequency: 3-5 seconds
- Auto-reconnection with exponential backoff

**Event Flow:**
```
Metrics.scheduler (polls every 3s)
    ↓
emit('metrics.updated', systemMetrics)
    ↓
AlertsScheduler @OnEvent('metrics.updated')
    ↓
Check all enabled thresholds
    ↓
If triggered → Check cooldown → Send notifications
    ↓
Create AlertLog entry → Emit event to WebSocket
    ↓
Frontend receives update → Update UI
```

---

## Database Connections

**Primary:** PostgreSQL 16
- Host: `localhost` (or service name in Docker)
- Port: `5435`
- Database: `bimnext_monitor`
- User: `monitor`
- ORM: TypeORM with type-safe queries

**Schema Tables:**
- Users
- AlertThreshold
- AlertLog
- MetricsHistory
- Containers (synced from Docker)
- PasswordReset
- Invitation

---

## API Endpoints

### Alerts Endpoints

```
GET    /alerts/thresholds              # List all thresholds
GET    /alerts/thresholds/:id          # Get threshold details
GET    /alerts/logs?page=1&limit=10    # Paginated alert history
POST   /alerts/thresholds              # Create new threshold
PATCH  /alerts/thresholds/:id          # Update threshold
DELETE /alerts/thresholds/:id          # Delete threshold
```

**Response Format (Thresholds):**
```json
{
  "id": "uuid",
  "metricName": "CPU",
  "operator": "GT",
  "value": 80,
  "channels": ["Email", "Telegram"],
  "cooldownMs": 300000,
  "isEnabled": true,
  "lastTriggeredAt": "2025-12-24T10:30:00Z",
  "createdAt": "2025-12-24T09:00:00Z",
  "updatedAt": "2025-12-24T10:15:00Z"
}
```

**Response Format (Logs with Pagination):**
```json
{
  "data": [
    {
      "id": "uuid",
      "thresholdId": "uuid",
      "metricValue": 85.5,
      "deliveryStatus": "Sent",
      "errorMessage": null,
      "createdAt": "2025-12-24T10:30:00Z"
    }
  ],
  "total": 125,
  "page": 1,
  "limit": 10,
  "totalPages": 13
}
```

---

## Development Workflow

**Commands:**
```bash
npm install             # Install all dependencies
npm run dev             # Start PostgreSQL + Backend + Frontend
npm run dev:logs        # View PM2 logs
npm run dev:stop        # Stop services
npm run dev:restart     # Restart services
npm run db:up           # Start PostgreSQL only
npm run db:down         # Stop PostgreSQL
```

**Environment Variables:**

Backend (`.env`):
```
PORT=3005
APP_NAME=BimNext Monitor           # Configurable brand name
APP_SHORT_NAME=BimNext             # Short brand name
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USER=monitor
DATABASE_PASSWORD=M0n!t0r_D3v@2025
DATABASE_NAME=bimnext_monitor
JWT_SECRET=your-secret-key
SENDGRID_API_KEY=SG.xxx
TELEGRAM_BOT_TOKEN=xxx:xxx
FRONTEND_URL=http://localhost:3006
```

Frontend (`.env`):
```
NEXT_PUBLIC_APP_NAME=BimNext Monitor       # Configurable brand name
NEXT_PUBLIC_APP_SHORT_NAME=BimNext         # Short brand name
NEXT_PUBLIC_API_URL=http://localhost:3005
NEXT_PUBLIC_WS_URL=http://localhost:3005
```

---

## Implemented Features (Dec 2025)

### Dashboard
- Real-time metrics (CPU, RAM, Disk, Network)
- Performance charts with 15m/1h/6h/24h time ranges
- System uptime display
- Container overview

### Alert System (Recently Completed)
- Alert threshold creation/management
- Multi-metric support (CPU/RAM/Disk)
- Operator selection (6 types)
- Multi-channel notifications (Email/Telegram)
- Alert history with pagination
- Cooldown mechanism
- Enable/disable toggles
- Last triggered timestamp

### Container Management
- Grid/List view toggle
- Status filtering (All/Running/Stopped/Error)
- Search by name/image
- Start/Stop/Restart controls
- Log viewing with tail selector

### PM2 Monitoring
- Process list with status
- CPU/Memory statistics
- Uptime and restart counts
- Control actions
- Auto-refresh (5s)

### Authentication
- JWT-based login
- Role-based access (Admin/Viewer)
- User invitation system
- Password reset via email

### Branding
- Configurable app name via environment variables
- `APP_NAME` / `NEXT_PUBLIC_APP_NAME` for full name
- `APP_SHORT_NAME` / `NEXT_PUBLIC_APP_SHORT_NAME` for sidebar
- Used in: emails, notifications, page titles, sidebar, auth pages

---

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 | React framework with SSR |
| **Backend** | NestJS 10 | Node.js framework |
| **Database** | PostgreSQL 16 | Relational data store |
| **ORM** | TypeORM 0.3 | Type-safe database access |
| **Real-time** | Socket.IO 4 | WebSocket communication |
| **Metrics** | systeminformation | System data collection |
| **Docker** | dockerode | Container interaction |
| **PM2** | pm2 | Process management |
| **Email** | SendGrid, Nodemailer | Notifications |
| **Styling** | Tailwind CSS, shadcn/ui | UI framework |
| **Charts** | Recharts | Data visualization |

---

## Top Files by Complexity

1. `apps/frontend/src/app/pm2/page.tsx` (6,664 tokens) - PM2 management interface
2. `apps/frontend/src/app/containers/page.tsx` (5,647 tokens) - Container management
3. `apps/frontend/src/app/alerts/page.tsx` (4,865 tokens) - Alert management UI
4. `apps/frontend/src/app/page.tsx` (3,978 tokens) - Dashboard
5. `apps/frontend/src/app/users/page.tsx` (3,487 tokens) - User management

---

## Quality Metrics

- **No suspicious files detected**
- **TypeScript strict mode enabled**
- **ESLint configured**
- **Prettier formatting**
- **E2E tests available**

---

## Known Patterns

### Error Handling
- NestJS exception filters for consistent responses
- Try-catch blocks in event handlers
- Logging via NestJS Logger

### Data Validation
- DTOs with class-validator decorators
- Type-safe TypeScript throughout
- Database constraints

### State Management
- Frontend: Zustand for client state, React Query for server state
- Backend: Service-based state management
- Database: Single source of truth

---

## Next Steps / Future Enhancements

- Advanced alerting rules (AND/OR conditions)
- Custom notification templates
- Alert scheduling (quiet hours)
- Performance optimization for large metric datasets
- Enhanced logging and audit trails
- Multi-tenant support

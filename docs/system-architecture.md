# System Architecture - SaaSGuard

**Version:** 2.1.0
**Updated:** 2026-03-03
**Architecture Pattern:** Modular Monolith with Event-Driven Scheduling

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js)                      │
│  • React Components                                         │
│  • TailwindCSS + shadcn/ui                                  │
│  • Socket.IO Client (real-time updates)                     │
│  • React Query (server state management)                    │
│  • Zustand (client state management)                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                  WebSocket + HTTP
                         │
┌────────────────────────▼────────────────────────────────────┐
│                BACKEND (NestJS + Express)                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              API Layer (Controllers)                 │   │
│  │  • Auth Controller                                   │   │
│  │  • Alerts Controller (CRUD endpoints)                │   │
│  │  • Metrics Controller                                │   │
│  │  • Docker Controller                                 │   │
│  │  • PM2 Controller                                    │   │
│  │  • Users Controller                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │            Business Logic (Services)                │   │
│  │  • AlertsService (threshold CRUD)                   │   │
│  │  • AlertsScheduler (event-driven checking)          │   │
│  │  • EmailService (SendGrid + SMTP)                   │   │
│  │  • MetricsService (data collection)                 │   │
│  │  • DockerService (container management)             │   │
│  │  • PM2Service (process monitoring)                  │   │
│  │  • AuthService (JWT + auth logic)                   │   │
│  │  • UsersService (user management)                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │         Real-Time Layer (WebSocket Gateways)        │   │
│  │  • MetricsGateway (broadcast metric updates)        │   │
│  │  • AlertGateway (broadcast alert notifications)     │   │
│  │  • Socket.IO Room Management                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │          Data Access Layer (TypeORM)                │   │
│  │  • Repositories for all entities                    │   │
│  │  • Type-safe database queries                       │   │
│  │  • Eager/lazy loading optimization                 │   │
│  └──────────────────────────────────────────────────────┘   │
└────┬──────────────────────┬──────────────────────┬──────────┘
     │                      │                      │
  Database            Docker Socket          PM2 Daemon
  (PostgreSQL)        (/var/run/docker.sock)  (local)
```

---

## Module Architecture

### 1. Alerts Module

**Purpose:** Comprehensive threshold-based alert system with multi-channel notifications.

**Files:**
```
apps/backend/src/modules/alerts/
├── dto/
│   ├── create-threshold.dto.ts
│   └── update-threshold.dto.ts
├── entities/
│   ├── alert-threshold.entity.ts
│   └── alert-log.entity.ts
├── alerts.controller.ts      # HTTP endpoints
├── alerts.service.ts         # Business logic
├── alerts.scheduler.ts       # Event-driven checking
└── alerts.module.ts          # Module definition
```

**Key Components:**

**AlertsService:**
- CRUD operations for thresholds
- Cooldown logic checking
- Historical data retrieval with pagination
- Enable/disable threshold management

```typescript
// Key methods
findAllThresholds(): Promise<AlertThreshold[]>
findEnabledThresholds(): Promise<AlertThreshold[]>
findThresholdLogs(page, limit): Promise<PaginatedResponse>
createThreshold(dto): Promise<AlertThreshold>
updateThreshold(id, dto): Promise<AlertThreshold>
deleteThreshold(id): Promise<void>
canSendAlert(thresholdId): Promise<boolean>  // Checks cooldown
recordAlert(thresholdId, value, status): Promise<AlertLog>
```

**AlertsScheduler (Event-Driven):**
```typescript
@OnEvent('metrics.updated')
async checkThresholds(metrics: SystemMetrics): Promise<void>
  1. Fetch all enabled thresholds
  2. For each threshold:
     a. Extract metric value (CPU/RAM/Disk)
     b. Evaluate condition (GT, GTE, LT, LTE, EQ, NE)
     c. If triggered:
        - Check cooldown
        - Send notifications (Email, Telegram)
        - Create alert log entry
```

**AlertsController:**
```
POST   /alerts/thresholds              → Create threshold
GET    /alerts/thresholds              → Get all thresholds
GET    /alerts/thresholds/:id          → Get single threshold
PATCH  /alerts/thresholds/:id          → Update threshold
DELETE /alerts/thresholds/:id          → Delete threshold
GET    /alerts/logs?page=1&limit=10    → Get paginated history
```

**Event Flow:**
```
1. MetricsScheduler emits 'metrics.updated' event
2. AlertsScheduler listens to this event
3. For each enabled threshold:
   - Extract metric value from payload
   - Check if value satisfies condition
   - If yes: Check cooldown (last triggered time)
   - If cooldown passed: Send notifications
4. Always create AlertLog entry (even if cooldown prevents send)
5. Update lastTriggeredAt timestamp
```

**Database Schema:**

AlertThreshold:
```sql
CREATE TABLE alert_threshold (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES "user"(id),
  metric_name VARCHAR NOT NULL,  -- CPU, RAM, DISK
  operator VARCHAR NOT NULL,     -- GT, GTE, LT, LTE, EQ, NE
  value NUMERIC NOT NULL,        -- Float threshold value
  channels TEXT[] NOT NULL,      -- {Email, Telegram}
  cooldown_ms INTEGER NOT NULL,  -- Milliseconds before next alert
  is_enabled BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

AlertLog:
```sql
CREATE TABLE alert_log (
  id UUID PRIMARY KEY,
  threshold_id UUID NOT NULL REFERENCES alert_threshold(id),
  metric_value NUMERIC NOT NULL,
  delivery_status VARCHAR NOT NULL,  -- Sent, Failed, Pending
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 2. Metrics Module

**Purpose:** Collect system metrics and broadcast real-time updates.

**Architecture:**
```
MetricsScheduler (runs every 3s)
    ↓
    Calls systeminformation library
    ↓
    Saves to MetricsHistory table
    ↓
    Emits 'metrics.updated' event
    ↓
    Broadcasts to frontend via WebSocket
    ↓
    Consumed by:
      - Dashboard (display)
      - AlertsScheduler (threshold checking)
      - Frontend charts (historical data)
```

**Collected Data:**
- CPU usage percentage
- RAM usage percentage
- Disk usage (per disk)
- Network upload/download speeds
- System uptime

**WebSocket Broadcasting:**
```typescript
// MetricsGateway broadcasts to all connected clients
@SubscribeMessage('subscribe:metrics')
handleMetricsSubscription(socket): void
  // Client joins 'metrics' room
  // Receives updates every 3s

// Server pushes updates
this.server.to('metrics').emit('metrics:updated', {
  cpu: { usage: 45.2 },
  ram: { usagePercent: 62.1 },
  disk: [{ usagePercent: 78.5 }],
  network: { upload: 1.2, download: 5.6 }
})
```

---

### 3. Email Service

**Purpose:** Send notifications via multiple channels.

**Supported Channels:**
- SendGrid (primary for alerts)
- SMTP (secondary for password reset)

**Key Methods:**
```typescript
sendAlertEmail(recipient, threshold, metricValue): Promise<void>
  → Formats alert message
  → Sends via SendGrid
  → Returns success/failure

sendInvitation(email, inviteLink): Promise<void>
  → User invitation email

sendPasswordReset(email, resetToken): Promise<void>
  → Password reset email via SMTP
```

**Alert Email Template:**
```
Subject: Alert: {MetricName} {Operator} {Threshold}

Body:
Alert triggered for {MetricName}
Current value: {MetricValue}%
Threshold: {Operator} {Threshold}%
Triggered at: {Timestamp}

Click here to view details: {DashboardLink}
```

---

### 4. Docker Module

**Purpose:** Monitor and control Docker containers.

**Event Stream:**
```
Docker Events
    ↓
Listened by DockerService
    ↓
Processes: start, stop, restart, die, create, destroy
    ↓
Updates container status in-memory
    ↓
Broadcasts to frontend via WebSocket
```

**Available Actions:**
- List containers with status, image, uptime
- Start stopped container
- Stop running container
- Restart container
- View logs (tail selector)
- Filter by status (all, running, stopped, error)
- Search by name/image

---

### 5. PM2 Module

**Purpose:** Monitor PM2 processes.

**Polling Model:**
```
PM2Scheduler (every 5 seconds)
    ↓
    Calls pm2.list() API
    ↓
    Extracts: name, status, CPU%, memory, uptime, restarts
    ↓
    Updates in-memory process list
    ↓
    Broadcasts changes to frontend
```

**Available Actions:**
- List processes with stats
- Start/stop/restart process
- View logs
- Filter by status (online, stopped, errored)
- Search by name

---

### 6. Authentication Module

**Purpose:** JWT-based authentication and role-based access control.

**Authentication Flow:**
```
1. User submits email/password on login page
2. AuthService validates credentials
3. If valid:
   - Create JWT tokens (access + refresh)
   - Store in HTTP-only cookies
   - Return tokens to frontend
4. Frontend includes tokens in subsequent requests
5. JwtAuthGuard validates token on protected routes
6. RolesGuard checks user role for access
```

**Tokens:**
- Access Token: 24h expiry
- Refresh Token: 7d expiry
- Both stored in HTTP-only cookies

**Roles:**
- Admin: Full access (create thresholds, manage users)
- Viewer: Read-only access

---

### 7. Users Module

**Purpose:** User management and invitations.

**User Lifecycle:**
```
1. Admin invites user via email
2. Invitation link sent to email
3. User clicks link, sets password
4. User account created in database
5. User can now login
6. Admin can change role or delete user
```

**User Entity:**
```sql
CREATE TABLE "user" (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  role VARCHAR NOT NULL DEFAULT 'Viewer',  -- Admin, Viewer
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Data Flow Diagrams

### Alert Trigger Flow
```
System starts
    ↓
MetricsScheduler collects metrics every 3s
    ↓
emit('metrics.updated', systemMetrics)
    ↓
AlertsScheduler @OnEvent('metrics.updated')
    ↓
Get all enabled thresholds
    ↓
For each threshold:
    ├─ Extract metric value from payload
    ├─ Evaluate condition (currentValue operator threshold)
    ├─ If condition TRUE:
    │   ├─ Query last AlertLog for this threshold
    │   ├─ Calculate time since lastTriggeredAt
    │   ├─ If time > cooldownMs:
    │   │   ├─ Check Email channel → Send via SendGrid
    │   │   ├─ Check Telegram channel → Send via Telegraf
    │   │   └─ Log status as 'Sent' or 'Failed'
    │   └─ Else:
    │       └─ Log status as 'Pending' (cooldown active)
    │
    ├─ Always create AlertLog entry
    ├─ Update lastTriggeredAt on threshold
    └─ Emit 'alert:triggered' via WebSocket

Broadcast to frontend:
    ├─ Update threshold card (last triggered time)
    ├─ Show toast notification
    └─ Refresh alert history
```

### User Request Flow
```
Client Request
    ↓
Express middleware
    ├─ Parse JWT from cookies
    ├─ Validate signature and expiry
    └─ Attach user to request
    ↓
NestJS Guards
    ├─ JwtAuthGuard (is user authenticated?)
    └─ RolesGuard (does user have role?)
    ↓
Controller
    └─ Route to handler
    ↓
Service
    ├─ Business logic
    ├─ Database operations via TypeORM
    └─ Return result
    ↓
HTTP Response
    └─ JSON response + status code
```

---

## Database Relationships

```
User (1) ──── (N) AlertThreshold
  ├─ Manages own thresholds
  └─ Cannot see other users' thresholds

AlertThreshold (1) ──── (N) AlertLog
  ├─ Creates log entry on check
  └─ Log shows delivery status

MetricsHistory (N)
  ├─ Insert only (time-series)
  └─ No foreign keys (for performance)

User (1) ──── (N) Invitation
  └─ Admin invites new users
```

---

## Performance Considerations

### Metric Collection
- **Frequency:** 3-second polling (optimized balance)
- **In-Memory Cache:** Latest values cached for instant access
- **Database:** Historical data persisted with 90-day retention
- **WebSocket Broadcast:** Only changes broadcasted to reduce traffic

### Alert Checking
- **Event-Driven:** Triggered by metric updates (not separate scheduler)
- **Cooldown:** Prevents repeated checks for same threshold
- **Batching:** All thresholds checked per metric cycle
- **Logging:** Always logged for audit trail

### Database Queries
- **Threshold Retrieval:** Indexed by user_id and is_enabled
- **Alert Log Pagination:** Indexed by threshold_id and created_at
- **Metrics History:** Partitioned by date for efficient range queries

### Frontend Optimization
- **React Query:** Server state caching
- **Socket.IO:** Binary protocol with compression
- **Component Memoization:** Prevent unnecessary re-renders
- **Lazy Loading:** Components loaded on demand

---

## Security Architecture

### Authentication
- **JWT in HTTP-only cookies** - Protected against XSS
- **CORS configured** - Prevents cross-origin attacks
- **HTTPS in production** - Encrypted transport

### Authorization
- **Role-based access control (RBAC)**
  - Admin: All operations
  - Viewer: Read-only
- **User isolation:** Users see only their own thresholds
- **Rate limiting:** (Future) Prevent brute force attacks

### Data Protection
- **Password hashing:** bcrypt with salt rounds
- **No secrets in logs:** Email addresses and tokens redacted
- **Database encryption:** (Future) At-rest encryption for sensitive data

---

## Scalability Architecture

### Current (Single Server)
- Suitable for small to medium deployments
- PostgreSQL handles real-time metrics
- WebSocket serves 100+ concurrent users

### Future (Distributed)
- **Multiple backend instances**
  - Load balancer distributes requests
  - Shared database (PostgreSQL)
  - Redis for session/cache sharing

- **Alert Scheduler Clustering**
  - Only one instance processes alerts (prevent duplicates)
  - Redis-backed job queue

- **Metrics History Scaling**
  - Time-series database (InfluxDB/TimescaleDB)
  - Data compression for historical queries

---

## Testing Architecture

### Unit Tests
- Service methods
- Validation logic
- Utility functions

### Integration Tests
- Controller endpoints
- Database operations
- Module interactions

### E2E Tests
- Complete user flows
- Alert triggering scenarios
- Authentication flows

---

## Monitoring & Observability

### Logging
- **NestJS Logger** - Structured logging
- **Alert Execution** - Logs when thresholds trigger
- **Error Tracking** - Caught exceptions logged

### Metrics Exposure
- **Prometheus metrics** - (Future) System health metrics
- **Application metrics** - User count, request rate, latency

### Health Checks
- Database connectivity
- External service availability (SendGrid, Telegram)
- WebSocket gateway health

---

## Deployment Architecture

### Production (Live — monitor.saasguard.tech)

```
Internet
    ↓
Nginx (single domain: monitor.saasguard.tech)
    ├─ /api/*        → strip prefix → Backend :3005  (HTTP)
    ├─ /socket.io/*  → Backend :3005  (WebSocket upgrade)
    └─ /*            → Frontend :3006 (Next.js)
    ↓
Docker Compose
    ├─ postgres      (PostgreSQL :5435)
    ├─ backend       (NestJS :3005, user: root, pid: host)
    │   ├─ /var/run/docker.sock  (Docker monitoring)
    │   ├─ /root/.pm2            (PM2 monitoring via socket)
    │   └─ /:/hostfs:ro          (Host disk metrics)
    └─ frontend      (Next.js :3006, built with NEXT_PUBLIC_* baked in)
```

**Key design decisions:**
- Single domain, path-based routing — no separate API subdomain
- Backend runs as `root` in container for Docker socket + PM2 socket + host metrics access
- `pid: host` gives backend visibility into all host processes
- `NEXT_PUBLIC_*` vars are Docker build args (baked at build time, not runtime)
- SSL via Certbot (single domain only)
- TypeORM `synchronize: true` always — no migrations (self-hosted product)
- `/health` endpoint is `@Public()` (bypasses JWT) for Docker healthchecks

### IP Mode (No Domain)

```
Internet
    ↓
Frontend :3006  (direct access — no Nginx)
Backend  :3005  (direct access — no Nginx)
```

`NEXT_PUBLIC_API_URL=http://IP:3005`, `NEXT_PUBLIC_WS_URL=http://IP:3005`

### Development
```
Docker Compose:
  - PostgreSQL container
  - Backend (NestJS) via PM2 or ts-node
  - Frontend (Next.js) dev server
  - Volume mounts for hot reload
```

---

## Configuration Management

### Environment-Based
```
.env files for:
  - Database credentials
  - JWT secrets
  - SendGrid API key
  - Telegram token
  - Frontend URL
```

### Database Schema
- TypeORM `synchronize: true` always enabled
- Self-hosted product — schema auto-managed, no manual migrations required

---

## Conclusion

The SaaSGuard architecture follows a modular, event-driven design that prioritizes:
1. **Real-time responsiveness** through WebSocket updates
2. **Scalability** via event-driven processing
3. **Security** with JWT and role-based access
4. **Reliability** through comprehensive logging and error handling
5. **Maintainability** with clear module boundaries and separation of concerns

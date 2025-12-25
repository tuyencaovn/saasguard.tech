# BimNext Monitor - Project Overview & PDR

**Version:** 2.0.0
**Updated:** 2025-12-24
**Status:** Active Development

---

## Project Vision

BimNext Monitor is a comprehensive server monitoring platform enabling IT teams to track infrastructure health, manage containerized applications, monitor processes, and respond to anomalies with intelligent alerts. The system prioritizes real-time visibility, ease of use, and reliable notification delivery.

---

## Core Problem Statement

Managing modern infrastructure requires:
- **Real-time visibility** into system health (CPU, RAM, Disk usage)
- **Container orchestration insights** (Docker monitoring and control)
- **Process tracking** (PM2 integration)
- **Proactive alerting** (threshold-based notifications)
- **Role-based access control** (Admin/Viewer permissions)

---

## Target Users

1. **Infrastructure Engineers** - Monitor servers, Docker containers, and processes
2. **DevOps Teams** - Set up alerts, investigate issues, manage infrastructure
3. **System Administrators** - Control access, manage users, review alert history

---

## Product Development Requirements (PDR)

### Phase 1: Core Infrastructure (COMPLETED)

**Objective:** Establish foundation for real-time monitoring

**Functional Requirements:**
- Real-time system metrics collection (CPU, RAM, Disk, Network)
- WebSocket-based real-time updates to frontend
- User authentication with JWT and role-based access
- Database schema for users, metrics history, and configuration

**Non-Functional Requirements:**
- 3-5 second metric polling interval
- <100ms latency for metric updates
- Support for 100+ concurrent users
- PostgreSQL for persistent storage
- Secure HTTP-only cookie storage

**Status:** COMPLETE

---

### Phase 2: Container Monitoring (COMPLETED)

**Objective:** Add Docker container monitoring and control capabilities

**Functional Requirements:**
- List all Docker containers with status
- Real-time container metrics (CPU, Memory)
- Start/Stop/Restart containers (admin only)
- View container logs
- Filter containers (All, Running, Stopped, Error)
- Search by name or image
- Grid/List view toggle

**Non-Functional Requirements:**
- Docker socket communication
- Event-driven updates
- <5s response time for actions
- Efficient memory usage for large container counts

**Status:** COMPLETE

---

### Phase 3: Process Monitoring (COMPLETED)

**Objective:** Integrate PM2 process monitoring

**Functional Requirements:**
- List all PM2 processes with detailed status
- Process metrics (CPU%, Memory, Uptime, Restart count)
- Start/Stop/Restart processes (admin only)
- View process logs
- Filter processes (All, Online, Stopped, Errored)
- Search by process name
- Auto-refresh every 5 seconds

**Non-Functional Requirements:**
- Local PM2 daemon communication
- 5-second refresh cycle
- Real-time process list updates

**Status:** COMPLETE

---

### Phase 4: Alert System (COMPLETED - Dec 2025)

**Objective:** Implement comprehensive threshold-based alert system

**Functional Requirements:**

**4.1 Threshold Management:**
- Create alert thresholds with metric selection (CPU, RAM, Disk)
- Define operators: Greater Than (>), GTE (>=), Less Than (<), LTE (<=), Equal (=), Not Equal (!=)
- Set numeric thresholds (float values)
- Assign cooldown period (milliseconds) to prevent alert spam
- Enable/disable individual thresholds without deletion
- View last triggered timestamp

**4.2 Notification Channels:**
- Email notifications via SendGrid
- Telegram bot integration
- Multi-channel support (send to both simultaneously)
- Ability to remove channels from threshold

**4.3 Alert Checking & Triggering:**
- Monitor system metrics every time they update (3s cycle)
- Check all enabled thresholds against current metrics
- Respect cooldown periods to prevent spam
- Create log entry for every check (even if not sent)
- Console logging when alerts trigger

**4.4 Alert History:**
- Paginated alert log retrieval with size customization (10, 25, 50 items)
- Display metrics: Delivery status (Sent/Failed/Pending), metric value, timestamp, error message
- Show last triggered time on threshold card

**4.5 Frontend Alert Management:**
- Modal for threshold creation/editing
- Threshold list with enable/disable toggle
- History tab with pagination
- Delete confirmation dialogs
- Real-time updates

**Non-Functional Requirements:**
- Cooldown logic prevents alerts within specified milliseconds
- Always create log entries for audit trail
- SendGrid integration for reliable email delivery
- Handle missing email/Telegram configuration gracefully
- Console feedback for debugging

**Acceptance Criteria:**
- User can create threshold with all required fields
- Alert triggers when metric exceeds/satisfies threshold
- Cooldown prevents duplicate alerts
- Email sends successfully (if configured)
- Alert history shows accurate delivery status
- User can view last trigger time
- Pagination works correctly for history

**Status:** COMPLETE ✓

**Completion Date:** 2025-12-24

**Implementation Details:**
- Backend: `alerts.scheduler.ts` handles event-driven checking
- Backend: `alerts.service.ts` manages CRUD and cooldown logic
- Frontend: `threshold-modal.tsx` for threshold creation/editing
- Frontend: `alerts/page.tsx` implements tab-based UI
- Database: `AlertThreshold` and `AlertLog` entities

---

### Phase 5: User Management (COMPLETED)

**Objective:** Complete user provisioning and access control

**Functional Requirements:**
- Create users via invitation system
- Role assignment (Admin/Viewer)
- Password reset via email
- User list with role display
- Delete users (admin only)

**Status:** COMPLETE

---

### Phase 6: Settings & Configuration (IN PROGRESS)

**Objective:** Provide system-wide configuration interface

**Planned Features:**
- Email configuration (SendGrid API key management)
- Telegram bot token configuration
- SMTP settings for password reset emails
- Alert preferences per user

**Status:** IN PROGRESS

---

## Key Features Summary

| Feature | Status | Phase | Implementation |
|---------|--------|-------|-----------------|
| Real-time Metrics | ✓ Complete | 1 | systeminformation + Socket.IO |
| Dashboard | ✓ Complete | 1 | Recharts + Real-time updates |
| Docker Monitoring | ✓ Complete | 2 | dockerode library |
| Container Control | ✓ Complete | 2 | Start/Stop/Restart actions |
| PM2 Monitoring | ✓ Complete | 3 | pm2 library integration |
| Alert Thresholds | ✓ Complete | 4 | Database + Scheduler |
| Alert Notifications | ✓ Complete | 4 | SendGrid + Telegram |
| Alert History | ✓ Complete | 4 | Pagination + Delivery tracking |
| User Management | ✓ Complete | 5 | Invitations + Role-based access |
| Settings Page | ◐ In Progress | 6 | Configuration management |

---

## Technical Architecture

### Tech Stack
- **Frontend:** Next.js 14 + React 18 + TypeScript
- **Backend:** NestJS 10 + Express
- **Database:** PostgreSQL 16 + TypeORM
- **Real-time:** Socket.IO 4.x
- **Infrastructure:** Docker, Docker Compose, PM2

### System Architecture
```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js)               │
│  - Dashboard, Alerts, Containers, PM2, Users        │
│  - Real-time updates via Socket.IO                  │
└────────────────────┬────────────────────────────────┘
                     │
              Socket.IO Bridge
                     │
┌────────────────────▼────────────────────────────────┐
│              Backend (NestJS)                       │
│  ┌──────────────────────────────────────────────┐   │
│  │  Modules:                                    │   │
│  │  • Metrics (polling, event emission)         │   │
│  │  • Alerts (scheduler, notification)          │   │
│  │  • Docker (container control)                │   │
│  │  • PM2 (process monitoring)                  │   │
│  │  • Auth (JWT, roles)                         │   │
│  │  • Email (SendGrid, SMTP)                    │   │
│  │  • Users (management, invitations)           │   │
│  └──────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
    PostgreSQL   Docker Socket  PM2 Daemon
    Database     (/var/run/)     (Local)
```

---

## Data Models

### User
```
- id: UUID (primary key)
- email: String (unique)
- passwordHash: String
- role: Enum (Admin, Viewer)
- createdAt: Timestamp
- updatedAt: Timestamp
```

### AlertThreshold
```
- id: UUID (primary key)
- userId: UUID (foreign key)
- metricName: Enum (CPU, RAM, DISK)
- operator: Enum (GT, GTE, LT, LTE, EQ, NE)
- value: Float
- channels: Enum[] (Email, Telegram)
- cooldownMs: Integer
- isEnabled: Boolean
- lastTriggeredAt: Timestamp (nullable)
- createdAt: Timestamp
- updatedAt: Timestamp
```

### AlertLog
```
- id: UUID (primary key)
- thresholdId: UUID (foreign key)
- metricValue: Float
- deliveryStatus: Enum (Sent, Failed, Pending)
- errorMessage: String (nullable)
- createdAt: Timestamp
```

### MetricsHistory
```
- id: UUID (primary key)
- timestamp: Timestamp
- cpuPercent: Float
- ramPercent: Float
- diskPercent: Float
- diskDetails: JSONB (per-disk info)
- networkUpload: Float (MB/s)
- networkDownload: Float (MB/s)
```

---

## API Contracts

### Alert Endpoints

#### Create Threshold
```http
POST /alerts/thresholds
Content-Type: application/json

{
  "metricName": "CPU",
  "operator": "GT",
  "value": 80.0,
  "channels": ["Email", "Telegram"],
  "cooldownMs": 300000,
  "isEnabled": true
}

Response: 201 Created
{
  "id": "uuid",
  "userId": "uuid",
  "metricName": "CPU",
  "operator": "GT",
  "value": 80,
  "channels": ["Email", "Telegram"],
  "cooldownMs": 300000,
  "isEnabled": true,
  "lastTriggeredAt": null,
  "createdAt": "2025-12-24T10:00:00Z",
  "updatedAt": "2025-12-24T10:00:00Z"
}
```

#### Get All Thresholds
```http
GET /alerts/thresholds
Authorization: Bearer {token}

Response: 200 OK
[
  {
    "id": "uuid",
    "metricName": "CPU",
    "operator": "GT",
    "value": 80,
    "channels": ["Email"],
    "cooldownMs": 300000,
    "isEnabled": true,
    "lastTriggeredAt": "2025-12-24T10:30:00Z"
  }
]
```

#### Update Threshold
```http
PATCH /alerts/thresholds/:id
Content-Type: application/json

{
  "value": 85,
  "isEnabled": false
}

Response: 200 OK
```

#### Delete Threshold
```http
DELETE /alerts/thresholds/:id
Authorization: Bearer {token}

Response: 204 No Content
```

#### Get Alert History
```http
GET /alerts/logs?page=1&limit=10
Authorization: Bearer {token}

Response: 200 OK
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

## Success Metrics

### Phase 4 (Alert System) Metrics
- **Feature Completeness:** 100% (all functional requirements met)
- **Test Coverage:** E2E tests included
- **Performance:** <100ms threshold check time
- **Reliability:** 99.9% alert delivery (with SendGrid)
- **User Experience:** Modal-based threshold editor, <1s response time
- **Data Integrity:** Complete alert history with pagination

### Overall Application Metrics
- **Uptime Target:** 99.5%
- **API Response Time:** <200ms (95th percentile)
- **Metric Update Latency:** <5 seconds
- **Concurrent Users:** 100+ supported
- **Database Query Time:** <100ms (90th percentile)

---

## Known Limitations & Future Enhancements

### Current Limitations
- Alerts check against current metrics only (no trend analysis)
- No alert scheduling (quiet hours, schedules)
- Single-level operators (no compound conditions like AND/OR)
- Alert history retained for 90 days

### Planned Enhancements
1. **Advanced Alert Rules** - Combine conditions with AND/OR logic
2. **Custom Templates** - User-defined notification message templates
3. **Alert Scheduling** - Set quiet hours, snooze periods, escalation
4. **Historical Trending** - Alert based on trends, not just current values
5. **Webhooks** - Custom integrations (Slack, PagerDuty, etc.)
6. **Multi-Tenancy** - Support multiple organizations
7. **RBAC Enhancements** - Custom roles with granular permissions
8. **Audit Logging** - Complete action history for compliance

---

## Deployment

### Development
```bash
npm run dev          # Start all services
npm run dev:logs     # View logs
npm run dev:stop     # Stop services
```

### Production (Future)
- Docker Compose for orchestration
- Environment-specific configuration
- Database migrations
- Security hardening (SSL/TLS, CORS, rate limiting)

---

## Dependencies & Vulnerabilities

**No critical vulnerabilities detected** (as of 2025-12-24)

**Key Dependencies:**
- NestJS 10.x - Actively maintained
- Next.js 14.x - Latest stable
- PostgreSQL 16.x - Latest stable
- TypeORM 0.3.x - Production-ready
- Socket.IO 4.x - Stable

---

## Changelog

### v2.0.0 (2025-12-24)
- **New:** Alert system with threshold-based notifications
- **New:** Multi-channel notifications (Email + Telegram)
- **New:** Alert history with pagination
- **Improved:** Email service integration
- **Fixed:** Cooldown logic for alert spam prevention

### v1.0.0 (2025-12-23)
- **Initial Release:** Core monitoring features
- Dashboard with real-time metrics
- Docker container monitoring
- PM2 process tracking
- User authentication and management

---

## Contact & Support

**Project Maintainer:** [Project Team]
**Repository:** bimnext_monitor
**Documentation:** ./docs/
**Issues:** GitHub Issues

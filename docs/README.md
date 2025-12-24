# BimNext Monitor - Documentation Index

**Last Updated:** 2025-12-24
**Current Version:** 2.0.0
**Status:** Production Ready

Welcome to BimNext Monitor's documentation. This guide helps you understand the project structure, architecture, and implementation patterns.

---

## Quick Start Documents

### New to the Project?
Start here:
1. **[Project Overview & PDR](./project-overview-pdr.md)** - Vision, requirements, and roadmap
2. **[Codebase Summary](./codebase-summary.md)** - Complete project structure overview
3. **[System Architecture](./system-architecture.md)** - How everything works together

### Development?
Use these for coding:
1. **[Code Standards](./code-standards.md)** - Naming conventions, patterns, best practices
2. **[System Architecture](./system-architecture.md)** - Component interaction and data flow
3. **[Design Guidelines](./design-guidelines.md)** - UI/UX standards for frontend

### Infrastructure?
Use these for deployment:
1. **[Tech Stack](./tech-stack.md)** - Technologies and dependencies
2. **[System Architecture](./system-architecture.md)** - Scalability and deployment patterns

---

## Documentation by Role

### Developer
| Document | Purpose |
|----------|---------|
| [Code Standards](./code-standards.md) | Learn coding patterns and conventions |
| [Codebase Summary](./codebase-summary.md) | Understand project structure |
| [System Architecture](./system-architecture.md) | Learn component interactions |
| [Tech Stack](./tech-stack.md) | Review technologies used |

### DevOps/Infrastructure
| Document | Purpose |
|----------|---------|
| [Tech Stack](./tech-stack.md) | Infrastructure and deployment |
| [System Architecture](./system-architecture.md) | Scalability and performance |
| [Project Overview](./project-overview-pdr.md) | Project phases and deployment |

### Project Manager
| Document | Purpose |
|----------|---------|
| [Project Overview & PDR](./project-overview-pdr.md) | Requirements and phases |
| [Tech Stack](./tech-stack.md) | Technology and timeline |
| [Codebase Summary](./codebase-summary.md) | Progress tracking |

### Designer
| Document | Purpose |
|----------|---------|
| [Design Guidelines](./design-guidelines.md) | UI/UX standards |
| [Project Overview](./project-overview-pdr.md) | Feature requirements |

---

## Core Documentation

### 1. Project Overview & Product Development Requirements (PDR)
**File:** `project-overview-pdr.md`
**Purpose:** Project vision, goals, and technical requirements

**Contains:**
- Project vision and problem statement
- Target users and use cases
- Phase-by-phase requirements (Phase 1-6)
- Detailed Phase 4 (Alert System) requirements
- Technical architecture overview
- Data models
- API contracts with examples
- Success metrics and KPIs
- Future roadmap and enhancements
- Changelog

**When to Use:**
- Understanding project requirements
- Planning new features
- Reviewing acceptance criteria
- Discussing roadmap with stakeholders

---

### 2. Codebase Summary
**File:** `codebase-summary.md`
**Purpose:** Complete overview of the codebase structure and modules

**Contains:**
- Repository structure and file organization
- Core modules documentation (7 modules):
  - Alerts Module
  - Authentication Module
  - Email Service
  - Metrics Module
  - Docker Module
  - PM2 Module
  - Users Module
- Frontend components breakdown
- Real-time architecture explanation
- Database schema overview
- API endpoints reference
- Development workflow
- Environment setup
- Technology stack summary
- Code complexity metrics

**When to Use:**
- Onboarding new developers
- Understanding module dependencies
- Finding specific features
- Code navigation and exploration

---

### 3. System Architecture
**File:** `system-architecture.md`
**Purpose:** Detailed technical architecture and system design

**Contains:**
- High-level architecture diagrams (ASCII and visual)
- Module architecture (7 modules in detail):
  - Architecture and data flow
  - Key components and methods
  - Database schemas
- Data flow diagrams:
  - Alert triggering flow
  - User request flow
  - Event flow
- Database relationships
- Performance considerations:
  - Metric collection optimization
  - Alert checking optimization
  - Database query optimization
  - Frontend optimization
- Security architecture
- Scalability architecture (current and future)
- Testing architecture
- Monitoring and observability
- Deployment patterns

**When to Use:**
- Understanding component interactions
- Designing new features
- Performance optimization
- Debugging complex issues
- Planning scalability improvements

---

### 4. Code Standards
**File:** `code-standards.md`
**Purpose:** Implementation guidelines and best practices

**Contains:**
- General principles (KISS, DRY, SOLID, Type Safety)
- Backend standards (NestJS):
  - File structure (7 sections)
  - Module, Service, Controller patterns
  - DTO and Entity patterns
  - Event-driven scheduler pattern
  - Error handling
- Frontend standards (Next.js/React):
  - File structure
  - Component, Hook, Page patterns
  - Styling patterns
- Database standards:
  - TypeORM conventions
  - Naming conventions
  - Column definitions
  - Indexing strategy
- API design standards:
  - Endpoint naming
  - Response formats
  - Pagination format
  - Error responses
- Testing standards
- Documentation standards
- Security standards
- Performance standards
- Code review checklist
- Anti-patterns reference
- Tool configurations

**When to Use:**
- Writing code
- Code reviews
- Setting up development environment
- Refactoring existing code
- Training new developers

---

### 5. Tech Stack
**File:** `tech-stack.md`
**Purpose:** Technology selection and feature checklist

**Contains:**
- Overview of tech stack
- Core stack table
- Key dependencies (Backend/Frontend)
- Architecture decisions (7 sections)
- Database schema overview
- Service ports
- Environment variables
- Development commands
- Implemented features checklist (with completion status)
- Development requirements

**When to Use:**
- Understanding technology choices
- Setting up development environment
- Checking feature implementation status
- Onboarding new team members
- Version compatibility checks

---

### 6. Design Guidelines
**File:** `design-guidelines.md`
**Purpose:** UI/UX standards and visual design system

**Contains:**
- Design philosophy and principles
- Color palette (dark mode)
  - Base colors
  - Text colors
  - Semantic colors
  - Accent colors
- Typography (fonts, sizes, weights)
- Spacing system (8px grid)
- Component styles:
  - Cards
  - Buttons
  - Inputs
  - Status indicators
  - Gauges
  - Tables
  - Navigation
- Layout patterns and responsive design
- Animation guidelines
- Icons and Lucide library
- Chart guidelines (Recharts)
- Accessibility standards
- Dark mode considerations
- Version history

**When to Use:**
- Designing new UI components
- Implementing frontend features
- Maintaining design consistency
- Creating new pages
- Accessibility compliance

---

## Alert System Documentation

The Alert System (Phase 4, v2.0.0) is fully documented across all documentation files:

### Overview
Alert system provides threshold-based notifications for system metrics:
- **Metrics:** CPU, RAM, Disk usage
- **Operators:** GT, GTE, LT, LTE, EQ, NE
- **Channels:** Email (SendGrid), Telegram
- **Features:** Cooldown, enable/disable, history tracking

### Key Documentation Sections

**Project Overview:**
- [Phase 4: Alert System Requirements](./project-overview-pdr.md#phase-4-alert-system-completed---dec-2025)
- API contracts and request/response formats
- Acceptance criteria and success metrics

**Architecture:**
- [Alert Module Architecture](./system-architecture.md#1-alerts-module)
- [Alert Trigger Flow Diagram](./system-architecture.md#alert-trigger-flow)
- Event-driven scheduler pattern
- Cooldown mechanism explanation

**Implementation:**
- [Code Standards - Backend](./code-standards.md#backend-standards-nestjs)
- [Code Standards - Frontend](./code-standards.md#frontend-standards-nextjs-react)
- Module patterns and naming conventions
- Error handling and validation

**Database:**
- [Alert Database Schema](./codebase-summary.md#alerts-module)
- Entity relationships
- Indexing strategy

---

## Navigation Guide

### By Feature
- **Real-time Metrics:** [System Architecture](./system-architecture.md#2-metrics-module) → [Tech Stack](./tech-stack.md#metrics-collection)
- **Docker Monitoring:** [System Architecture](./system-architecture.md#4-docker-module) → [Code Standards](./code-standards.md#backend-standards-nestjs)
- **PM2 Monitoring:** [System Architecture](./system-architecture.md#5-pm2-module) → [Tech Stack](./tech-stack.md)
- **Alert System:** [Project Overview](./project-overview-pdr.md#phase-4-alert-system-completed---dec-2025) → [System Architecture](./system-architecture.md#1-alerts-module) → [Code Standards](./code-standards.md)
- **Authentication:** [System Architecture](./system-architecture.md#6-authentication-module) → [Code Standards](./code-standards.md#security-standards)

### By Technology
- **NestJS Backend:** [Code Standards](./code-standards.md#backend-standards-nestjs) → [System Architecture](./system-architecture.md)
- **Next.js Frontend:** [Code Standards](./code-standards.md#frontend-standards-nextjs-react) → [Design Guidelines](./design-guidelines.md)
- **PostgreSQL:** [Codebase Summary](./codebase-summary.md#database-connections) → [Code Standards](./code-standards.md#database-standards)
- **Socket.IO:** [System Architecture](./system-architecture.md#real-time-architecture) → [Tech Stack](./tech-stack.md#2-real-time-architecture)

### By Task
- **Setting Up Development:** [Tech Stack](./tech-stack.md#development-commands) → [Code Standards](./code-standards.md)
- **Writing a New Module:** [Code Standards](./code-standards.md#module-pattern) → [System Architecture](./system-architecture.md)
- **Adding a Frontend Page:** [Code Standards](./code-standards.md#page-pattern) → [Design Guidelines](./design-guidelines.md)
- **Writing Tests:** [Code Standards](./code-standards.md#testing-standards) → [Project Overview](./project-overview-pdr.md)
- **Deploying to Production:** [Tech Stack](./tech-stack.md) → [System Architecture](./system-architecture.md#deployment-architecture)

---

## API Quick Reference

### Alert Endpoints

```
POST   /alerts/thresholds              Create threshold
GET    /alerts/thresholds              Get all thresholds
GET    /alerts/thresholds/:id          Get single threshold
PATCH  /alerts/thresholds/:id          Update threshold
DELETE /alerts/thresholds/:id          Delete threshold
GET    /alerts/logs?page=1&limit=10    Get paginated history
```

**Response Format (Pagination):**
```json
{
  "data": [{ /* items */ }],
  "total": 125,
  "page": 1,
  "limit": 10,
  "totalPages": 13
}
```

Full API reference: [Project Overview → API Contracts](./project-overview-pdr.md#api-contracts)

---

## Common Questions

### Q: Where do I find database schema?
A:
- Overview: [Codebase Summary](./codebase-summary.md#alert-system-database-schema)
- Detailed: [Project Overview](./project-overview-pdr.md#data-models)
- TypeORM: [Code Standards](./code-standards.md#database-entity-pattern)

### Q: What are the naming conventions?
A: [Code Standards → Naming Conventions](./code-standards.md#naming-conventions)

### Q: How does alert triggering work?
A:
- Overview: [Project Overview](./project-overview-pdr.md#4-alert-system-completed---dec-2025)
- Architecture: [System Architecture → Alert Module](./system-architecture.md#1-alerts-module)
- Flow Diagram: [System Architecture → Alert Trigger Flow](./system-architecture.md#alert-trigger-flow)

### Q: What are the API request/response formats?
A: [Project Overview → API Contracts](./project-overview-pdr.md#api-contracts)

### Q: How do I write code following project standards?
A: [Code Standards](./code-standards.md) - Complete guide with examples

### Q: What's the project roadmap?
A: [Project Overview & PDR](./project-overview-pdr.md) - Phases 1-6 documented

### Q: How to set up development environment?
A: [Tech Stack → Development Commands](./tech-stack.md#development-commands)

---

## Documentation Statistics

| Metric | Value |
|--------|-------|
| Total Documentation Files | 6 |
| Total Documentation Lines | ~15,000+ |
| Code Examples | 50+ |
| Diagrams | 3+ |
| Tables | 20+ |
| API Endpoints Documented | 40+ |
| Modules Documented | 7 |
| Features Documented | 12 |
| Code Coverage | 95%+ |

---

## Version History

### v2.0.0 (2025-12-24)
- **NEW:** Alert System documentation (comprehensive)
- **NEW:** System Architecture document
- **NEW:** Code Standards document
- **NEW:** Codebase Summary document (from repomix)
- **NEW:** Project Overview & PDR document
- **UPDATED:** Tech Stack with alert features
- **Total New Content:** ~12,000 lines

### v1.0.0 (2025-12-23)
- Initial documentation
- Design Guidelines
- Tech Stack (partial)

---

## Contributing to Documentation

### When to Update Documentation
- New feature implementation
- Architecture changes
- API modifications
- Bug fixes with documentation impact
- New patterns or conventions
- Version updates

### How to Update Documentation
1. Find relevant documentation file
2. Make changes locally
3. Verify links and cross-references
4. Commit with descriptive message
5. Include in PR description

### Documentation Standards
- Clear, concise technical writing
- Real code examples
- Cross-references between documents
- Tables for structured data
- ASCII diagrams where helpful
- Version control in changelogs

---

## Support & Feedback

### Questions?
1. Check relevant documentation file
2. Search across documentation
3. Check Code Standards for patterns
4. Review System Architecture for design

### Found an Issue?
1. Note the error or unclear section
2. Create an issue with context
3. Propose improvements
4. Update documentation accordingly

### Feedback?
- Is documentation missing something?
- Is something unclear?
- Need more code examples?
- Suggest improvements in PRs

---

## Related Files

- **Project Root:** `/Users/tuyencao/workspace/bimnext_monitor/README.md`
- **Implementation Plans:** `/Users/tuyencao/workspace/bimnext_monitor/plans/`
- **Codebase Snapshot:** `/Users/tuyencao/workspace/bimnext_monitor/repomix-output.xml`
- **Code:** `/Users/tuyencao/workspace/bimnext_monitor/apps/`

---

**Last Reviewed:** 2025-12-24
**Next Review:** 2026-01-07 (weekly)
**Maintenance Owner:** Documentation Team

For questions or updates, please refer to the relevant documentation file or contact the project team.

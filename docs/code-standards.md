# Code Standards & Implementation Guidelines

**Version:** 2.0.0
**Updated:** 2025-12-24
**Enforced:** Across all modules
**Tools:** ESLint, Prettier, TypeScript strict mode

---

## Table of Contents

1. [General Principles](#general-principles)
2. [Backend Standards (NestJS)](#backend-standards-nestjs)
3. [Frontend Standards (Next.js/React)](#frontend-standards-nextjs-react)
4. [Database Standards](#database-standards)
5. [API Design Standards](#api-design-standards)
6. [Testing Standards](#testing-standards)
7. [Documentation Standards](#documentation-standards)
8. [Error Handling](#error-handling)
9. [Security Standards](#security-standards)
10. [Performance Standards](#performance-standards)

---

## General Principles

### 1. KISS (Keep It Simple, Stupid)
- Prefer clarity over cleverness
- Avoid over-engineering solutions
- Break complex logic into smaller, testable units
- Use meaningful variable and function names

### 2. DRY (Don't Repeat Yourself)
- Extract common patterns into shared utilities
- Create reusable services and components
- Maintain single source of truth for data

### 3. SOLID Principles
- **S**ingle Responsibility: Each class/function has one reason to change
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Subtypes must be substitutable
- **I**nterface Segregation: Many client-specific interfaces better than one universal
- **D**ependency Inversion: Depend on abstractions, not concrete implementations

### 4. Type Safety First
- Use TypeScript strict mode (no `any`)
- Define explicit types for all function parameters and returns
- Use generics when appropriate
- Leverage type inference when obvious

---

## Backend Standards (NestJS)

### File Structure

```
src/modules/
├── feature-name/
│   ├── dto/                              # Data Transfer Objects
│   │   ├── create-feature.dto.ts
│   │   ├── update-feature.dto.ts
│   │   └── filter-feature.dto.ts
│   ├── entities/                         # Database entities
│   │   └── feature.entity.ts
│   ├── feature.service.ts                # Business logic
│   ├── feature.controller.ts             # HTTP handlers
│   ├── feature.module.ts                 # Module configuration
│   ├── feature.scheduler.ts              # Scheduled tasks (if needed)
│   └── spec/                             # Tests
│       ├── feature.service.spec.ts
│       └── feature.controller.spec.ts
```

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Classes | PascalCase | `AlertsService`, `AlertThreshold` |
| Methods | camelCase | `createThreshold()`, `findById()` |
| Variables | camelCase | `metricValue`, `isEnabled` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_ATTEMPTS`, `DEFAULT_TIMEOUT_MS` |
| Files | kebab-case | `alerts.service.ts`, `create-alert.dto.ts` |
| Folders | kebab-case | `alerts`, `docker`, `email` |
| Enums | PascalCase | `MetricName`, `DeliveryStatus` |

### Module Pattern

Every feature should follow the NestJS module pattern:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { AlertThreshold } from './entities/alert-threshold.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AlertThreshold]),
    // Import other dependencies
  ],
  controllers: [AlertsController],
  providers: [AlertsService, AlertsScheduler],
  exports: [AlertsService], // Export if used by other modules
})
export class AlertsModule {}
```

### Service Pattern

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectRepository(AlertThreshold)
    private readonly thresholdRepository: Repository<AlertThreshold>,
  ) {}

  async findAllThresholds(): Promise<AlertThreshold[]> {
    try {
      return await this.thresholdRepository.find({
        where: { isEnabled: true },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error('Failed to fetch thresholds', error);
      throw error;
    }
  }
}
```

**Key Patterns:**
- Use dependency injection via decorators
- Use TypeORM repositories for database access
- Always add logger for debugging
- Handle errors explicitly
- Return typed promises

### Controller Pattern

```typescript
import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CreateThresholdDto } from './dto/create-threshold.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post('thresholds')
  async createThreshold(
    @Body() createDto: CreateThresholdDto,
    @Req() request: any,
  ) {
    const userId = request.user.id;
    return this.alertsService.createThreshold(createDto, userId);
  }
}
```

**Key Patterns:**
- One route per method
- Use DTOs for request validation
- Add guards for protected routes
- Use decorators for parameter extraction
- Keep controllers thin (delegate to services)

### DTO Pattern

```typescript
import { IsEnum, IsNumber, IsArray, Min, Max, IsNotEmpty } from 'class-validator';

export class CreateThresholdDto {
  @IsEnum(MetricName)
  @IsNotEmpty()
  metricName: MetricName;

  @IsEnum(Operator)
  @IsNotEmpty()
  operator: Operator;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsNotEmpty()
  value: number;

  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels: NotificationChannel[];

  @IsNumber()
  @Min(0)
  cooldownMs: number = 300000;
}
```

**Key Patterns:**
- Use class-validator decorators
- Define all fields as required
- Use enums for fixed values
- Document field constraints
- Provide sensible defaults

### Event-Driven Pattern (for Schedulers)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class AlertsScheduler {
  private readonly logger = new Logger(AlertsScheduler.name);

  @OnEvent('metrics.updated')
  async handleMetricsUpdate(metrics: SystemMetrics) {
    try {
      // Process event
      this.logger.log('Processing metrics update');
    } catch (error) {
      this.logger.error('Failed to process metrics', error);
    }
  }
}
```

**Key Patterns:**
- Use `@OnEvent()` decorator for event listeners
- Always add error handling
- Log significant events
- Keep handlers focused on single responsibility

### Database Entity Pattern

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

@Entity()
export class AlertThreshold {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'enum', enum: MetricName })
  metricName: MetricName;

  @Column({ type: 'varchar', length: 10 })
  operator: string;

  @Column('numeric', { precision: 5, scale: 2 })
  value: number;

  @Column('text', { array: true })
  channels: string[];

  @Column('integer')
  cooldownMs: number;

  @Column('boolean', { default: true })
  isEnabled: boolean;

  @Column('timestamp', { nullable: true })
  lastTriggeredAt: Date;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
```

**Key Patterns:**
- Use TypeORM decorators
- Define column types explicitly
- Add default values where appropriate
- Include timestamps (createdAt, updatedAt)
- Use UUID for primary keys

### Error Handling Pattern

```typescript
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';

@Injectable()
export class AlertsService {
  async updateThreshold(id: string, updateDto: UpdateThresholdDto) {
    const threshold = await this.thresholdRepository.findOne({ where: { id } });

    if (!threshold) {
      throw new NotFoundException(`Threshold with ID ${id} not found`);
    }

    if (updateDto.value < 0 || updateDto.value > 100) {
      throw new BadRequestException('Value must be between 0 and 100');
    }

    // Update logic
  }
}
```

**Key Patterns:**
- Use NestJS HTTP exceptions
- Include descriptive error messages
- Return appropriate HTTP status codes
- Validate input before processing

---

## Frontend Standards (Next.js/React)

### File Structure

```
src/
├── app/                          # Next.js app router
│   ├── alerts/
│   │   └── page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/                   # Reusable components
│   ├── ui/                       # shadcn/ui components
│   ├── alert-form.tsx
│   ├── threshold-modal.tsx
│   └── index.ts                  # Barrel exports
├── contexts/                     # React contexts
│   └── auth-context.tsx
├── hooks/                        # Custom hooks
│   ├── use-alerts.ts
│   └── use-socket.ts
├── lib/                          # Utilities
│   ├── api-client.ts
│   └── utils.ts
├── types/                        # TypeScript types
│   └── index.ts
└── styles/                       # Global styles
    └── globals.css
```

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Components | PascalCase | `AlertForm`, `ThresholdModal` |
| Pages | kebab-case folders | `alerts/page.tsx`, `containers/page.tsx` |
| Hooks | camelCase with `use` prefix | `useAlerts()`, `useSocket()` |
| Utilities | camelCase | `formatTimestamp()`, `parseMetricValue()` |
| Types | PascalCase | `AlertThreshold`, `ThresholdResponse` |
| Constants | UPPER_SNAKE_CASE | `API_BASE_URL`, `PAGINATION_LIMIT` |

### Component Pattern

```typescript
'use client'; // Mark as client component if using hooks

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface AlertFormProps {
  onSubmit: (data: ThresholdData) => Promise<void>;
  isLoading?: boolean;
}

export function AlertForm({ onSubmit, isLoading = false }: AlertFormProps) {
  const [formData, setFormData] = useState<ThresholdData>({
    metricName: 'CPU',
    operator: 'GT',
    value: 80,
    channels: ['Email'],
    cooldownMs: 300000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Form fields */}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Threshold'}
      </Button>
    </form>
  );
}
```

**Key Patterns:**
- Mark client components with `'use client'`
- Define component props interfaces
- Provide meaningful default values
- Use descriptive event handlers
- Keep components focused on UI logic

### Hook Pattern

```typescript
import { useCallback, useState, useEffect } from 'react';

export function useAlerts() {
  const [thresholds, setThresholds] = useState<AlertThreshold[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchThresholds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/alerts/thresholds');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setThresholds(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThresholds();
  }, [fetchThresholds]);

  return { thresholds, loading, error, refetch: fetchThresholds };
}
```

**Key Patterns:**
- Use `useCallback` for memoized functions
- Separate concerns (loading, error, data)
- Return functions for imperative operations
- Handle errors gracefully
- Clean up subscriptions in useEffect

### Page Pattern

```typescript
'use client';

import { Suspense } from 'react';
import { AlertForm } from '@/components/alert-form';
import { AlertsList } from '@/components/alerts-list';
import { useAlerts } from '@/hooks/use-alerts';

export default function AlertsPage() {
  const { thresholds, loading, error, refetch } = useAlerts();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Alerts</h1>

      <AlertForm onSubmit={async () => refetch()} />

      {error && <div className="text-red-500">{error}</div>}

      <Suspense fallback={<div>Loading...</div>}>
        <AlertsList thresholds={thresholds} loading={loading} />
      </Suspense>
    </div>
  );
}
```

**Key Patterns:**
- Use Suspense for async components
- Handle loading and error states
- Fetch data at appropriate levels
- Pass callbacks for data mutations
- Keep pages as thin orchestration layers

### Styling Pattern

```typescript
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-lg font-medium transition-colors',
        variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
        variant === 'secondary' && 'bg-zinc-800 text-white hover:bg-zinc-700',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-4 py-2',
        size === 'lg' && 'px-6 py-3 text-lg',
        className,
      )}
      {...props}
    />
  );
}
```

**Key Patterns:**
- Use Tailwind CSS utility classes
- Use `cn()` utility for conditional classes
- Support polymorphic variants
- Accept additional className overrides
- Keep styles maintainable and predictable

---

## Database Standards

### TypeORM Conventions

**Naming:**
- Table names: snake_case (e.g., `alert_threshold`, `alert_log`)
- Column names: snake_case (e.g., `metric_name`, `is_enabled`)
- Primary keys: `id` (UUID)
- Foreign keys: `{table}_id` (e.g., `user_id`, `threshold_id`)
- Timestamps: `createdAt`, `updatedAt` (camelCase in code, snake_case in DB)

**Columns:**
```typescript
@Column('uuid')
id: string;

@Column({ type: 'varchar', length: 100, nullable: false })
email: string;

@Column({ type: 'enum', enum: UserRole, default: UserRole.VIEWER })
role: UserRole;

@Column({ type: 'numeric', precision: 5, scale: 2 })
value: number;

@Column('text', { array: true })
channels: string[];

@Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
createdAt: Date;

@Column('timestamp', {
  default: () => 'CURRENT_TIMESTAMP',
  onUpdate: 'CURRENT_TIMESTAMP'
})
updatedAt: Date;

@Column('timestamp', { nullable: true })
deletedAt: Date; // For soft deletes
```

**Indexing:**
```typescript
@Entity()
export class AlertThreshold {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @Index()
  @Column('boolean')
  isEnabled: boolean;

  @Index()
  @Column('timestamp')
  createdAt: Date;
}
```

---

## API Design Standards

### Endpoint Naming

| Resource | Method | Endpoint | Purpose |
|----------|--------|----------|---------|
| Threshold | GET | `/alerts/thresholds` | List all |
| Threshold | GET | `/alerts/thresholds/:id` | Get one |
| Threshold | POST | `/alerts/thresholds` | Create |
| Threshold | PATCH | `/alerts/thresholds/:id` | Update |
| Threshold | DELETE | `/alerts/thresholds/:id` | Delete |
| Alert Log | GET | `/alerts/logs?page=1&limit=10` | Paginated history |

**Conventions:**
- Use plural nouns for collections (`/alerts`, `/thresholds`)
- Use singular for actions (`/login`, `/logout`)
- Use query params for filtering/pagination
- Use path params for resource identification
- HTTP methods indicate operation type

### Response Format

**Success Response (200 OK):**
```json
{
  "id": "uuid",
  "metricName": "CPU",
  "operator": "GT",
  "value": 80,
  "channels": ["Email"],
  "cooldownMs": 300000,
  "isEnabled": true,
  "lastTriggeredAt": "2025-12-24T10:30:00Z",
  "createdAt": "2025-12-24T09:00:00Z",
  "updatedAt": "2025-12-24T10:15:00Z"
}
```

**Paginated Response:**
```json
{
  "data": [{ /* item */ }],
  "total": 125,
  "page": 1,
  "limit": 10,
  "totalPages": 13
}
```

**Error Response:**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "value",
      "message": "Value must be between 0 and 100"
    }
  ]
}
```

---

## Testing Standards

### Test File Location
- Backend: `spec/` folder within module
- Frontend: `__tests__/` folder alongside component

### Test File Naming
- Backend: `{name}.service.spec.ts`, `{name}.controller.spec.ts`
- Frontend: `{name}.test.ts`, `{name}.test.tsx`

### Test Structure

```typescript
describe('AlertsService', () => {
  let service: AlertsService;
  let repository: Repository<AlertThreshold>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: getRepositoryToken(AlertThreshold),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    repository = module.get<Repository<AlertThreshold>>(
      getRepositoryToken(AlertThreshold),
    );
  });

  describe('findAllThresholds', () => {
    it('should return all enabled thresholds', async () => {
      // Arrange
      const mockThresholds = [
        { id: '1', isEnabled: true },
      ];
      jest.spyOn(repository, 'find').mockResolvedValue(mockThresholds);

      // Act
      const result = await service.findAllThresholds();

      // Assert
      expect(result).toEqual(mockThresholds);
      expect(repository.find).toHaveBeenCalledWith({
        where: { isEnabled: true },
      });
    });
  });
});
```

**Key Patterns:**
- Use Arrange-Act-Assert pattern
- Mock external dependencies
- Test one behavior per test
- Use descriptive test names
- Keep tests focused and isolated

---

## Documentation Standards

### Code Comments

**Good Comments:**
```typescript
// Check if cooldown period has elapsed since last trigger
const timeSinceLastTrigger = Date.now() - lastTriggeredAt.getTime();
const canSend = timeSinceLastTrigger > threshold.cooldownMs;
```

**Avoid:**
```typescript
// Set canSend to true if time elapsed
const canSend = Date.now() - lastTriggeredAt.getTime() > threshold.cooldownMs;
```

### Function Documentation

```typescript
/**
 * Check if alert can be sent based on cooldown period.
 *
 * @param thresholdId - The ID of the threshold to check
 * @returns Promise<boolean> - True if cooldown has elapsed
 * @throws {NotFoundException} - If threshold not found
 *
 * @example
 * const canSend = await alertsService.canSendAlert('threshold-id');
 */
async canSendAlert(thresholdId: string): Promise<boolean> {
  // Implementation
}
```

### README in Each Module

```markdown
# Alerts Module

Brief description of what this module does.

## Overview

What is this module responsible for?

## Features

- Feature 1
- Feature 2

## Key Entities

- AlertThreshold - Stores alert configuration
- AlertLog - Records alert history

## Key Services

- AlertsService - CRUD operations and cooldown logic
- AlertsScheduler - Event-driven threshold checking

## API Endpoints

- POST /alerts/thresholds
- GET /alerts/thresholds
- etc.

## Example Usage

```typescript
// Create a threshold
const threshold = await alertsService.createThreshold({
  metricName: 'CPU',
  operator: 'GT',
  value: 80,
  channels: ['Email'],
  cooldownMs: 300000,
});
```

## See Also

- [System Architecture](../docs/system-architecture.md)
```

---

## Error Handling

### NestJS Exception Filters

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, BadRequestException } from '@nestjs/common';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();
    const message = exception.getResponse();

    response.status(status).json({
      statusCode: status,
      message: 'Validation failed',
      errors: message,
    });
  }
}
```

### Frontend Error Handling

```typescript
async function fetchThresholds() {
  try {
    const response = await fetch('/api/alerts/thresholds');
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch');
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching thresholds:', error);
    toast.error(error instanceof Error ? error.message : 'Unknown error');
  }
}
```

---

## Security Standards

### Input Validation

```typescript
// DTO-based validation
@IsNumber()
@Min(0)
@Max(100)
@IsNotEmpty()
value: number;

// Backend validation
if (value < 0 || value > 100) {
  throw new BadRequestException('Value must be between 0 and 100');
}
```

### Authentication & Authorization

```typescript
@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  @Delete(':id')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  async deleteThreshold(@Param('id') id: string) {
    // Only admins can delete
  }
}
```

### Password Security

```typescript
// Hashing passwords
const passwordHash = await bcrypt.hash(password, 10);

// Verifying passwords
const isValid = await bcrypt.compare(password, user.passwordHash);
```

---

## Performance Standards

### Database Query Optimization

```typescript
// ✓ Good: Use indices and eager loading
const thresholds = await this.thresholdRepository.find({
  relations: ['user'],  // Eager load related data
  where: { isEnabled: true },
  order: { createdAt: 'DESC' },
  take: 10,
});

// ✗ Bad: N+1 queries
const thresholds = await this.thresholdRepository.find();
thresholds.map(t => t.user); // Additional queries
```

### Frontend Performance

```typescript
// ✓ Use React Query for caching
const { data, isLoading } = useQuery({
  queryKey: ['thresholds'],
  queryFn: fetchThresholds,
  staleTime: 5 * 60 * 1000, // Cache for 5 minutes
});

// ✓ Memoize expensive calculations
const memoizedValue = useMemo(() => expensiveCalculation(), [dependency]);

// ✓ Lazy load components
const AlertForm = dynamic(() => import('@/components/alert-form'));
```

### Caching Strategy

```typescript
// In-memory cache for frequently accessed data
@Injectable()
export class CacheService {
  private cache = new Map<string, any>();

  get<T>(key: string): T | null {
    return this.cache.get(key) ?? null;
  }

  set<T>(key: string, value: T, ttl: number): void {
    this.cache.set(key, value);
    setTimeout(() => this.cache.delete(key), ttl);
  }
}
```

---

## Code Review Checklist

- [ ] Code follows naming conventions
- [ ] Functions have clear purposes (single responsibility)
- [ ] Error handling is comprehensive
- [ ] Input validation is present
- [ ] Tests exist and pass
- [ ] Documentation is clear and complete
- [ ] No TypeScript errors (strict mode)
- [ ] No console.logs in production code
- [ ] No hardcoded secrets or API keys
- [ ] Performance implications considered
- [ ] Security implications reviewed
- [ ] Database queries are optimized

---

## Common Anti-Patterns to Avoid

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Using `any` | Loses type safety | Use proper types or generics |
| `try-catch` without logging | Hard to debug | Always log errors |
| Mixing concerns | Hard to test | Separate business logic from UI |
| Repeating code | Maintenance burden | Extract to utilities/services |
| Large functions | Hard to understand | Keep functions focused (< 20 lines) |
| Hardcoded values | Not flexible | Use environment variables/constants |
| Not validating input | Security risk | Validate all user input |
| Missing error messages | Poor UX | Provide meaningful feedback |

---

## Tools & Configuration

### ESLint
```json
{
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "off",
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

### Prettier
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

### TypeScript
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  }
}
```

---

## Continuous Improvement

- **Code reviews:** Every PR must be reviewed before merge
- **Testing:** Aim for >80% code coverage
- **Documentation:** Update docs with every feature
- **Refactoring:** Regularly improve code quality
- **Performance monitoring:** Track metrics over time

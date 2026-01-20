# FluidCalendar Version 2.0 - Comprehensive Improvement Plan

> **Document Purpose**: This document outlines a comprehensive improvement plan for FluidCalendar v2.0, based on deep analysis of the current codebase architecture, patterns, and implementation details.
>
> **Analysis Date**: December 2025
> **Current Version**: 0.1.0
> **Target Version**: 2.0.0

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Improvements](#2-architecture-improvements)
3. [API Layer Enhancements](#3-api-layer-enhancements)
4. [Task Scheduling Engine v2](#4-task-scheduling-engine-v2)
5. [Calendar Integration Improvements](#5-calendar-integration-improvements)
6. [State Management Refactoring](#6-state-management-refactoring)
7. [Database Schema Evolution](#7-database-schema-evolution)
8. [UI/UX Enhancements](#8-uiux-enhancements)
9. [Security Hardening](#9-security-hardening)
10. [Testing Infrastructure](#10-testing-infrastructure)
11. [Performance Optimization](#11-performance-optimization)
12. [Developer Experience](#12-developer-experience)
13. [Implementation Roadmap](#13-implementation-roadmap)
14. [Breaking Changes & Migration](#14-breaking-changes--migration)

---

## 1. Executive Summary

### Current State Assessment

FluidCalendar is a well-architected full-stack SaaS application with:

| Aspect | Current Score | Target Score |
|--------|--------------|--------------|
| Code Quality | 9/10 | 9.5/10 |
| Architecture | 8/10 | 9/10 |
| Test Coverage | 2/10 | 8/10 |
| Security | 6/10 | 9/10 |
| Performance | 7/10 | 9/10 |
| Documentation | 4/10 | 8/10 |
| Accessibility | 6/10 | 8/10 |

### Key Strengths to Preserve
- Excellent TypeScript strict mode enforcement
- Clean dual-version architecture (SaaS/Open-source)
- Robust multi-provider calendar integration
- Well-designed webhook-first subscription architecture
- Comprehensive task scheduling algorithm with 7-factor scoring

### Critical Areas for v2
1. **Security**: Remove hardcoded secrets, add rate limiting, implement input validation
2. **Testing**: Increase coverage from ~1% to 80%+
3. **API Consistency**: Standardize error responses and authentication patterns
4. **Performance**: Optimize database queries and implement proper caching
5. **State Management**: Consolidate Zustand/React Query hybrid approach

---

## 2. Architecture Improvements

### 2.1 Modular Domain Architecture

**Current**: Feature folders mixed with technical concerns
**Proposed**: Domain-driven design with clear boundaries

```
src/
├── domains/                      # Business domains
│   ├── calendar/
│   │   ├── api/                  # API routes
│   │   ├── components/           # UI components
│   │   ├── hooks/                # Custom hooks
│   │   ├── services/             # Business logic
│   │   ├── stores/               # State management
│   │   ├── types/                # TypeScript types
│   │   └── __tests__/            # Domain tests
│   ├── tasks/
│   ├── scheduling/
│   ├── subscription/
│   └── auth/
├── shared/                       # Cross-cutting concerns
│   ├── components/ui/            # Base UI components
│   ├── lib/                      # Utilities
│   ├── hooks/                    # Shared hooks
│   └── types/                    # Shared types
└── infrastructure/               # Technical infrastructure
    ├── database/
    ├── cache/
    ├── queue/
    └── logging/
```

### 2.2 Service Layer Pattern

**Current**: Business logic scattered in API routes
**Proposed**: Dedicated service layer with dependency injection

```typescript
// src/domains/tasks/services/TaskService.ts
export class TaskService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly scheduler: SchedulingService,
    private readonly syncManager: TaskSyncManager,
    private readonly eventBus: EventBus
  ) {}

  async createTask(userId: string, data: CreateTaskInput): Promise<Task> {
    const task = await this.prisma.task.create({...});
    await this.eventBus.publish('task.created', { task, userId });
    return task;
  }
}

// Dependency injection container
export const container = new Container();
container.register('taskService', TaskService);
```

### 2.3 Event-Driven Architecture

**Proposed**: Implement event bus for cross-domain communication

```typescript
// Event types
type DomainEvent =
  | { type: 'task.created'; payload: { task: Task; userId: string } }
  | { type: 'task.scheduled'; payload: { taskId: string; slot: TimeSlot } }
  | { type: 'calendar.synced'; payload: { feedId: string; eventCount: number } }
  | { type: 'subscription.changed'; payload: { userId: string; plan: Plan } };

// Event bus implementation
class EventBus {
  private subscribers: Map<string, EventHandler[]> = new Map();

  subscribe<T extends DomainEvent['type']>(
    eventType: T,
    handler: (event: Extract<DomainEvent, { type: T }>) => Promise<void>
  ): void;

  async publish(event: DomainEvent): Promise<void>;
}
```

### 2.4 API Gateway Pattern

**Proposed**: Centralized API middleware for cross-cutting concerns

```typescript
// src/infrastructure/api/middleware.ts
export const apiMiddleware = compose([
  withRequestId(),           // Add correlation ID
  withRateLimit(),           // Rate limiting
  withAuth(),                // Authentication
  withValidation(),          // Input validation
  withErrorHandling(),       // Standardized errors
  withAuditLog(),            // Audit logging
  withMetrics(),             // Performance metrics
]);

// Usage in API routes
export const POST = apiMiddleware(async (req, ctx) => {
  // ctx includes userId, requestId, validated body
});
```

---

## 3. API Layer Enhancements

### 3.1 Standardized Error Responses

**Current Issue**: Mix of text and JSON error responses across 64 endpoints

**Proposed Standard**:

```typescript
// src/shared/lib/api-response.ts
interface ApiError {
  error: string;           // Human-readable message
  code: string;            // Machine-readable error code
  details?: unknown;       // Additional context (validation errors, etc.)
  requestId?: string;      // For debugging/support
}

interface ApiSuccess<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

// Error code catalog
enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SYNC_CONFLICT = 'SYNC_CONFLICT',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
}

// Helper functions
export function successResponse<T>(data: T, meta?: object): NextResponse;
export function errorResponse(code: ErrorCode, message: string, details?: unknown): NextResponse;
```

### 3.2 Input Validation Layer

**Current Issue**: Inconsistent validation, some endpoints have none

**Proposed**: Zod schemas for all API inputs

```typescript
// src/domains/tasks/api/schemas.ts
import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  dueDate: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  duration: z.number().int().min(5).max(480).optional(), // 5 min to 8 hours
  priority: z.enum(['high', 'medium', 'low', 'none']).optional(),
  energyLevel: z.enum(['high', 'medium', 'low']).optional(),
  preferredTime: z.enum(['morning', 'afternoon', 'evening']).optional(),
  projectId: z.string().uuid().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  isAutoScheduled: z.boolean().optional(),
  recurrenceRule: z.string().max(1000).optional().refine(
    (val) => !val || isValidRRule(val),
    { message: 'Invalid recurrence rule format' }
  ),
});

export const updateTaskSchema = createTaskSchema.partial();

export const taskQuerySchema = z.object({
  status: z.array(z.enum(['todo', 'in_progress', 'completed'])).optional(),
  projectId: z.string().uuid().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.enum(['dueDate', 'priority', 'createdAt', 'scheduledStart']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});
```

### 3.3 Rate Limiting

**Current Issue**: No rate limiting on any endpoints

**Proposed Implementation**:

```typescript
// src/infrastructure/rate-limit/index.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Different limits by endpoint category
export const rateLimits = {
  auth: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, '5 m'),  // 5 requests per 5 minutes
    prefix: 'ratelimit:auth',
  }),

  api: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
    prefix: 'ratelimit:api',
  }),

  scheduling: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '1 m'),  // 10 schedule-all per minute
    prefix: 'ratelimit:scheduling',
  }),

  sync: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(20, '1 m'),  // 20 sync operations per minute
    prefix: 'ratelimit:sync',
  }),
};

// Middleware
export async function withRateLimit(
  category: keyof typeof rateLimits,
  identifier: string
): Promise<{ success: boolean; reset: number }>;
```

### 3.4 API Versioning Strategy

**Proposed**: URL-based versioning for major changes

```
/api/v1/tasks          # Current API (deprecated in v2)
/api/v2/tasks          # New API with breaking changes

# Header for minor version negotiation
Accept-Version: 2.1
```

### 3.5 Pagination & Cursor-Based Navigation

**Current Issue**: No pagination on list endpoints

**Proposed**:

```typescript
// Cursor-based pagination for large datasets
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    nextCursor?: string;
    prevCursor?: string;
    total?: number;
  };
}

// Query parameters
interface PaginationParams {
  cursor?: string;      // Opaque cursor
  limit?: number;       // Items per page (default: 50, max: 100)
  direction?: 'forward' | 'backward';
}
```

---

## 4. Task Scheduling Engine v2

### 4.1 Current Scoring Algorithm Analysis

The current 7-factor scoring system:

| Factor | Weight | Purpose |
|--------|--------|---------|
| Deadline Proximity | 3.0 | Prioritize approaching deadlines |
| Priority Score | 1.8 | Respect user priority settings |
| Energy Level Match | 1.5 | Match task energy to time-of-day |
| Time Preference | 1.2 | Honor morning/afternoon/evening preferences |
| Work Hour Alignment | 1.0 | Stay within work hours |
| Buffer Adequacy | 0.8 | Ensure breaks between tasks |
| Project Proximity | 0.5 | Group related tasks |

### 4.2 Proposed Algorithm Improvements

#### 4.2.1 Machine Learning Integration

```typescript
// src/domains/scheduling/ml/scheduler-ml.ts
interface MLSchedulerConfig {
  // User behavior learning
  historicalTaskCompletions: TaskCompletion[];
  preferredSchedulingPatterns: SchedulingPattern[];

  // Contextual factors
  weatherData?: WeatherForecast;       // Outdoor task scheduling
  focusTimePredictor?: FocusPredictor; // Based on meeting density
}

class MLEnhancedScheduler {
  // Learn from user behavior
  async trainUserModel(userId: string): Promise<UserSchedulingModel>;

  // Predict optimal time slots
  async predictOptimalSlots(
    task: Task,
    userModel: UserSchedulingModel
  ): Promise<ScoredSlot[]>;

  // Continuous improvement
  async recordOutcome(
    taskId: string,
    scheduledSlot: TimeSlot,
    actualCompletion: CompletionData
  ): void;
}
```

#### 4.2.2 Enhanced Scoring Factors

```typescript
// New factors for v2
interface EnhancedSlotScore extends SlotScore {
  factors: {
    // Existing factors...

    // New factors
    meetingDensity: number;      // Avoid heavy meeting days for deep work
    focusBlockSize: number;      // Prefer larger contiguous blocks
    contextSwitching: number;    // Minimize project switches
    historicalSuccess: number;   // Based on past completion at similar times
    deadlineBuffer: number;      // Leave time before hard deadlines
    dependencyChain: number;     // Schedule blockers first
  };
}
```

#### 4.2.3 Dependency-Aware Scheduling

```typescript
// Task dependencies
interface TaskDependency {
  taskId: string;
  dependsOn: string[];      // Must complete before this task
  blockedBy?: string[];     // Cannot start until these complete
}

// Topological sort for scheduling order
class DependencyAwareScheduler {
  scheduleWithDependencies(
    tasks: TaskWithDependencies[],
    constraints: SchedulingConstraints
  ): ScheduledTask[];
}
```

### 4.3 Real-Time Rescheduling

**Current Issue**: Scheduling is batch operation only

**Proposed**: Event-driven real-time adjustments

```typescript
// Trigger rescheduling on relevant events
class RealtimeScheduler {
  // Event handlers
  onCalendarEventCreated(event: CalendarEvent): void;
  onCalendarEventDeleted(event: CalendarEvent): void;
  onTaskCompleted(task: Task): void;
  onTaskDeferred(task: Task): void;
  onMeetingAccepted(meeting: Meeting): void;

  // Smart rescheduling
  async rescheduleAffectedTasks(
    affectedTimeRange: DateRange,
    reason: RescheduleReason
  ): Promise<ReschedulingResult>;
}
```

### 4.4 Scheduling Constraints v2

```typescript
// Extended constraints
interface SchedulingConstraintsV2 {
  // Existing
  workDays: number[];
  workHourStart: number;
  workHourEnd: number;
  bufferMinutes: number;

  // New in v2
  focusBlocks: FocusBlock[];           // Protected deep work time
  meetingFreeTime: TimeRange[];        // No-meeting zones
  maxTasksPerDay: number;              // Prevent overloading
  maxScheduledHours: number;           // Daily limit
  breakSchedule: BreakSchedule;        // Enforce breaks
  travelTime: TravelTimeConfig;        // Between locations

  // Smart defaults
  respectExistingSchedule: boolean;    // Don't move locked tasks
  allowWeekends: boolean;              // Weekend scheduling
  respectTimezones: boolean;           // For distributed teams
}
```

### 4.5 Multi-Calendar Conflict Resolution

```typescript
// Advanced conflict handling
class ConflictResolver {
  // Conflict types
  detectConflicts(slot: TimeSlot): Conflict[];

  // Resolution strategies
  resolveConflict(
    conflict: Conflict,
    strategy: ConflictStrategy
  ): Resolution;
}

type ConflictStrategy =
  | 'move_task'           // Move the task to next available slot
  | 'split_task'          // Split task around conflict
  | 'suggest_reschedule'  // Suggest rescheduling the meeting
  | 'override'            // User explicitly overrides
  | 'double_book';        // Allow concurrent scheduling (rare)
```

---

## 5. Calendar Integration Improvements

### 5.1 Webhook Implementation (Google Calendar)

**Current**: Webhook fields exist but not implemented
**Proposed**: Full webhook integration

```typescript
// src/domains/calendar/webhooks/google-webhook.ts
export class GoogleCalendarWebhook {
  // Register for push notifications
  async subscribe(
    calendarId: string,
    webhookUrl: string
  ): Promise<WebhookSubscription>;

  // Handle incoming notifications
  async handleNotification(
    headers: WebhookHeaders,
    body: WebhookBody
  ): Promise<void>;

  // Renew before expiration (7 days default)
  async renewSubscription(channelId: string): Promise<void>;

  // Cleanup on disconnect
  async unsubscribe(channelId: string): Promise<void>;
}

// Webhook endpoint
// POST /api/webhooks/google-calendar
export async function POST(req: Request) {
  const channelId = req.headers.get('X-Goog-Channel-ID');
  const resourceId = req.headers.get('X-Goog-Resource-ID');
  const resourceState = req.headers.get('X-Goog-Resource-State');

  if (resourceState === 'sync') {
    // Initial sync confirmation
    return new Response(null, { status: 200 });
  }

  // Process calendar change
  await googleWebhook.handleNotification({ channelId, resourceId, resourceState });
  return new Response(null, { status: 200 });
}
```

### 5.2 Unified Calendar Provider Interface

**Proposed**: Abstract provider differences

```typescript
// src/domains/calendar/providers/CalendarProvider.ts
interface CalendarProvider {
  // Authentication
  connect(credentials: ProviderCredentials): Promise<Connection>;
  disconnect(accountId: string): Promise<void>;
  refreshToken(accountId: string): Promise<TokenSet>;

  // Calendar operations
  listCalendars(accountId: string): Promise<Calendar[]>;
  getCalendar(accountId: string, calendarId: string): Promise<Calendar>;

  // Event operations
  listEvents(accountId: string, calendarId: string, params: EventQuery): Promise<CalendarEvent[]>;
  createEvent(accountId: string, calendarId: string, event: CreateEventInput): Promise<CalendarEvent>;
  updateEvent(accountId: string, calendarId: string, eventId: string, event: UpdateEventInput): Promise<CalendarEvent>;
  deleteEvent(accountId: string, calendarId: string, eventId: string, mode: DeleteMode): Promise<void>;

  // Sync operations
  syncEvents(accountId: string, calendarId: string, syncToken?: string): Promise<SyncResult>;

  // Webhook operations (optional)
  subscribeToChanges?(accountId: string, calendarId: string, webhookUrl: string): Promise<Subscription>;
  unsubscribeFromChanges?(subscriptionId: string): Promise<void>;
}

// Provider implementations
class GoogleCalendarProvider implements CalendarProvider { /* ... */ }
class OutlookCalendarProvider implements CalendarProvider { /* ... */ }
class CalDAVProvider implements CalendarProvider { /* ... */ }

// Factory
class CalendarProviderFactory {
  getProvider(type: ProviderType): CalendarProvider;
}
```

### 5.3 Incremental Sync Optimization

**Current Issue**: Google Calendar does full sync each time

**Proposed**: Delta sync for all providers

```typescript
// src/domains/calendar/sync/DeltaSyncManager.ts
class DeltaSyncManager {
  // Track sync state
  private syncState: Map<string, SyncState>;

  // Incremental sync
  async sync(feedId: string): Promise<SyncResult> {
    const state = this.syncState.get(feedId);

    if (state?.syncToken) {
      // Incremental sync
      return this.incrementalSync(feedId, state.syncToken);
    } else {
      // Full sync
      return this.fullSync(feedId);
    }
  }

  // Handle sync conflicts
  async resolveConflict(
    localEvent: CalendarEvent,
    remoteEvent: CalendarEvent
  ): Promise<CalendarEvent>;
}
```

### 5.4 CalDAV Improvements

```typescript
// Enhanced CalDAV support
interface CalDAVEnhancements {
  // CTag-based change detection
  detectChanges(calendarPath: string): Promise<ChangeSet>;

  // PROPFIND optimizations
  batchFetchEvents(eventPaths: string[]): Promise<CalendarEvent[]>;

  // Free/busy support
  getFreeBusy(attendees: string[], range: DateRange): Promise<FreeBusyResult>;

  // Scheduling inbox
  processSchedulingRequests(): Promise<SchedulingRequest[]>;
}
```

### 5.5 Calendar Availability API

**New Feature**: Expose availability for external integrations

```typescript
// GET /api/v2/availability
interface AvailabilityQuery {
  dateRange: DateRange;
  duration: number;          // Requested duration in minutes
  calendars?: string[];      // Specific calendars (default: all)
  bufferBefore?: number;     // Buffer before slots
  bufferAfter?: number;      // Buffer after slots
  workHoursOnly?: boolean;   // Only within work hours
}

interface AvailabilitySlot {
  start: string;             // ISO datetime
  end: string;
  score?: number;            // Quality score for the slot
}

// Shareable availability link
// GET /api/v2/availability/share/:token
```

---

## 6. State Management Refactoring

### 6.1 Current State Analysis

**Issues Identified**:
- Hybrid Zustand + React Query approach creates confusion
- 12 Zustand stores with varying patterns
- Fire-and-forget updates in settings (no error recovery)
- SSE implementation using global `window` object
- No centralized cache invalidation

### 6.2 Proposed Architecture

```typescript
// Option A: Full React Query Migration
// src/shared/lib/query-client.ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // 5 minutes
      gcTime: 1000 * 60 * 30,        // 30 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error?.status === 401) return false;
        return failureCount < 3;
      },
    },
  },
});

// Query key factory (type-safe)
export const queryKeys = {
  tasks: {
    all: ['tasks'] as const,
    list: (filters: TaskFilters) => ['tasks', 'list', filters] as const,
    detail: (id: string) => ['tasks', 'detail', id] as const,
  },
  calendar: {
    feeds: ['calendar', 'feeds'] as const,
    events: (feedId: string, range: DateRange) => ['calendar', 'events', feedId, range] as const,
  },
  // ... other domains
};
```

### 6.3 Server State vs UI State Separation

```typescript
// Server state: React Query
const { data: tasks } = useQuery({
  queryKey: queryKeys.tasks.list(filters),
  queryFn: () => taskApi.list(filters),
});

// UI state: Zustand (only for truly local state)
const useUIStore = create<UIState>((set) => ({
  // Sidebar state
  isSidebarOpen: true,
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),

  // Modal state
  activeModal: null,
  openModal: (modal: ModalType) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),

  // Selection state
  selectedTaskIds: new Set<string>(),
  toggleTaskSelection: (id: string) => set((s) => ({
    selectedTaskIds: s.selectedTaskIds.has(id)
      ? new Set([...s.selectedTaskIds].filter(i => i !== id))
      : new Set([...s.selectedTaskIds, id])
  })),
}));
```

### 6.4 Optimistic Updates Pattern

```typescript
// src/domains/tasks/hooks/useTaskMutations.ts
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: taskApi.update,

    // Optimistic update
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });

      const previousTasks = queryClient.getQueryData(queryKeys.tasks.all);

      queryClient.setQueryData(queryKeys.tasks.all, (old: Task[]) =>
        old.map(t => t.id === variables.id ? { ...t, ...variables.data } : t)
      );

      return { previousTasks };
    },

    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks.all, context.previousTasks);
      }
      toast.error('Failed to update task');
    },

    // Refetch on success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}
```

### 6.5 Real-Time Updates Architecture

```typescript
// src/shared/lib/realtime/RealtimeProvider.tsx
interface RealtimeConfig {
  endpoint: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

class RealtimeConnection {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;

  connect(): void;
  disconnect(): void;
  subscribe<T>(event: string, handler: (data: T) => void): Unsubscribe;
}

// Hook for components
function useRealtimeEvent<T>(event: string, handler: (data: T) => void) {
  const realtime = useRealtime();

  useEffect(() => {
    return realtime.subscribe(event, handler);
  }, [event, handler]);
}

// Usage
function TaskList() {
  const queryClient = useQueryClient();

  useRealtimeEvent('task.updated', (task: Task) => {
    queryClient.setQueryData(['tasks', task.id], task);
  });
}
```

---

## 7. Database Schema Evolution

### 7.1 New Indexes for v2

```sql
-- Performance indexes identified as missing
CREATE INDEX idx_calendar_event_feed_time ON "CalendarEvent" ("feedId", "start", "end");
CREATE INDEX idx_task_user_sync ON "Task" ("userId", "syncStatus");
CREATE INDEX idx_task_change_user_time ON "TaskChange" ("userId", "timestamp" DESC);
CREATE INDEX idx_calendar_feed_user_enabled ON "CalendarFeed" ("userId", "enabled");
CREATE INDEX idx_project_user_status ON "Project" ("userId", "status");

-- Composite index for scheduling queries
CREATE INDEX idx_task_scheduling ON "Task" (
  "userId",
  "isAutoScheduled",
  "scheduleLocked",
  "status"
) WHERE "isAutoScheduled" = true;
```

### 7.2 Schema Enhancements

```prisma
// Enhanced Task model
model Task {
  // ... existing fields

  // New in v2
  dependsOn        Task[]   @relation("TaskDependencies")
  blockedBy        Task[]   @relation("TaskDependencies")
  estimatedMinutes Int?     // User's time estimate
  actualMinutes    Int?     // Tracked completion time
  complexityScore  Float?   // ML-derived complexity
  lastAttemptedAt  DateTime? // For retry tracking
  failureCount     Int      @default(0)

  // Location-based scheduling
  location         String?
  isLocationBased  Boolean  @default(false)

  // Better recurrence tracking
  recurrenceParentId String?
  recurrenceParent   Task?    @relation("TaskRecurrence", fields: [recurrenceParentId])
  recurrenceInstances Task[]  @relation("TaskRecurrence")

  @@index([userId, isAutoScheduled, status])
  @@index([recurrenceParentId])
}

// New: Task Templates
model TaskTemplate {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId])
  name        String
  description String?
  duration    Int?
  priority    Priority?
  energyLevel EnergyLevel?
  tags        Tag[]
  projectId   String?
  project     Project? @relation(fields: [projectId])

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId, name])
}

// New: Scheduling History (for ML)
model SchedulingHistory {
  id              String   @id @default(uuid())
  taskId          String
  task            Task     @relation(fields: [taskId])
  userId          String
  scheduledStart  DateTime
  scheduledEnd    DateTime
  actualStart     DateTime?
  actualEnd       DateTime?
  wasCompleted    Boolean  @default(false)
  wasRescheduled  Boolean  @default(false)
  rescheduledTo   String?  // Next history entry ID

  // Context at scheduling time
  slotScore       Float?
  dayOfWeek       Int
  hourOfDay       Int
  meetingDensity  Float?

  createdAt       DateTime @default(now())

  @@index([userId, createdAt])
  @@index([taskId])
}

// New: Focus Sessions
model FocusSession {
  id           String    @id @default(uuid())
  userId       String
  user         User      @relation(fields: [userId])
  taskId       String?
  task         Task?     @relation(fields: [taskId])
  startedAt    DateTime
  endedAt      DateTime?
  plannedEnd   DateTime?
  breaks       Json      @default("[]") // Array of break periods
  interruptions Int      @default(0)
  notes        String?

  createdAt    DateTime  @default(now())

  @@index([userId, startedAt])
}
```

### 7.3 Settings Consolidation

**Current**: 6 separate settings models
**Proposed**: Consolidated with JSON substructures

```prisma
// Consolidated settings (v2)
model UserPreferences {
  id        String @id @default(uuid())
  userId    String @unique
  user      User   @relation(fields: [userId])

  // Core preferences (structured)
  general   Json   // { theme, defaultView, timezone, weekStart, timeFormat }
  calendar  Json   // { workingHours, refreshInterval, defaultCalendarId }

  // Scheduling preferences
  scheduling Json  // { workDays, workHours, energyWindows, buffers }

  // Notifications
  notifications Json // { email, push, reminders }

  // Integration settings
  integrations Json  // { syncEnabled, providers }

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 7.4 Soft Deletes

```prisma
// Add to models that need recovery
model Task {
  // ... existing fields
  deletedAt DateTime?

  @@index([userId, deletedAt])
}

// Middleware for automatic filtering
prisma.$use(async (params, next) => {
  if (params.model === 'Task') {
    if (params.action === 'findMany' || params.action === 'findFirst') {
      params.args.where = {
        ...params.args.where,
        deletedAt: null,
      };
    }
  }
  return next(params);
});
```

---

## 8. UI/UX Enhancements

### 8.1 Component Library Improvements

#### Missing Components to Add

```typescript
// src/shared/components/ui/

// 1. Breadcrumb navigation
export const Breadcrumb = { Root, Item, Separator, Link };

// 2. Pagination
export const Pagination = { Root, Previous, Next, Pages, Info };

// 3. Progress indicators
export const Progress = { Bar, Circular, Steps };

// 4. Toast wrapper (Sonner integration)
export const Toast = { Provider, toast };

// 5. Data table with sorting/filtering
export const DataTable = { Root, Header, Body, Row, Cell, Pagination };

// 6. Empty states
export const EmptyState = { Root, Icon, Title, Description, Action };

// 7. Skeleton loaders
export const Skeleton = { Text, Avatar, Card, Table };
```

#### Component Library Export

```typescript
// src/shared/components/ui/index.ts
export * from './accordion';
export * from './alert';
export * from './avatar';
export * from './badge';
export * from './breadcrumb';
export * from './button';
export * from './calendar';
export * from './card';
export * from './checkbox';
// ... all components
```

### 8.2 Accessibility Improvements

```typescript
// FormMessage with screen reader support
export const FormMessage = React.forwardRef<HTMLParagraphElement, Props>(
  ({ className, children, ...props }, ref) => {
    const { error } = useFormField();
    const body = error?.message ?? children;

    if (!body) return null;

    return (
      <p
        ref={ref}
        role="alert"
        aria-live="polite"
        className={cn("text-sm font-medium text-destructive", className)}
        {...props}
      >
        {body}
      </p>
    );
  }
);

// Focus trap for modals
export function useFocusTrap(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    // Trap focus within modal
    // ... implementation
  }, [ref]);
}

// Skip links for keyboard navigation
export function SkipLinks() {
  return (
    <nav aria-label="Skip links" className="sr-only focus-within:not-sr-only">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <a href="#sidebar" className="skip-link">Skip to sidebar</a>
    </nav>
  );
}
```

### 8.3 Performance Optimizations

```typescript
// Virtualized lists for large datasets
import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualTaskList({ tasks }: { tasks: Task[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <TaskRow
            key={tasks[virtualRow.index].id}
            task={tasks[virtualRow.index]}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Lazy loading for heavy modals
const TaskDetailModal = lazy(() => import('./TaskDetailModal'));
const SettingsModal = lazy(() => import('./SettingsModal'));

export function ModalContainer() {
  const { activeModal } = useUIStore();

  return (
    <Suspense fallback={<ModalSkeleton />}>
      {activeModal === 'task-detail' && <TaskDetailModal />}
      {activeModal === 'settings' && <SettingsModal />}
    </Suspense>
  );
}
```

### 8.4 Mobile-First Responsive Design

```typescript
// Responsive hooks
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<'sm' | 'md' | 'lg' | 'xl'>('lg');

  useEffect(() => {
    const mediaQueries = {
      sm: window.matchMedia('(max-width: 639px)'),
      md: window.matchMedia('(min-width: 640px) and (max-width: 767px)'),
      lg: window.matchMedia('(min-width: 768px) and (max-width: 1023px)'),
      xl: window.matchMedia('(min-width: 1024px)'),
    };

    // Update on change
    // ... implementation
  }, []);

  return breakpoint;
}

// Responsive calendar view
export function Calendar() {
  const breakpoint = useBreakpoint();

  const view = useMemo(() => {
    if (breakpoint === 'sm') return 'listDay';
    if (breakpoint === 'md') return 'timeGridDay';
    return 'timeGridWeek';
  }, [breakpoint]);

  return <FullCalendar initialView={view} />;
}
```

### 8.5 Dark Mode Improvements

```css
/* Enhanced dark mode with system preference */
:root {
  color-scheme: light dark;
}

@media (prefers-color-scheme: dark) {
  :root:not(.light) {
    /* Dark mode variables */
  }
}

/* Smooth transitions */
* {
  transition: background-color 0.2s ease, border-color 0.2s ease;
}
```

---

## 9. Security Hardening

### 9.1 Critical Security Fixes

#### Remove Hardcoded Secret

```typescript
// BEFORE (VULNERABLE)
secret: process.env.NEXTAUTH_SECRET || "EM2RYkch0Uj+Qt2Cu0eDCmo/kv0MenNnHUaciNAjSrM="

// AFTER (SECURE)
secret: (() => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET environment variable is required');
  }
  if (secret.length < 32) {
    throw new Error('NEXTAUTH_SECRET must be at least 32 characters');
  }
  return secret;
})(),
```

#### Input Validation for All Endpoints

```typescript
// Registration validation
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain a special character'),
  name: z.string().min(1).max(100).optional(),
});
```

### 9.2 Security Headers

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  },
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self';
      connect-src 'self' https://api.stripe.com https://accounts.google.com;
      frame-src https://js.stripe.com https://hooks.stripe.com;
    `.replace(/\s+/g, ' ').trim()
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

### 9.3 Token Security

```typescript
// Hash reset tokens before storing
import { createHash } from 'crypto';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Store hashed token
await prisma.passwordReset.create({
  data: {
    userId: user.id,
    token: hashToken(resetToken), // Store hash, not plain token
    expiresAt: new Date(Date.now() + 3600000), // 1 hour
  }
});

// Verify by hashing incoming token
const hashedToken = hashToken(incomingToken);
const resetRequest = await prisma.passwordReset.findFirst({
  where: { token: hashedToken, usedAt: null, expiresAt: { gt: new Date() } }
});
```

### 9.4 OAuth Token Encryption

```typescript
// Encrypt OAuth tokens at rest
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY!; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

export function encryptToken(token: string): { encrypted: string; iv: string; tag: string } {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
  };
}

export function decryptToken(data: { encrypted: string; iv: string; tag: string }): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(data.iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(data.tag, 'hex'));

  let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### 9.5 Audit Logging

```typescript
// src/infrastructure/audit/AuditLogger.ts
interface AuditEvent {
  type: AuditEventType;
  userId: string;
  resourceType: string;
  resourceId?: string;
  action: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

type AuditEventType =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.failed'
  | 'auth.password_reset'
  | 'data.created'
  | 'data.updated'
  | 'data.deleted'
  | 'admin.action'
  | 'subscription.changed'
  | 'api.rate_limited';

class AuditLogger {
  async log(event: AuditEvent): Promise<void>;
  async query(filters: AuditQueryFilters): Promise<AuditEvent[]>;
}
```

### 9.6 Two-Factor Authentication

```typescript
// For admin accounts
interface TwoFactorConfig {
  enabled: boolean;
  method: 'totp' | 'email' | 'sms';
  secret?: string;        // TOTP secret (encrypted)
  backupCodes?: string[]; // Hashed backup codes
  verifiedAt?: Date;
}

// TOTP implementation
import { authenticator } from 'otplib';

class TwoFactorService {
  generateSecret(): string {
    return authenticator.generateSecret();
  }

  generateQRCode(email: string, secret: string): string {
    return authenticator.keyuri(email, 'FluidCalendar', secret);
  }

  verifyToken(secret: string, token: string): boolean {
    return authenticator.verify({ token, secret });
  }
}
```

---

## 10. Testing Infrastructure

### 10.1 Testing Strategy

| Test Type | Coverage Target | Tools |
|-----------|----------------|-------|
| Unit Tests | 80% | Jest, React Testing Library |
| Integration Tests | 60% | Jest, Supertest |
| E2E Tests | Critical Paths | Playwright |
| API Contract Tests | All Endpoints | Jest + OpenAPI |
| Visual Regression | Key Components | Playwright, Percy |
| Performance Tests | Load Testing | k6, Artillery |
| Security Tests | OWASP Top 10 | OWASP ZAP |

### 10.2 Test Setup

```typescript
// jest.setup.ts
import '@testing-library/jest-dom';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock environment
process.env.DATABASE_URL = 'postgresql://test@localhost/test';
process.env.NEXTAUTH_SECRET = 'test-secret-at-least-32-characters';

// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/types.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### 10.3 MSW Mocking

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/tasks', () => {
    return HttpResponse.json([
      { id: '1', title: 'Test Task', status: 'todo' },
    ]);
  }),

  http.post('/api/tasks', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: '2',
      ...body,
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  // Stripe webhook mock
  http.post('/api/webhooks/stripe', () => {
    return HttpResponse.json({ received: true });
  }),
];

// src/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### 10.4 Component Testing

```typescript
// src/domains/tasks/components/__tests__/TaskList.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TaskList } from '../TaskList';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('TaskList', () => {
  it('renders tasks', async () => {
    render(<TaskList />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });
  });

  it('creates new task', async () => {
    const user = userEvent.setup();
    render(<TaskList />, { wrapper });

    await user.click(screen.getByRole('button', { name: /add task/i }));
    await user.type(screen.getByRole('textbox', { name: /title/i }), 'New Task');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText('New Task')).toBeInTheDocument();
    });
  });
});
```

### 10.5 API Testing

```typescript
// src/app/api/tasks/__tests__/route.test.ts
import { createMocks } from 'node-mocks-http';
import { GET, POST } from '../route';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    task: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock auth
jest.mock('@/lib/auth/api-auth', () => ({
  authenticateRequest: jest.fn().mockResolvedValue({ userId: 'test-user' }),
}));

describe('Tasks API', () => {
  describe('GET /api/tasks', () => {
    it('returns tasks for authenticated user', async () => {
      const { req } = createMocks({ method: 'GET' });

      prisma.task.findMany.mockResolvedValue([
        { id: '1', title: 'Test', userId: 'test-user' },
      ]);

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
    });
  });

  describe('POST /api/tasks', () => {
    it('creates task with valid data', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: { title: 'New Task' },
      });

      prisma.task.create.mockResolvedValue({
        id: '2',
        title: 'New Task',
        userId: 'test-user',
      });

      const response = await POST(req);

      expect(response.status).toBe(201);
    });

    it('returns 400 for invalid data', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: { title: '' }, // Empty title
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
    });
  });
});
```

### 10.6 E2E Test Expansion

```typescript
// tests/task-management.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth/signin');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/calendar');
  });

  test('creates, schedules, and completes task', async ({ page }) => {
    // Create task
    await page.click('[data-testid="add-task"]');
    await page.fill('[name="title"]', 'E2E Test Task');
    await page.fill('[name="duration"]', '60');
    await page.check('[name="isAutoScheduled"]');
    await page.click('button:has-text("Save")');

    // Verify task created
    await expect(page.locator('text=E2E Test Task')).toBeVisible();

    // Trigger scheduling
    await page.click('[data-testid="schedule-all"]');
    await page.waitForResponse('/api/tasks/schedule-all');

    // Verify scheduled
    await expect(page.locator('[data-testid="scheduled-badge"]')).toBeVisible();

    // Complete task
    await page.click('[data-testid="task-checkbox"]');
    await expect(page.locator('text=E2E Test Task')).toHaveClass(/completed/);
  });

  test('handles sync with external calendar', async ({ page }) => {
    // Test calendar integration
  });

  test('processes subscription upgrade', async ({ page }) => {
    // Test Stripe flow
  });
});
```

---

## 11. Performance Optimization

### 11.1 Database Query Optimization

```typescript
// Before: N+1 query problem
const tasks = await prisma.task.findMany({ where: { userId } });
for (const task of tasks) {
  const project = await prisma.project.findUnique({ where: { id: task.projectId } });
}

// After: Single query with includes
const tasks = await prisma.task.findMany({
  where: { userId },
  include: {
    project: true,
    tags: true,
  },
});

// For large datasets: Select only needed fields
const tasks = await prisma.task.findMany({
  where: { userId },
  select: {
    id: true,
    title: true,
    status: true,
    dueDate: true,
    project: {
      select: { id: true, name: true, color: true },
    },
  },
});
```

### 11.2 Caching Strategy

```typescript
// src/infrastructure/cache/CacheService.ts
import { Redis } from 'ioredis';

interface CacheOptions {
  ttl?: number;          // Time to live in seconds
  tags?: string[];       // For cache invalidation
}

class CacheService {
  private redis: Redis;

  async get<T>(key: string): Promise<T | null>;
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  async invalidate(key: string): Promise<void>;
  async invalidateByTag(tag: string): Promise<void>;

  // Cache-aside pattern
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T>;
}

// Usage
const calendarEvents = await cache.getOrSet(
  `calendar:${feedId}:events:${startDate}:${endDate}`,
  () => fetchEventsFromDB(feedId, startDate, endDate),
  { ttl: 300, tags: [`calendar:${feedId}`] }
);
```

### 11.3 API Response Caching

```typescript
// Cache-Control headers for static-ish data
export async function GET(request: Request) {
  const data = await fetchData();

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
    },
  });
}

// Edge caching for public data
export const runtime = 'edge';
export const revalidate = 3600; // ISR: revalidate every hour
```

### 11.4 Bundle Optimization

```typescript
// next.config.ts
module.exports = {
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'lucide-react',
      'date-fns',
    ],
  },

  // Analyze bundle
  webpack: (config, { isServer }) => {
    if (process.env.ANALYZE) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer ? '../analyze/server.html' : './analyze/client.html',
        })
      );
    }
    return config;
  },
};
```

### 11.5 Image & Asset Optimization

```typescript
// Use Next.js Image component consistently
import Image from 'next/image';

// Preload critical images
<link rel="preload" as="image" href="/logo.png" />

// Lazy load non-critical images
<Image
  src="/feature-image.png"
  loading="lazy"
  placeholder="blur"
  blurDataURL={blurDataUrl}
/>
```

---

## 12. Developer Experience

### 12.1 Documentation

```
docs/
├── getting-started.md
├── architecture/
│   ├── overview.md
│   ├── api-design.md
│   ├── state-management.md
│   └── database-schema.md
├── api/
│   ├── authentication.md
│   ├── tasks.md
│   ├── calendar.md
│   └── webhooks.md
├── components/
│   └── storybook-link.md
├── deployment/
│   ├── docker.md
│   ├── kubernetes.md
│   └── environment-variables.md
└── contributing/
    ├── code-style.md
    ├── testing.md
    └── pull-requests.md
```

### 12.2 Storybook Setup

```typescript
// .storybook/main.ts
export default {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-interactions',
  ],
  framework: '@storybook/nextjs',
};

// Example story
// src/shared/components/ui/button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Button',
  },
};
```

### 12.3 Code Generation

```typescript
// scripts/generate-api-route.ts
// Generates boilerplate for new API routes

import { generateApiRoute } from './generators/api';

generateApiRoute({
  name: 'projects',
  methods: ['GET', 'POST'],
  auth: true,
  validation: true,
  outputDir: 'src/app/api/projects',
});

// Output:
// - route.ts with GET, POST handlers
// - schemas.ts with Zod validation
// - __tests__/route.test.ts with test stubs
```

### 12.4 Git Hooks Enhancement

```json
// .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Lint staged files
npx lint-staged

# Type check
npm run type-check

# Run affected tests
npm run test:affected
```

```json
// .lintstagedrc
{
  "*.{ts,tsx}": [
    "eslint --fix --max-warnings=0",
    "prettier --write"
  ],
  "*.{json,md,yml}": [
    "prettier --write"
  ],
  "prisma/schema.prisma": [
    "prisma format"
  ]
}
```

### 12.5 VS Code Settings

```json
// .vscode/settings.json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

---

## 13. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)

**Security & Stability**
- [ ] Remove hardcoded auth secret
- [ ] Add input validation to all API endpoints
- [ ] Implement rate limiting
- [ ] Add security headers
- [ ] Hash password reset tokens

**Testing Foundation**
- [ ] Set up Jest with proper configuration
- [ ] Configure MSW for API mocking
- [ ] Add tests for critical paths (Stripe, auth)
- [ ] Set up E2E test infrastructure

### Phase 2: API Improvements (Weeks 5-8)

**API Standardization**
- [ ] Implement standardized error responses
- [ ] Create API middleware layer
- [ ] Add request validation middleware
- [ ] Implement audit logging
- [ ] Add API versioning

**Database Optimization**
- [ ] Add missing indexes
- [ ] Implement soft deletes
- [ ] Optimize N+1 queries
- [ ] Set up query monitoring

### Phase 3: Architecture Evolution (Weeks 9-12)

**State Management**
- [ ] Migrate to unified React Query approach
- [ ] Implement optimistic updates
- [ ] Add real-time update infrastructure
- [ ] Create query key factory

**Service Layer**
- [ ] Implement domain services
- [ ] Add event bus infrastructure
- [ ] Create dependency injection container
- [ ] Refactor API routes to use services

### Phase 4: Feature Enhancements (Weeks 13-16)

**Scheduling Engine v2**
- [ ] Add task dependencies
- [ ] Implement ML-based scoring
- [ ] Add real-time rescheduling
- [ ] Enhance conflict resolution

**Calendar Integration**
- [ ] Implement Google Calendar webhooks
- [ ] Add unified provider interface
- [ ] Optimize sync performance
- [ ] Add availability API

### Phase 5: UX & Polish (Weeks 17-20)

**UI Improvements**
- [ ] Add missing components
- [ ] Implement accessibility fixes
- [ ] Add virtualized lists
- [ ] Optimize bundle size

**Documentation & DX**
- [ ] Set up Storybook
- [ ] Write API documentation
- [ ] Create architecture guides
- [ ] Add code generation tools

---

## 14. Breaking Changes & Migration

### 14.1 API Breaking Changes

| Change | v1 | v2 | Migration |
|--------|----|----|-----------|
| Error format | Text/mixed | JSON with code | Update error handlers |
| Pagination | None | Cursor-based | Add pagination params |
| Auth header | Cookie/session | Bearer token supported | Add token support |
| Response envelope | Raw data | `{ data, meta }` | Update response parsing |

### 14.2 Database Migrations

```sql
-- Migration: Add soft deletes
ALTER TABLE "Task" ADD COLUMN "deletedAt" TIMESTAMP;
CREATE INDEX "Task_deletedAt_idx" ON "Task"("userId", "deletedAt");

-- Migration: Consolidate settings
CREATE TABLE "UserPreferences" (...);
-- Migrate data from 6 settings tables
INSERT INTO "UserPreferences" SELECT ... FROM "UserSettings" ...;
-- Drop old tables after verification
```

### 14.3 Client Migration Guide

```typescript
// v1 API usage
const response = await fetch('/api/tasks');
const tasks = await response.json();

// v2 API usage
const response = await fetch('/api/v2/tasks');
const { data: tasks, pagination } = await response.json();

// Error handling v2
if (!response.ok) {
  const { error, code, details } = await response.json();
  // Handle structured error
}
```

---

## Appendix A: Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State Management | React Query + Zustand | Server state in RQ, UI state in Zustand |
| Validation | Zod | TypeScript-first, composable, runtime validation |
| Testing | Jest + Playwright | Industry standard, good DX |
| Caching | Redis | Already in stack for jobs, versatile |
| API Format | REST + JSON | Simple, well-understood, cacheable |
| Real-time | SSE | Simpler than WebSocket, sufficient for updates |

## Appendix B: Performance Targets

| Metric | Current | Target |
|--------|---------|--------|
| Initial Load (LCP) | ~2.5s | <1.5s |
| Time to Interactive | ~3.5s | <2.5s |
| API Response (p95) | ~500ms | <200ms |
| Scheduling (100 tasks) | ~5s | <2s |
| Bundle Size (JS) | ~500KB | <350KB |
| Lighthouse Score | 75 | 90+ |

## Appendix C: Security Checklist

- [ ] No hardcoded secrets
- [ ] All inputs validated
- [ ] Rate limiting on all endpoints
- [ ] Security headers configured
- [ ] OAuth tokens encrypted at rest
- [ ] Reset tokens hashed
- [ ] CSRF protection enabled
- [ ] Admin 2FA implemented
- [ ] Audit logging complete
- [ ] Penetration testing passed

---

*Document maintained by the FluidCalendar team. Last updated: December 2024.*

<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Approach & Workflow

### Plan-First Development Philosophy
This project follows a **plan-first approach** adapted from Cursor rules:

1. **Analysis Phase**: Always analyze the existing codebase and understand the current state before making changes
2. **Planning Phase**: Present a clear implementation plan and get approval before proceeding
3. **Implementation Phase**: Execute the approved plan systematically
4. **Documentation Phase**: Update relevant documentation after significant changes

### Memory Bank Integration
This project maintains comprehensive documentation following a memory bank pattern:
- **CLAUDE.md**: Primary guidance for Claude Code (this file)
- **Project Documentation**: Found in `/docs/` directory and `/saas/memory-bank/` (submodule)
- **Active Context**: Current development state and ongoing work
- **System Patterns**: Established architectural patterns and conventions

**Key Principle**: Always read existing documentation and understand project context before implementing new features.

### Implementation Workflow

#### For New Features
1. **Analyze**: Read existing code patterns and documentation in `/memory-bank/` and `/docs/`
2. **Plan**: Present implementation approach and get approval
3. **Implement**: Follow established patterns and conventions
4. **Test**: Ensure TypeScript compilation and linting passes
5. **Document**: Update relevant documentation

#### For Bug Fixes  
1. **Investigate**: Understand root cause and related systems
2. **Plan**: Propose fix approach, considering side effects
3. **Fix**: Implement solution following established patterns
4. **Verify**: Test fix and run type checking/linting
5. **Document**: Update documentation if architectural changes made

#### For Refactoring
1. **Assessment**: Understand current implementation and dependencies
2. **Strategy**: Plan migration approach (complete removal vs. gradual)
3. **Implementation**: Execute systematically with comprehensive cleanup
4. **Validation**: Ensure no breaking changes and clean compilation
5. **Cleanup**: Remove all related unused code, imports, and types

## Project Overview

FluidCalendar is an open-source alternative to Motion for intelligent task scheduling and calendar management. This is the **SaaS version** that includes both open-source features and premium subscription functionality.

## Development Commands

### Setup & Environment
```bash
# Copy environment file and configure
cp .env.example .env

# Start development server with Turbopack
npm run dev

# Start PostgreSQL database (Docker)
npm run db:up

# Start Redis for SaaS features (Docker)
npm run redis:up

# Generate Prisma client
npm run prisma:generate

# Open Prisma Studio
npm run prisma:studio
```

### Building & Testing
```bash
# Build for production (SAAS version)
npm run build

# Build open-source version
npm run build:os

# Type checking
npm run type-check

# Linting
npm run lint

# Code formatting
npm run format
npm run format:check

# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e
```

### Background Jobs (SaaS)
```bash
# Build worker
npm run build:worker

# Start worker (development)
npm run start:worker

# Start worker (production)
npm run start:worker:prod
```

## Architecture Overview

### Open-Core Architecture
The project uses an open-core model with a Git submodule for SaaS features:

- **Public Repository**: Core calendar/task functionality (open-source, MIT license)
- **Private Submodule** (`saas/`): Proprietary SaaS features (subscriptions, pSEO, admin)
- **Feature Detection**: `next.config.ts` auto-detects if `saas/` submodule is present
- **Build Modes**:
  - `npm run build` - Full build (includes SaaS if submodule present)
  - `npm run build:os` - Open-source only build
- **Setup Script**: `scripts/setup-saas.ts` integrates the submodule (symlinks, schema merge)

### Core Application Structure

#### Route Organization
- `src/app/(common)/` - Core routes (calendar, tasks, settings)
- `src/app/(open)/` - Open-source landing page and variants
- `saas/app/(saas)/` - SaaS-only routes (billing, admin, waitlist, pricing) - via submodule
- Route-level middleware handles authentication and admin access control

#### Database & ORM
- **Prisma ORM** with PostgreSQL (production) / SQLite (development)
- Multi-user schema with user isolation across all models
- Subscription management with Stripe integration
- Advanced task synchronization with external providers (Google, Outlook)
- you MUST create a migration whenever you make database schema changes

#### Authentication & Authorization
- **NextAuth.js** with multiple providers (Google, Outlook, credentials)
- Role-based access control (user/admin)
- Session-based authentication with JWT tokens
- Middleware-based route protection in `src/middleware.ts`

### Key Architectural Patterns

#### Subscription System (SaaS) - **CRITICAL PATTERN**
**Webhook-First Architecture**: All subscription-related database changes MUST be handled by Stripe webhooks, never in success pages.

##### Success Page Pattern (Read-Only Only)
```typescript
// ✅ CORRECT: Read-only success page
export default async function SuccessPage() {
  // 1. Verify payment with Stripe (read-only)
  const result = await verifyPaymentStatus(sessionId);
  
  // 2. Read current subscription state from DB
  const user = await prisma.user.findUnique({ 
    where: { email: userEmail },
    include: { subscription: true }
  });
  
  // 3. Show loading if webhook hasn't processed yet
  if (paymentComplete && !subscriptionUpdated) {
    return <LoadingDisplay />;
  }
  
  // 4. Display success confirmation
  return <SuccessClient />;
}

// ❌ WRONG: Never do DB writes in success pages
await prisma.subscription.upsert({ ... }); // DON'T DO THIS
```

##### Webhook Handler Pattern (Single Source of Truth)
```typescript
// ✅ CORRECT: All DB changes in webhooks
export async function handleCheckoutSessionCompleted(session) {
  // 1. Handle user creation for new customers
  if (!userId && userEmail) {
    user = await prisma.user.create({ ... });
  }
  
  // 2. Create/update subscription
  await prisma.subscription.upsert({ ... });
  
  // 3. Create audit trail
  await prisma.subscriptionHistory.create({ ... });
}
```

**Benefits**: Reliability (guaranteed delivery), consistency (single source of truth), completeness (handles all subscription lifecycle events), industry standard approach.

**Webhook Events Handled**: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.trial_will_end`

#### Task Scheduling Engine
- **Auto-scheduling Algorithm**: Intelligent task placement based on calendar availability
- Energy level mappings and time preferences
- Buffer time management and conflict resolution
- Scoring system for optimal time slot selection

#### Calendar Integration
- **Multi-Provider Support**: Google Calendar, Outlook, CalDAV
- Incremental sync with delta tokens
- Webhook subscriptions for real-time updates
- Event conflict detection and resolution

#### Task Synchronization
- **Bidirectional Sync**: Tasks sync between FluidCalendar and external systems
- Change tracking with conflict resolution
- Provider-specific field mapping and recurrence rule conversion
- Async job processing with retry mechanisms

### State Management
- **Zustand** for client-side state
- Store factories for consistent state patterns
- Separation of concerns across domain-specific stores (tasks, calendar, settings)

### Background Jobs (SaaS)
- **BullMQ** with Redis for job queues
- Daily summary emails and task reminders
- Automated task synchronization
- Job tracking and retry mechanisms

## Development Patterns

### Component Organization
```
components/
   auth/          # Authentication components
   calendar/      # Calendar UI components  
   tasks/         # Task management UI
   settings/      # Settings forms and displays
   subscription/  # Billing and subscription components
   ui/           # Reusable UI components
   providers/    # Context providers
```

### API Routes Structure
- RESTful endpoints following Next.js App Router conventions
- Consistent error handling and response formatting
- Authentication middleware applied per route
- OpenAPI-style documentation for external integrations

### Database Patterns
- User isolation enforced at the query level
- Soft deletes for audit trails
- Optimistic updates with rollback strategies
- Connection pooling and query optimization

### Testing Strategy
- Unit tests with Jest for utility functions
- Playwright for E2E testing of critical user flows
- Component testing with React Testing Library
- API testing with supertest

## Environment Configuration

### Required Environment Variables
```bash
DATABASE_URL="postgresql://user:pass@host:port/db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-min-32-chars"
NEXT_PUBLIC_ENABLE_SAAS_FEATURES="false"  # Set to "true" for SAAS features
```

### SaaS-Only Variables
```bash
RESEND_API_KEY="your-resend-key"
STRIPE_SECRET_KEY="your-stripe-secret"
STRIPE_WEBHOOK_SECRET="your-webhook-secret"
REDIS_URL="redis://localhost:6379"
```

### Calendar Integration
Configure through UI (Settings > System) or environment variables:
- Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`  
- Outlook: `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`

## Important Development Notes

### Pre-commit Hooks
- ESLint with maximum 0 warnings policy
- Prettier formatting enforcement
- TypeScript compilation checks
- Staged file linting with lint-staged

### Logging & Monitoring

#### Structured Logging Requirements
- **Always import from `@/lib/logger`** and use structured logging
- **Always specify LOG_SOURCE** as third parameter: `logger.info("message", { data }, LOG_SOURCE)`
- **Use structured metadata objects** for context, not string concatenation
- **Log errors with error.message** in metadata, not the full error object

```typescript
// ✅ CORRECT: Structured logging
const LOG_SOURCE = "UserAPI";
logger.info(
  "User created successfully",
  { userId: user.id, email: user.email },
  LOG_SOURCE
);

logger.error(
  "Failed to create user",
  { 
    error: error instanceof Error ? error.message : "Unknown error",
    email: userData.email 
  },
  LOG_SOURCE
);

// ❌ WRONG: String concatenation or missing LOG_SOURCE
logger.info(`User ${user.id} created`); // No structure
logger.error("Error:", error); // Full error object
```

#### Infrastructure & Deployment
- **Kubernetes-first approach** for production logging (Loki + Promtail + Grafana)
- **Container-first design**: stdout/stderr output for proper log collection
- **Global cluster deployment** for multi-application reusability
- **Kubernetes context awareness** for proper labeling
- Sentry integration for error tracking

### Performance Considerations
- Database query optimization with proper indexing
- Calendar sync performance with incremental updates
- Task scheduling algorithm efficiency
- Background job processing optimization

### Security Best Practices
- Never expose API keys or secrets in client code
- Input validation and sanitization on all endpoints  
- Rate limiting on public APIs
- Secure webhook signature verification

### Multi-tenancy & Data Isolation
- **All database models include userId** for proper isolation
- **API endpoints enforce user context** via middleware
- **No cross-tenant data leakage** - all queries scoped to user
- **Admin functions properly scoped** with `requireAdmin` middleware

### Code Quality & Migration Standards

#### TypeScript & Code Quality
- **ESLint with maximum 0 warnings** policy in pre-commit hooks
- **TypeScript compilation must be clean** after any major refactoring
- **Comprehensive cleanup** of related components (APIs, stores, components) when removing features
- **Structured error handling** with proper type safety

#### Migration & Refactoring Approach
- **Complete removal preferred** over gradual migration for legacy systems
- **Maintain backward compatibility** at interface level during transitions  
- **Database schema cleanup should be comprehensive** - remove all related fields/models
- **Interface-level compatibility** maintained during major changes
- **Systematic cleanup** of imports, types, and unused code

## Common Debugging

### Database Issues
- Check connection string format in DATABASE_URL
- Verify Prisma migrations are up to date: `npx prisma migrate dev`
- Reset database if needed: `npx prisma migrate reset`

### Calendar Sync Problems
- Verify API credentials in system settings
- Check token expiration and refresh logic
- Review webhook subscriptions and endpoints
- Monitor incremental sync tokens

### Background Jobs (SaaS)
- Ensure Redis is running for job queues
- Check job status in admin dashboard
- Review worker logs for failed jobs
- Monitor queue health and processing times
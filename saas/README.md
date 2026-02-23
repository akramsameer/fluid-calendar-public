# FluidCalendar SaaS Module

This directory contains proprietary SaaS features for FluidCalendar. It is designed to be used as a Git submodule in the main FluidCalendar repository.

## Structure

```
saas/
├── app/(saas)/          # SaaS route pages (admin, billing, pricing, etc.)
├── api/                 # SaaS API routes
├── components/          # SaaS-specific React components
├── lib/                 # SaaS services, hooks, and utilities
├── store/               # SaaS state management (Zustand stores)
├── jobs/                # BullMQ background job workers
├── k8s/                 # Kubernetes deployment configurations
├── prisma/              # SaaS-specific Prisma schema extensions
└── .github/workflows/   # SaaS deployment workflows
```

## Features Included

- **Subscription Management**: Stripe integration, billing, plan management
- **Admin Dashboard**: User management, job monitoring, analytics
- **Waitlist System**: Beta program, invitations, referrals
- **pSEO Articles**: AI-generated content for SEO
- **Background Jobs**: Email notifications, task sync, maintenance
- **Deployment**: Kubernetes configs, CI/CD workflows

## Setup

This module is automatically integrated when you clone the main repository with:

```bash
git clone --recurse-submodules https://github.com/dotnetfactory/fluid-calendar
```

The `scripts/setup-saas.ts` script handles:
- Creating symlinks for SaaS routes
- Merging Prisma schemas
- Installing SaaS dependencies

## Environment Variables

See `.env.example` in this directory for required SaaS-specific environment variables.

## Development

When working on SaaS features:
1. Make changes in this submodule
2. Commit and push to the private SaaS repo
3. Update the submodule reference in the main repo

## License

Proprietary - All Rights Reserved

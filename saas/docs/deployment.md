# SaaS Deployment Guide

This guide covers deploying the FluidCalendar SaaS version.

## Prerequisites

- Kubernetes cluster (DigitalOcean, AWS EKS, GKE, etc.)
- Container registry access
- PostgreSQL database
- Redis instance
- Stripe account
- Resend account (for emails)
- Azure OpenAI (for article generation)

## Environment Setup

### Required GitHub Secrets

Configure these in your repository settings:

```
CONTAINER_REGISTRY        # e.g., registry.digitalocean.com/your-namespace
K8S_CLUSTER_NAME          # Your Kubernetes cluster name
DIGITALOCEAN_ACCESS_TOKEN # For DigitalOcean deployments
INFISICAL_API_URL         # Your Infisical instance URL
INFISICAL_PROJECT_ID      # Your Infisical project ID
INFISICAL_TOKEN           # Service token for Infisical
```

### Application Environment Variables

See `saas/.env.example` for the full list. Key variables:

```bash
# Database
DATABASE_URL=postgresql://...

# Authentication
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Redis
REDIS_URL=redis://...

# Email
RESEND_API_KEY=re_...
```

## Deployment Options

### Option 1: Kubernetes (Recommended)

1. Configure `saas/k8s/deployment.yaml` with your values
2. Apply the manifests:
   ```bash
   kubectl apply -f saas/k8s/
   ```

### Option 2: Docker Compose

```bash
docker compose -f docker-compose.saas.yml up -d
```

### Option 3: GitHub Actions

Push to main branch triggers automatic deployment via:
- `saas/.github/workflows/deploy.saas.yml` (production)
- `saas/.github/workflows/deploy.staging.saas.yml` (staging)

## Background Workers

The SaaS version requires background job workers:

```bash
# Build worker
npm run build:worker

# Run worker
npm run start:worker
```

Workers handle:
- Daily summary emails
- Task synchronization
- Email notifications
- Maintenance tasks

## Monitoring

- Application logs: Check Kubernetes pod logs
- Job status: Admin dashboard at /admin/jobs
- Error tracking: Configure Sentry/GlitchTip

## Scaling

- **Web pods**: Scale horizontally based on traffic
- **Worker pods**: Scale based on job queue depth
- **Database**: Use connection pooling (PgBouncer)
- **Redis**: Use Redis Cluster for high availability

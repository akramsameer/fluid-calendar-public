# Fluid Calendar SAAS Staging Environment

This document describes the staging environment setup for testing the BullMQ and Redis background job processing system without affecting the production environment.

## Overview

The staging environment is deployed to `staging.fluidcalendar.com` and uses a separate namespace (`fluid-calendar-staging`) in the Kubernetes cluster. It has its own Redis instance and database to ensure complete isolation from production.

## Configuration Files

- `src/saas/k8s/deployment.staging.saas.yaml`: Kubernetes configuration for the staging environment
- `.github/workflows/deploy.staging.saas.yml`: GitHub Actions workflow for deploying to staging

## Deployment Process

The staging environment is automatically deployed when changes are pushed to the `bullmq` branch. The deployment process is similar to production but uses staging-specific configurations:

1. Builds a Docker image tagged as `fluid-calendar-website-staging`
2. Pushes the image to DigitalOcean Container Registry
3. Applies the staging Kubernetes configuration
4. Runs database migrations on the staging database
5. Deploys the application and worker to the staging environment

## Manual Deployment

If you need to deploy to staging manually, follow these steps:

1. Build the Docker image:
   ```bash
   docker build -t registry.digitalocean.com/curatedletters/fluid-calendar-website-staging:latest -f src/saas/Dockerfile.saas .
   ```

2. Push the image to DigitalOcean Container Registry:
   ```bash
   docker push registry.digitalocean.com/curatedletters/fluid-calendar-website-staging:latest
   ```

3. Apply the Kubernetes configuration:
   ```bash
   kubectl apply -f src/saas/k8s/deployment.staging.saas.yaml -n fluid-calendar-staging
   ```

## Environment Variables

The staging environment uses Infisical for secret management with the `staging` environment. Make sure the following variables are configured in Infisical:

- Database connection string for staging
- Redis configuration (if different from defaults)
- API keys and other secrets needed for the application
- Set `NEXT_PUBLIC_ENABLE_SAAS_FEATURES=true`

## Testing Background Jobs

To test background jobs in the staging environment:

1. Access the admin interface at `https://staging.fluidcalendar.com/admin/jobs`
2. Use the manual job triggering functionality to create test jobs
3. Monitor job execution in the admin interface
4. Check logs for any errors or issues

## Differences from Production

- Uses a separate namespace (`fluid-calendar-staging`)
- Uses a different Docker image tag (`fluid-calendar-website-staging`)
- Connects to a staging database
- Uses a separate Redis instance
- Deployed to `staging.fluidcalendar.com` instead of `fluidcalendar.com`
- Uses the `staging` environment in Infisical instead of `prod`
- Has fewer replicas and resources to save costs

## Troubleshooting

If you encounter issues with the staging deployment, check the following:

1. Verify that the Infisical `staging` environment is properly configured
2. Check the Kubernetes logs for the application and worker pods
3. Ensure the Redis StatefulSet is running correctly
4. Verify that the database migrations completed successfully

```bash
# Check pod status
kubectl get pods -n fluid-calendar-staging

# Check logs for the application
kubectl logs deployment/fluid-calendar -n fluid-calendar-staging

# Check logs for the worker
kubectl logs deployment/fluid-calendar-worker -n fluid-calendar-staging

# Check Redis status
kubectl get statefulset -n fluid-calendar-staging
kubectl logs statefulset/redis -n fluid-calendar-staging
``` 
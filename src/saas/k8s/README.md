# Fluid Calendar SAAS Kubernetes Deployment

This directory contains the Kubernetes configuration files for deploying the SAAS version of Fluid Calendar to a DigitalOcean Kubernetes cluster.

## Files

- `deployment.yaml`: Contains the Kubernetes resources for deploying the application, including:
  - Deployment: Manages the application pods
  - Service: Exposes the application within the cluster
  - Ingress: Configures external access to the application
  - Job: Runs database migrations before deployment

## Deployment Process

The deployment process is automated through GitHub Actions and is defined in the workflow file at `.github/workflows/deploy.saas.yml`. The workflow:

1. Builds a Docker image using `src/saas/Dockerfile.saas`
2. Pushes the image to DigitalOcean Container Registry
3. Applies the Kubernetes configuration
4. Runs database migrations
5. Deploys the application

## Manual Deployment

If you need to deploy manually, follow these steps:

1. Build the Docker image:
   ```bash
   docker build -t registry.digitalocean.com/curatedletters/fluid-calendar-website:latest -f src/saas/Dockerfile.saas .
   ```

2. Push the image to DigitalOcean Container Registry:
   ```bash
   docker push registry.digitalocean.com/curatedletters/fluid-calendar-website:latest
   ```

3. Apply the Kubernetes configuration:
   ```bash
   kubectl apply -f src/saas/k8s/deployment.yaml -n fluid-calendar
   ```

## Environment Variables

The application uses Infisical for secret management. The following secrets are required:

- `INFISICAL_TOKEN`: Token for accessing Infisical
- `PROJECT_ID`: Infisical project ID
- `INFISICAL_SECRET_ENV`: Environment name in Infisical (e.g., "prod")
- `INFISICAL_API_URL`: URL of the Infisical API

These secrets are stored in a Kubernetes secret named `app-secrets` in the `fluid-calendar` namespace.

## Domain Configuration

The application is configured to be accessible at `app.fluidcalendar.com`. The Ingress resource in `deployment.yaml` configures TLS using Let's Encrypt.

## Troubleshooting

If you encounter issues with the deployment, check the following:

1. Pod status:
   ```bash
   kubectl get pods -n fluid-calendar
   ```

2. Pod logs:
   ```bash
   kubectl logs <pod-name> -n fluid-calendar
   ```

3. Migration job logs:
   ```bash
   kubectl logs job/db-migrate -n fluid-calendar
   ```

4. Ingress status:
   ```bash
   kubectl get ingress -n fluid-calendar
   ```

## Note

These deployment files are specific to the SAAS version and are excluded from the open source repository via the `sync-repos.sh` script. 
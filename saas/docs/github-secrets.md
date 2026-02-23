# Required GitHub Secrets

Configure these secrets in your GitHub repository settings for CI/CD deployment.

## Infrastructure Secrets

| Secret | Description | Example |
|--------|-------------|---------|
| `CONTAINER_REGISTRY` | Container registry URL (without trailing slash) | `registry.digitalocean.com/your-namespace` |
| `CLUSTER_NAME` | Kubernetes cluster name | `k8s-prod-cluster` |
| `DIGITALOCEAN_ACCESS_TOKEN` | DigitalOcean API token for registry | `dop_v1_...` |
| `DIGITALOCEAN_ACCESS_TOKEN_K8S` | DigitalOcean API token for K8s access | `dop_v1_...` |

## Secrets Management (Infisical)

| Secret | Description | Example |
|--------|-------------|---------|
| `INFISICAL_API_URL` | Your Infisical instance URL | `https://infisical.example.com` |
| `INFISICAL_PROJECT_ID` | Project ID in Infisical | `f5cb049c-125e-...` |
| `INFISICAL_TOKEN` | Service token for CI/CD | `st.xxx...` |

## Kubernetes Manifest Variables

The K8s manifest files use placeholder variables that need to be substituted before deployment.
You can use `envsubst` or a similar tool to replace these:

| Variable | Description | Example |
|----------|-------------|---------|
| `${CONTAINER_REGISTRY}` | Container registry URL | `registry.digitalocean.com/your-namespace` |
| `${DOMAIN}` | Production domain | `fluidcalendar.com` |
| `${WWW_DOMAIN}` | Production www domain | `www.fluidcalendar.com` |
| `${STAGING_DOMAIN}` | Staging domain | `staging.fluidcalendar.com` |

Example substitution:
```bash
export CONTAINER_REGISTRY=registry.digitalocean.com/your-namespace
export DOMAIN=fluidcalendar.com
export WWW_DOMAIN=www.fluidcalendar.com
envsubst < saas/k8s/deployment.yaml | kubectl apply -f -
```

## Application Secrets

These can be managed via Infisical or set directly:

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | NextAuth.js signing secret |
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `REDIS_URL` | Redis connection string |
| `RESEND_API_KEY` | Resend email API key |
| `AZURE_API_KEY` | Azure OpenAI API key |

## Setting Up Secrets

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add each secret with its value

## Verifying Secrets

Run a test workflow to verify secrets are configured correctly:

```yaml
- name: Verify secrets
  run: |
    if [ -z "${{ secrets.CONTAINER_REGISTRY }}" ]; then
      echo "CONTAINER_REGISTRY not set"
      exit 1
    fi
```

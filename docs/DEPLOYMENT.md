# Production Deployment Guide

This guide covers deploying HotCRM to production using Docker, Kubernetes, or Vercel (MSW mode).

## Prerequisites

- Node.js ≥ 20.9.0
- Docker ≥ 24.0
- kubectl ≥ 1.28 (for Kubernetes deployments)
- PostgreSQL 16+
- Redis 7+

## Docker Deployment

### Quick Start

```bash
# Clone the repository
git clone https://github.com/objectstack-ai/hotcrm.git
cd hotcrm

# Build and start all services
docker compose up -d

# Verify services are running
docker compose ps
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Application server port |
| `DB_PASSWORD` | `hotcrm` | PostgreSQL password |
| `DB_PORT` | `5432` | Exposed PostgreSQL port |
| `REDIS_PORT` | `6379` | Exposed Redis port |
| `LOG_LEVEL` | `info` | Logging level (`debug`, `info`, `warn`, `error`) |

### Build the Docker Image

```bash
# Production build
docker build -t hotcrm/app:latest .

# Verify the image
docker run --rm hotcrm/app:latest node -e "console.log('HotCRM ready')"
```

### Health Checks

The application exposes a `/health` endpoint for container orchestration:

```bash
curl http://localhost:3000/health
```

## Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

### 2. Create Secrets

```bash
kubectl create secret generic hotcrm-secrets \
  --namespace hotcrm \
  --from-literal=database-url='postgresql://hotcrm:PASSWORD@db-host:5432/hotcrm' \
  --from-literal=redis-url='redis://redis-host:6379'
```

### 3. Deploy Application

```bash
# Deploy app, service, and ingress
kubectl apply -f k8s/deployment.yaml

# Deploy horizontal pod autoscaler
kubectl apply -f k8s/hpa.yaml
```

### 4. Verify Deployment

```bash
# Check pod status
kubectl get pods -n hotcrm

# Check service
kubectl get svc -n hotcrm

# Check ingress
kubectl get ingress -n hotcrm

# View logs
kubectl logs -n hotcrm -l app.kubernetes.io/name=hotcrm --tail=100
```

### Scaling

The HPA automatically scales between 2–10 replicas based on CPU (70%) and memory (80%) utilization.

Manual scaling:

```bash
kubectl scale deployment hotcrm-app -n hotcrm --replicas=5
```

### TLS Configuration

The Ingress expects a TLS secret named `hotcrm-tls`. Create it with:

```bash
kubectl create secret tls hotcrm-tls \
  --namespace hotcrm \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key
```

Or use cert-manager for automatic certificate provisioning.

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Ingress   │────▶│  HotCRM App │────▶│ PostgreSQL  │
│  (nginx)    │     │  (Node.js)  │     │  (Primary)  │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │    Redis    │
                    │   (Cache)   │
                    └─────────────┘
```

## Monitoring

### Resource Recommendations

| Component | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-----------|------------|-----------|----------------|--------------|
| HotCRM App | 250m | 1000m | 512Mi | 1Gi |
| PostgreSQL | 500m | 2000m | 1Gi | 4Gi |
| Redis | 100m | 500m | 256Mi | 512Mi |

### Log Aggregation

HotCRM outputs structured JSON logs to stdout, compatible with:

- **Kubernetes**: `kubectl logs` or any log aggregator (Fluentd, Loki)
- **Docker**: `docker compose logs -f`

## Troubleshooting

### Common Issues

**Pod CrashLoopBackOff**
```bash
kubectl describe pod -n hotcrm <pod-name>
kubectl logs -n hotcrm <pod-name> --previous
```

**Database Connection Refused**
- Verify the `DATABASE_URL` secret is correct
- Check that PostgreSQL is accessible from within the cluster

**High Memory Usage**
- Review the Redis `maxmemory` setting (default: 256MB)
- Check for memory leaks with `kubectl top pods -n hotcrm`

## Vercel Deployment (MSW Mode)

HotCRM can be deployed to **Vercel** as a fully client-side demo using **MSW (Mock Service Worker)** mode.
In this mode the ObjectStack Studio UI runs entirely in the browser — no server, database, or Redis required.
All API calls are intercepted by a service worker and served from an in-memory store.

### How It Works

1. `objectstack compile` produces a `dist/objectstack.json` artifact containing all metadata (objects, plugins, actions, triggers).
2. The pre-built `@objectstack/studio` SPA is a static Vite application that loads this artifact.
3. `@objectstack/plugin-msw` registers a Service Worker (`mockServiceWorker.js`) that intercepts REST requests.
4. `@objectstack/driver-memory` provides an in-memory data store so CRUD operations work without a real database.

```
Browser
┌──────────────────────────────────────────┐
│  Studio UI (React SPA)                   │
│        ↓  fetch("/api/...")              │
│  MSW Service Worker intercepts request   │
│        ↓                                 │
│  ObjectQL + Memory Driver                │
│  (reads objectstack.json metadata)       │
└──────────────────────────────────────────┘
```

### Prerequisites

- A [Vercel](https://vercel.com) account
- Node.js ≥ 20.9.0, pnpm ≥ 9

### Quick Start

```bash
# 1. Build the MSW bundle locally to verify
pnpm -w run build:msw

# 2. Preview locally
npx serve dist/studio
```

### Deploy to Vercel

The repository includes a `vercel.json` that configures the build automatically.

**Option A — Git Integration (recommended)**

1. Push the repository to GitHub.
2. Import the repository in the [Vercel Dashboard](https://vercel.com/new).
3. Vercel detects `vercel.json` and runs `pnpm -w run build:msw` automatically.
4. Every push to the default branch triggers a new deployment.

**Option B — Vercel CLI**

```bash
# Install the Vercel CLI
npm i -g vercel

# Deploy from the project root
vercel
```

### Configuration Reference (`vercel.json`)

| Field | Value | Purpose |
|-------|-------|---------|
| `buildCommand` | `pnpm -w run build:msw` | Compiles metadata and assembles the Studio SPA |
| `outputDirectory` | `dist/studio` | Static files served by Vercel |
| `installCommand` | `pnpm install` | Installs all workspace dependencies |
| `rewrites` | `/* → /index.html` | SPA client-side routing (excludes static assets) |

### Limitations

- **Data is ephemeral** — all records are stored in browser memory and lost on page refresh.
- **No authentication** — MSW mode does not enforce permissions or user sessions.
- **Demo / preview only** — this mode is designed for demos, design reviews, and CI previews, not production workloads.

For production deployments with persistent data, see [Docker Deployment](#docker-deployment) or [Kubernetes Deployment](#kubernetes-deployment) above.

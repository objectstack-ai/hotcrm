# Production Deployment Guide

This guide covers deploying HotCRM to production using Docker, Kubernetes, or Vercel.

## Prerequisites

- Node.js ≥ 20.9.0
- Docker ≥ 24.0 (for Docker/K8s deployments)
- kubectl ≥ 1.28 (for Kubernetes deployments)
- PostgreSQL 16+ (for Docker/K8s deployments)
- Redis 7+ (for Docker/K8s deployments)

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

## Vercel Deployment (Serverless Mode)

HotCRM can be deployed to **Vercel** as a serverless application using **Hono + Memory Driver** mode.
In this mode the full ObjectStack kernel runs server-side inside a Vercel Serverless Function — no external
database or Redis required. All data is stored in the function instance's memory.

### How It Works

1. A catch-all Vercel Serverless Function (`api/[[...route]].ts`) bootstraps the ObjectStack kernel on first request.
2. `@objectstack/driver-memory` provides an in-memory data store — zero external infrastructure needed.
3. `HonoHttpServer` from `@objectstack/plugin-hono-server` handles HTTP routing (without TCP listener).
4. `createRestApiPlugin()` auto-generates CRUD endpoints for all 65+ business objects.
5. The kernel instance is reused across warm invocations (Vercel Fluid Compute).
6. **Console UI** is served at `/console/` (default redirect from `/`) for data browsing and management.
7. **Studio UI** is served at `/_studio/` for metadata inspection and development.

```
Vercel Serverless Function
┌──────────────────────────────────────────┐
│  Request  →  Hono (Web Standard fetch)   │
│        ↓                                 │
│  ObjectStack Kernel                      │
│  ├── REST API Plugin (auto CRUD)         │
│  ├── Dispatcher Plugin (auth, graphql)   │
│  ├── 6 Business Plugins                  │
│  ├── Console UI (/console/)              │
│  ├── Studio UI (/_studio/)               │
│  └── InMemoryDriver (data store)         │
│        ↓                                 │
│  Response                                │
└──────────────────────────────────────────┘
```

### Prerequisites

- A [Vercel](https://vercel.com) account
- Node.js ≥ 20.9.0, pnpm ≥ 9

### Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Preview locally with Vercel CLI
npx vercel dev

# 3. Test API endpoints
curl http://localhost:3000/api/v1/account
```

### Deploy to Vercel

The repository includes a `vercel.json` that configures the deployment automatically.

**Option A — Git Integration (recommended)**

1. Push the repository to GitHub.
2. Import the repository in the [Vercel Dashboard](https://vercel.com/new).
3. Vercel detects `vercel.json` and deploys the serverless function automatically.
4. Every push to the default branch triggers a new deployment.

> **⚠️ IMPORTANT: Verify Vercel project settings**
>
> After importing the repository, go to **Project Settings → General → Build & Development Settings**
> in the Vercel Dashboard and ensure:
>
> - **Build Command**: Leave blank or set to `pnpm --filter @hotcrm/ai build` — do NOT set a custom
>   override. Vercel project settings **override** `vercel.json`, so any stale value here
>   (e.g. an old `echo 'Server mode — no build step required'`) will prevent the correct build
>   from running.
> - **Output Directory**: Leave blank (auto-detected).
> - **Install Command**: Leave blank or set to `pnpm install`.
> - **Framework Preset**: "Other" (no framework).
>
> If these fields have custom values from a previous configuration, **clear them** so that
> `vercel.json` is used as the source of truth.

**Option B — Vercel CLI**

```bash
# Install the Vercel CLI
npm i -g vercel

# Deploy from the project root
vercel deploy
```

### Build Process

The build step first patches `@object-ui/console` and `@objectstack/studio` pnpm symlinks
(replacing them with real copies for Vercel compatibility), then compiles all business plugin
packages. The 6 business plugin packages (CRM, Finance, Marketing, Products, Support, HR) plus
the AI utility library are built from TypeScript source to `dist/`.

```
Build pipeline:
  pnpm install                            ← install all workspace deps
  node scripts/patch-console-plugin.cjs   ← dereference pnpm symlinks for Console & Studio
  pnpm --filter @hotcrm/{ai,crm,...} build ← compile all business plugins → dist/
  @vercel/node compiles api/[[...route]].ts  ← bundles function + TS imports
```

### Configuration Reference (`vercel.json`)

| Field | Value | Purpose |
|-------|-------|---------|
| `installCommand` | `pnpm install` | Installs all workspace dependencies |
| `buildCommand` | `node scripts/patch-console-plugin.cjs && pnpm --filter ... build` | Patches pnpm symlinks for UI packages, then compiles all business plugins |
| `functions.memory` | `1024` MB | Memory allocated to the serverless function |
| `functions.maxDuration` | `60` s | Maximum execution time per request (Pro plan) |
| `functions.includeFiles` | `{packages/*/dist,node_modules/@object-ui/console/dist,node_modules/@objectstack/studio/dist}/**` | Bundles business plugin dist/ and Console/Studio SPA assets with the function |
| `rewrites` | `/(.*) → /api/[[...route]]` | Routes all requests to the catch-all handler |

### Architecture Details

The serverless function at `api/[[...route]].ts` uses a **singleton bootstrap pattern**:

- **First request (cold start)**: bootstraps the ObjectStack kernel, registers all plugins, creates the Hono app
- **Subsequent requests (warm)**: reuses the existing kernel and in-memory data (Vercel Fluid Compute)
- **Cold start after idle**: data resets — a fresh kernel is bootstrapped

The function does **not** use `HonoServerPlugin` (which binds to a TCP port). Instead, it manually creates
a `HonoHttpServer`, registers it as the `http.server` service, and uses the `handle()` adapter from
`@hono/node-server/vercel` to convert the Hono app into a standard Node.js serverless handler
(`(IncomingMessage, ServerResponse) => void`) that Vercel's `@vercel/node` runtime recognises.

### Data Behavior

- Data lives in the function instance's process memory
- Warm invocations **share data** — records created in one request are visible in the next
- After ~5–15 minutes of inactivity, Vercel recycles the instance (cold start) and data resets
- For persistent data, see [Docker Deployment](#docker-deployment) or configure an external database

### Limitations

- **Data is ephemeral** — records persist only while the function instance is warm; data resets on cold start.
- **No authentication** — this mode does not enforce permissions or user sessions out of the box.
- **No WebSocket** — Vercel Serverless Functions do not support persistent connections.
- **Cold start latency** — the first request after idle may take 2–5 seconds for kernel bootstrap.
- **Demo / staging only** — designed for demos, design reviews, and CI previews, not production workloads.

For production deployments with persistent data, see [Docker Deployment](#docker-deployment) or [Kubernetes Deployment](#kubernetes-deployment) above.

### Troubleshooting

**Deployment shows 404 for all routes**

1. **Check build command override**: Go to Vercel Dashboard → Project Settings → General →
   Build & Development Settings. If the Build Command field has a custom value, clear it so
   `vercel.json` is used. The most common cause of 404 is an overridden build command that
   prevents `@hotcrm/ai` from being compiled.

2. **Verify the build log**: The build log should show:
   ```
   Running "pnpm --filter @hotcrm/ai build"
   > @hotcrm/ai@1.0.0 build
   > tsc
   ```
   If it instead shows `Server mode — no build step required` or any other message, the
   `vercel.json` buildCommand is being overridden by project settings.

3. **Check function deployment**: After deployment, go to the Vercel Dashboard → Project →
   Functions tab. You should see `api/[[...route]]` listed as a serverless function. If it's
   not listed, the function was not compiled — check for TypeScript errors in the build log.

4. **Cold start timeout**: The first request after deployment can take 2–5 seconds. If you get
   a 504 timeout, consider increasing `maxDuration` in `vercel.json`.

**Build command fails**

- The `@hotcrm/ai` package must build successfully before the function can be bundled.
  If it fails, check for TypeScript errors in `packages/ai/src/`.
- Do NOT use `pnpm -r build` — several packages have TypeScript errors that prevent
  compilation. Only `@hotcrm/ai` needs to be built.

### Legacy: MSW (Static) Mode

The previous MSW deployment mode (fully client-side with Service Worker) is still available via:

```bash
pnpm -w run build:msw
npx serve dist/studio
```

This produces a static SPA where all API calls are intercepted by a browser Service Worker.
Data is stored in browser memory and lost on page refresh. See `scripts/build-msw.sh` for details.

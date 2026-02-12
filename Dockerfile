# HotCRM Production Dockerfile
# Multi-stage build for minimal production image

# Stage 1: Build
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy dependency manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/
COPY packages/crm/package.json packages/crm/
COPY packages/finance/package.json packages/finance/
COPY packages/hr/package.json packages/hr/
COPY packages/marketing/package.json packages/marketing/
COPY packages/products/package.json packages/products/
COPY packages/support/package.json packages/support/
COPY packages/ai/package.json packages/ai/
COPY packages/server/package.json packages/server/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Copy source
COPY . .

# Build all packages
RUN pnpm run build

# Prune dev dependencies
RUN pnpm prune --prod

# Stage 2: Production
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@9 --activate

# Add non-root user
RUN addgroup -S hotcrm && adduser -S hotcrm -G hotcrm

WORKDIR /app

# Copy built artifacts and production dependencies
COPY --from=builder --chown=hotcrm:hotcrm /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=hotcrm:hotcrm /app/node_modules ./node_modules
COPY --from=builder --chown=hotcrm:hotcrm /app/packages ./packages
COPY --from=builder --chown=hotcrm:hotcrm /app/objectstack.config.ts ./

# Switch to non-root user
USER hotcrm

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/health || exit 1

# Expose default port
EXPOSE 3000

# Runtime environment
ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "packages/server/dist/index.js"]

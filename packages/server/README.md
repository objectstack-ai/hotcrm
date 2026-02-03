# @hotcrm/server

HotCRM Application Server - The runtime environment that orchestrates all HotCRM packages.

## Overview

This package provides the application server that initializes the ObjectStack kernel, loads all business packages (CRM, Finance, HR, Marketing, Products, Support), and exposes REST APIs and web interfaces.

**Package Purpose:** Runtime server and application orchestration

## What's Included

### Server Infrastructure

- **ObjectStack Kernel**: Core runtime engine from `@objectstack/runtime`
- **Hono Web Server**: Fast, lightweight HTTP server via `@objectstack/plugin-hono-server`
- **Database Driver**: SQLite driver with ObjectQL query interface
- **Plugin System**: Dynamic plugin loading and initialization

### Integrated Business Packages

The server automatically loads and initializes:

| Package | Description |
|---------|-------------|
| `@hotcrm/crm` | Sales & Marketing (13 objects, 8 AI actions, 7 hooks) |
| `@hotcrm/finance` | Finance & Contracts (4 objects, 3 AI actions, 1 hook) |
| `@hotcrm/hr` | Human Capital Management (16 objects, 3 AI actions, 4 hooks) |
| `@hotcrm/marketing` | Campaign Management (2 objects, 3 AI actions, 8 hooks) |
| `@hotcrm/products` | CPQ & Pricing (9 objects, 3 AI actions, 3 hooks) |
| `@hotcrm/support` | Customer Support (21 objects, 3 AI actions, 6 hooks) |

**Total System:** 65 Objects | 23 AI Actions | 29 Automation Hooks

## Configuration

### objectstack.config.ts

The server configuration file defines which plugins to load:

```typescript
import { CRMPlugin } from '@hotcrm/crm';
import { FinancePlugin } from '@hotcrm/finance';
import { HRPlugin } from '@hotcrm/hr';
import { MarketingPlugin } from '@hotcrm/marketing';
import { ProductsPlugin } from '@hotcrm/products';
import { SupportPlugin } from '@hotcrm/support';

export default {
  plugins: [
    CRMPlugin,
    FinancePlugin,
    HRPlugin,
    MarketingPlugin,
    ProductsPlugin,
    SupportPlugin
  ]
};
```

### Environment Variables

```bash
# Server port (default: 3000)
PORT=3000

# Database configuration
DATABASE_TYPE=sqlite
DATABASE_PATH=hotcrm.db

# Or use MongoDB
DATABASE_TYPE=mongodb
MONGODB_URI=mongodb://localhost:27017/hotcrm

# AI/ML Provider Keys (optional)
OPENAI_API_KEY=sk-...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AZURE_ML_ENDPOINT=...
```

## Running the Server

### Development Mode
```bash
# From root directory
pnpm --filter @hotcrm/server dev

# Or from server directory
cd packages/server
pnpm dev
```

### Production Build
```bash
# Build all packages
pnpm build

# Build server only
pnpm --filter @hotcrm/server build

# Start production server
pnpm --filter @hotcrm/server start
```

### Direct Execution
```bash
# Using ts-node
cd packages/server
ts-node src/index.ts

# Using node (after build)
node dist/src/index.js
```

## Server Architecture

### Initialization Flow

1. **Kernel Bootstrap**: Initialize ObjectStack kernel
2. **Driver Plugin**: Register SQLite/MongoDB database driver
3. **ObjectQL Service**: Create query interface for database operations
4. **Hono Server**: Initialize HTTP server on specified port
5. **Business Plugins**: Load and initialize all business packages
6. **REST API**: Auto-generate REST endpoints for all objects
7. **Ready**: Server listening for requests

### Services Available

Once the server starts, the following services are available:

- **ObjectQL**: Query interface (`ctx.objectql.find()`, `ctx.objectql.create()`, etc.)
- **HTTP Server**: REST API endpoints
- **Plugin Registry**: Access to all loaded plugins
- **Event System**: Hook execution and event broadcasting
- **AI Services**: ML model inference and predictions

## REST API

The server automatically generates REST endpoints for all objects:

```bash
# CRM endpoints
GET    /api/v1/account
POST   /api/v1/account
GET    /api/v1/account/:id
PUT    /api/v1/account/:id
DELETE /api/v1/account/:id

# Finance endpoints
GET    /api/v1/contract
POST   /api/v1/contract

# HR endpoints
GET    /api/v1/employee
POST   /api/v1/employee

# Marketing endpoints
GET    /api/v1/campaign
POST   /api/v1/campaign

# Products endpoints
GET    /api/v1/product
GET    /api/v1/quote

# Support endpoints
GET    /api/v1/case
POST   /api/v1/case
```

## Server Logs

Example startup log:

```
Starting HotCRM Server via Custom Runner...
Registering plugin: CRM Plugin
Registering plugin: Finance Plugin
Registering plugin: HR Plugin
Registering plugin: Marketing Plugin
Registering plugin: Products Plugin
Registering plugin: Support Plugin
Aliased objectql service to driver
Initializing database schema...
Loading 65 objects...
Registering 23 AI actions...
Installing 29 automation hooks...
HTTP server listening on port 3000
HotCRM Server is running!
```

## Architecture Principles

### Plugin-Based Monorepo
- Each business domain is a self-contained plugin
- Server orchestrates all plugins without business logic
- Clean separation between runtime and business logic

### ObjectStack Runtime
- Built on `@objectstack/runtime` engine (v0.9.0)
- Metadata-driven architecture
- No custom SQL queries - all via ObjectQL

### Database Agnostic
- SQLite for development and small deployments
- MongoDB for production scale
- Driver abstraction via ObjectStack

## Development

### Adding a New Plugin

1. Create plugin in `packages/new-domain/`
2. Export plugin from `packages/new-domain/src/plugin.ts`
3. Add to `packages/server/objectstack.config.ts`
4. Rebuild and restart server

### Hot Reload (Development)

The server uses `ts-node` in dev mode for quick iteration:

```bash
# Terminal 1: Watch and build packages
pnpm --filter @hotcrm/crm dev
pnpm --filter @hotcrm/finance dev

# Terminal 2: Run server with auto-reload
pnpm --filter @hotcrm/server dev
```

## Monitoring & Operations

### Health Check

```bash
curl http://localhost:3000/health
```

### Database Inspection

```bash
# SQLite
sqlite3 hotcrm.db
.tables
.schema account

# MongoDB
mongosh
use hotcrm
db.account.findOne()
```

### Logs

Server uses `pino` for structured logging:

```json
{
  "level": "info",
  "time": 1707000000000,
  "msg": "HotCRM Server is running!",
  "port": 3000
}
```

## License

MIT - Part of the HotCRM project

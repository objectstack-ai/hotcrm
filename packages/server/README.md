# @hotcrm/server

Express server and REST APIs for HotCRM - Application assembly and HTTP interface.

## Overview

This package provides the HTTP server and REST API endpoints for the HotCRM system. It serves as the application assembly layer, integrating all domain packages (@hotcrm/crm, @hotcrm/support, @hotcrm/products, @hotcrm/finance) and exposing them through a unified API.

### Runtime Architecture

Currently using the local ObjectQL implementation from `@hotcrm/core` while preparing for migration to the official `@objectstack/runtime` (v0.6.1). The runtime dependencies are installed and ready, but cannot be used yet due to ESM compatibility issues in the published packages. See [UPGRADE_NOTES.md](../../UPGRADE_NOTES.md) for details.

## Key Features

- **RESTful APIs**: Standard REST endpoints for all CRM operations
- **ObjectQL Query Interface**: Flexible, type-safe data querying
- **Health Monitoring**: Status and health check endpoints
- **Dashboard KPIs**: Real-time metrics and analytics endpoints
- **AI Integration**: AI-powered features and insights APIs
- **CORS Support**: Cross-origin resource sharing for web clients
- **Error Handling**: Comprehensive error handling and logging

## API Endpoints

### System Health
```bash
GET /health
```
Returns server health status and uptime information.

### ObjectQL Query Interface
```bash
POST /api/query
Content-Type: application/json

{
  "object": "Account",
  "fields": ["Name", "Industry", "AnnualRevenue"],
  "filters": {
    "Industry": { "$in": ["Technology", "Finance"] },
    "AnnualRevenue": { "$gt": 10000000 }
  },
  "orderBy": { "field": "AnnualRevenue", "direction": "desc" },
  "limit": 50
}
```
Execute flexible ObjectQL queries against any CRM object.

### Object CRUD Operations

```bash
# Create a record
POST /api/objects/:objectName
Content-Type: application/json
{ "Name": "Acme Corp", "Industry": "Technology" }

# Read a single record
GET /api/objects/:objectName/:id

# Update a record
PUT /api/objects/:objectName/:id
Content-Type: application/json
{ "Industry": "Software" }

# Delete a record
DELETE /api/objects/:objectName/:id

# List records
GET /api/objects/:objectName
```

### Dashboard KPIs
```bash
GET /api/kpi/revenue        # Total revenue metrics
GET /api/kpi/leads          # Lead generation statistics
GET /api/kpi/winrate        # Win rate calculation
GET /api/pipeline/stages    # Pipeline by stage breakdown
GET /api/activities/recent  # Recent activity feed
```

### AI-Powered Features
```bash
POST /api/ai/smart-briefing
Content-Type: application/json

{
  "accountId": "acc_123",
  "activityLimit": 10
}
```
Generate AI-powered account briefings with insights and recommendations.

### UI Configuration
```bash
GET /api/ui/dashboard/sales
```
Retrieve sales dashboard configuration for frontend rendering.

## Running the Server

### Prerequisites
- Node.js 18+ installed
- pnpm 9+ installed
- All dependencies installed (`pnpm install` from root)

### Development Mode
```bash
# Start development server with hot reload
pnpm --filter @hotcrm/server dev

# Or from the root
pnpm dev
```

The server will start on `http://localhost:3000` by default.

### Production Build and Deployment
```bash
# Build all packages including server
pnpm build

# Or build server specifically
pnpm --filter @hotcrm/server build

# Start production server
pnpm --filter @hotcrm/server start

# Or from root
pnpm start
```

## Configuration

### Environment Variables

Create a `.env` file in the server package or root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
HOST=0.0.0.0

# Database Configuration (when implemented)
DATABASE_URL=postgresql://user:pass@localhost:5432/hotcrm

# AI/ML Services (when implemented)
OPENAI_API_KEY=your-api-key-here
```

### Server Configuration

The server integrates with all domain packages and runtime dependencies:

**Domain Packages:**
- **@hotcrm/core** - ObjectQL engine and type definitions
- **@hotcrm/crm** - CRM schemas, hooks, and actions
- **@hotcrm/support** - Support schemas and features
- **@hotcrm/products** - Product and pricing schemas
- **@hotcrm/finance** - Finance schemas and features
- **@hotcrm/ui** - Dashboard and component configurations

**ObjectStack Runtime (v0.6.1):**
- **@objectstack/core** - Core kernel and plugin system
- **@objectstack/runtime** - Runtime engine and plugin management
- **@objectstack/objectql** - Official ObjectQL implementation
- **@objectstack/driver-memory** - In-memory data driver

> **Note:** While runtime dependencies are installed, they are not yet in use due to ESM compatibility issues. The server currently uses the local ObjectQL implementation from `@hotcrm/core`. Migration to the official runtime will occur once the upstream packages are fixed. See [UPGRADE_NOTES.md](../../UPGRADE_NOTES.md) for details.

## Architecture

### Application Assembly

The server package follows the **Assembly Layer** pattern:
- Does NOT contain business logic
- Integrates domain packages
- Provides HTTP interface
- Handles routing and middleware
- Manages server lifecycle

### Request Flow

```
Client Request
    ↓
Express Middleware (CORS, JSON parsing)
    ↓
Route Handler
    ↓
Domain Package (Business Logic)
    ↓
@hotcrm/core (Data Access via ObjectQL)
    ↓
Response
```

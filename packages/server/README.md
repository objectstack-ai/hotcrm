# @hotcrm/server

Express server and REST APIs for HotCRM.

## Overview

This package provides the HTTP server and REST API endpoints for the HotCRM system.

## Features

- **RESTful APIs**: Standard REST endpoints for all operations
- **ObjectQL Endpoint**: Query interface for flexible data access
- **Health Checks**: Monitoring and status endpoints
- **Dashboard KPIs**: Real-time metrics endpoints
- **AI Integration**: AI-powered features and insights
- **CORS Support**: Cross-origin resource sharing enabled

## API Endpoints

### Health Check
```bash
GET /health
```

### ObjectQL Query
```bash
POST /api/query
Content-Type: application/json

{
  "object": "Account",
  "fields": ["Name", "Industry"],
  "filters": { "Status": "Active" }
}
```

### Object CRUD Operations

```bash
# Create
POST /api/objects/:objectName

# Read
GET /api/objects/:objectName/:id

# Update
PUT /api/objects/:objectName/:id

# Delete
DELETE /api/objects/:objectName/:id
```

### Dashboard KPIs
```bash
GET /api/kpi/revenue
GET /api/kpi/leads
GET /api/kpi/winrate
GET /api/pipeline/stages
GET /api/activities/recent
```

### AI Features
```bash
POST /api/ai/smart-briefing
```

### UI Configuration
```bash
GET /api/ui/dashboard/sales
```

## Running the Server

### Development
```bash
pnpm --filter @hotcrm/server dev
```

### Production Build
```bash
pnpm --filter @hotcrm/server build
pnpm --filter @hotcrm/server start
```

## Environment Variables

Create a `.env` file:

```env
PORT=3000
NODE_ENV=development
```

## Dependencies

This package depends on:
- `@hotcrm/core` - Core engine and ObjectQL
- `@hotcrm/metadata` - Business object definitions
- `@hotcrm/hooks` - Business logic triggers
- `@hotcrm/actions` - Custom actions
- `@hotcrm/ui` - UI components and dashboards

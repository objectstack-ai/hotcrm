# Quick Start Guide

Get up and running with HotCRM in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Basic understanding of TypeScript/JavaScript

## Installation

```bash
# Clone the repository
git clone https://github.com/hotcrm/hotcrm.git
cd hotcrm

# Install dependencies
npm install
```

## Development

```bash
# Start the development server
npm run dev
```

The server will start on `http://localhost:3000`.

## Verify Installation

### 1. Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-26T10:00:00.000Z",
  "version": "1.0.0"
}
```

### 2. View Sales Dashboard

```bash
curl http://localhost:3000/api/ui/dashboard/sales
```

Returns the complete ObjectUI configuration for the sales dashboard.

### 3. Test AI Smart Briefing

```bash
curl -X POST http://localhost:3000/api/ai/smart-briefing \
  -H "Content-Type: application/json" \
  -d '{"accountId": "test-account-001"}'
```

## Project Structure

```
hotcrm/
├── src/
│   ├── metadata/           # Object definitions (.object.yml)
│   │   ├── Account.object.yml
│   │   ├── Contact.object.yml
│   │   ├── Opportunity.object.yml
│   │   └── Contract.object.yml
│   ├── triggers/           # Business automation logic
│   │   └── OpportunityTrigger.ts
│   ├── actions/            # ObjectStack Actions (API endpoints)
│   │   └── AISmartBriefing.ts
│   ├── ui/                 # UI configurations
│   │   ├── dashboard/
│   │   │   └── SalesDashboard.ts
│   │   └── components/
│   │       └── AISmartBriefingCard.ts
│   ├── engine/             # Core engine (ObjectQL, etc.)
│   │   └── objectql.ts
│   └── server.ts           # Main server entry
├── docs/                   # Documentation
│   ├── OBJECTSTACK_SPEC.md
│   ├── AI_PROMPT_GUIDE.md
│   └── EXAMPLES.md
├── package.json
├── tsconfig.json
└── tailwind.config.js
```

## Core Concepts

### 1. Objects (Metadata)

All business objects are defined in YAML files:

```yaml
# src/metadata/Account.object.yml
name: Account
label: 客户
fields:
  - name: Name
    type: text
    label: 客户名称
    required: true
  - name: Industry
    type: select
    label: 行业
    options:
      - label: 科技/互联网
        value: Technology
```

### 2. ObjectQL (Query Language)

Type-safe queries instead of SQL:

```typescript
import { db } from './src/engine/objectql';

const accounts = await db.query({
  object: 'Account',
  fields: ['Name', 'Industry', 'AnnualRevenue'],
  filters: {
    Industry: 'Technology',
    AnnualRevenue: { $gt: 10000000 }
  },
  limit: 50
});
```

### 3. Triggers (Business Logic)

Automated workflows triggered by data changes:

```typescript
// src/triggers/OpportunityTrigger.ts
export async function onOpportunityStageChange(ctx: TriggerContext) {
  if (ctx.new.Stage === 'Closed Won') {
    // Auto-create contract
    await ctx.db.doc.create('Contract', {...});
    // Update account status
    await ctx.db.doc.update('Account', {...});
  }
}
```

### 4. UI (ObjectUI + Tailwind)

Declarative UI configurations:

```typescript
// src/ui/dashboard/SalesDashboard.ts
export const salesDashboard = {
  type: "page",
  className: "bg-gradient-to-br from-gray-50 to-gray-100",
  body: [
    {
      type: "card",
      className: "rounded-2xl shadow-sm",
      body: [...]
    }
  ]
};
```

### 5. AI Actions

AI-powered features built-in:

```typescript
// src/actions/AISmartBriefing.ts
const briefing = await executeSmartBriefing({
  accountId: 'acc-001',
  activityLimit: 10
});
// Returns: summary, nextSteps, talkingPoints, sentiment, score
```

## Common Tasks

### Create a New Object

1. Create a new `.object.yml` file in `src/metadata/`
2. Define fields, relationships, and views
3. Restart the server

Example:
```yaml
# src/metadata/Lead.object.yml
name: Lead
label: 线索
fields:
  - name: FirstName
    type: text
    label: 名
  - name: LastName
    type: text
    label: 姓
    required: true
  - name: Company
    type: text
    label: 公司
    required: true
```

### Add a Trigger

1. Create a new `.ts` file in `src/triggers/`
2. Implement the trigger function
3. Reference it in the object's YAML:

```yaml
# In your object definition
triggers:
  - name: MyTrigger
    event: afterUpdate
    file: triggers/MyTrigger.ts
```

### Create a UI Component

1. Create a new `.ts` file in `src/ui/components/`
2. Export an ObjectUI configuration object
3. Use it in your pages

### Add an API Endpoint

Edit `src/server.ts` and add your route:

```typescript
app.post('/api/my-endpoint', async (req, res) => {
  // Your logic here
  res.json({ success: true });
});
```

## REST API Endpoints

### Objects CRUD

- `POST /api/objects/:objectName` - Create record
- `GET /api/objects/:objectName/:id` - Get record
- `PUT /api/objects/:objectName/:id` - Update record
- `DELETE /api/objects/:objectName/:id` - Delete record

### Query

- `POST /api/query` - Execute ObjectQL query

### Dashboard

- `GET /api/kpi/revenue` - Revenue KPI
- `GET /api/kpi/leads` - Leads KPI
- `GET /api/kpi/winrate` - Win rate KPI
- `GET /api/pipeline/stages` - Pipeline data
- `GET /api/activities/recent` - Recent activities

### AI

- `POST /api/ai/smart-briefing` - AI customer insights

### UI

- `GET /api/ui/dashboard/sales` - Sales dashboard config

## Example Workflows

### Create and Win an Opportunity

```bash
# 1. Create opportunity
curl -X POST http://localhost:3000/api/objects/Opportunity \
  -H "Content-Type: application/json" \
  -d '{
    "Name": "Big Deal",
    "AccountId": "acc-001",
    "Amount": 500000,
    "Stage": "Prospecting",
    "CloseDate": "2024-03-31"
  }'

# 2. Update to Closed Won (triggers automation)
curl -X PUT http://localhost:3000/api/objects/Opportunity/opp-001 \
  -H "Content-Type: application/json" \
  -d '{"Stage": "Closed Won"}'

# Trigger automatically:
# - Creates Contract
# - Updates Account status
# - Sends notification
```

## Build for Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## Next Steps

1. **Read the Documentation**
   - [OBJECTSTACK_SPEC.md](./docs/OBJECTSTACK_SPEC.md) - Protocol details
   - [AI_PROMPT_GUIDE.md](./docs/AI_PROMPT_GUIDE.md) - AI prompting
   - [EXAMPLES.md](./docs/EXAMPLES.md) - Code examples

2. **Explore the Code**
   - Browse object definitions in `src/metadata/`
   - Study triggers in `src/triggers/`
   - Review UI components in `src/ui/`

3. **Customize**
   - Add your own objects
   - Create custom triggers
   - Design new dashboards
   - Integrate with your systems

4. **Deploy**
   - Set up a database (PostgreSQL, MongoDB, etc.)
   - Configure environment variables
   - Deploy to your cloud provider

## Getting Help

- Check the [Examples](./docs/EXAMPLES.md) for common use cases
- Read the [Protocol Spec](./docs/OBJECTSTACK_SPEC.md) for detailed info
- Review the [AI Guide](./docs/AI_PROMPT_GUIDE.md) for prompting tips

## Contributing

Contributions are welcome! Please read our contributing guidelines first.

## License

MIT License - see LICENSE file for details.

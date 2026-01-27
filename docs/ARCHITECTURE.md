# HotCRM Architecture

This document describes the architecture of HotCRM, a world-class enterprise CRM system built on the @objectstack/spec protocol.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ ObjectUI │  │   Tailwind   │  │  Components  │          │
│  │   Engine     │  │     CSS      │  │   Library    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                            ▲
                            │ REST API / JSON
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Express    │  │   Actions    │  │   Triggers   │          │
│  │   Server     │  │   (AI/API)   │  │   (Logic)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                            ▲
                            │ ObjectQL
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   ObjectQL   │  │   Metadata   │  │   Database   │          │
│  │   Engine     │  │   Registry   │  │   (Future)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Metadata Layer

The foundation of the system, where all objects are defined declaratively.

```
src/metadata/
├── Account.object.yml       # Customer/company objects
├── Contact.object.yml       # Individual contacts
├── Opportunity.object.yml   # Sales pipeline
└── Contract.object.yml      # Contract management

Each file contains:
- Field definitions
- Relationships
- Validation rules
- List views
- Page layouts
- Triggers
```

### 2. Engine Layer

The core processing engine that interprets metadata and executes operations.

```
src/engine/
└── objectql.ts              # ObjectQL query engine

Provides:
- Type-safe queries
- CRUD operations
- Batch operations
- Relationship traversal
```

### 3. Business Logic Layer

Implements automated workflows and business rules.

```
src/triggers/
└── OpportunityTrigger.ts    # Opportunity automation

Features:
- Event-driven execution
- Access to old/new record states
- Full database access via ObjectQL
- Error handling & logging
```

### 4. API Layer

RESTful API endpoints for UI and external integrations.

```
src/server.ts                # Main Express server

Endpoints:
- Object CRUD: /api/objects/:object/:id
- Query: /api/query
- Dashboard: /api/kpi/*, /api/pipeline/*
- AI: /api/ai/smart-briefing
- UI Config: /api/ui/dashboard/sales
```

### 5. AI Layer

AI-powered features for enhanced user experience.

```
src/actions/
└── AISmartBriefing.ts       # AI customer insights

Capabilities:
- Activity analysis
- Email parsing
- Sentiment detection
- Personalized recommendations
- Industry-specific insights
```

### 6. UI Layer

Modern, declarative UI configurations using ObjectUI + Tailwind.

```
src/ui/
├── dashboard/
│   └── SalesDashboard.ts    # Sales executive dashboard
└── components/
    └── AISmartBriefingCard.ts # AI briefing component

Design Principles:
- Apple/Linear aesthetics
- Responsive layouts
- Loading states
- Error handling
```

## Data Flow

### Read Operation

```
User Request
    ↓
Express Server (/api/query)
    ↓
ObjectQL Engine (parse query)
    ↓
Metadata Registry (validate)
    ↓
Database (execute)
    ↓
Response (JSON)
```

### Write Operation with Trigger

```
User Request (Create/Update)
    ↓
Express Server (/api/objects/:object)
    ↓
Validation (rules from metadata)
    ↓
Before Trigger (if defined)
    ↓
Database Operation
    ↓
After Trigger (if defined)
    ├── Auto-create related records
    ├── Update other records
    └── Send notifications
    ↓
Response (JSON)
```

### AI Feature Flow

```
User Action (view account)
    ↓
UI Component (AISmartBriefingCard)
    ↓
API Request (/api/ai/smart-briefing)
    ↓
AI Action (AISmartBriefing.ts)
    ├── Query activities (ObjectQL)
    ├── Query emails (ObjectQL)
    └── Build context
    ↓
LLM API (OpenAI/Anthropic)
    ↓
Parse Response
    ├── Summary (200 words)
    ├── Next steps (3-5 items)
    ├── Talking points (3-5 items)
    └── Sentiment/Score
    ↓
Response to UI
    ↓
Render in Card Component
```

## Design Patterns

### 1. Metadata-Driven

Everything is defined in YAML/JSON metadata:
- No hardcoded schema
- AI-friendly structure
- Version controllable
- Easily extensible

### 2. Declarative UI

UI is configuration, not code:
- JSON schema (ObjectUI)
- Tailwind classes for styling
- Service-based data fetching
- Composable components

### 3. Event-Driven

Triggers respond to data changes:
- Before/After events
- Access to old/new states
- Full database access
- Async execution

### 4. Type-Safe

TypeScript throughout:
- Compile-time checks
- IntelliSense support
- Self-documenting
- Fewer runtime errors

### 5. AI-Native

AI integrated from the ground up:
- Smart briefings
- Predictive analytics
- Natural language queries (future)
- Auto-suggestions

## Scalability

### Horizontal Scaling

```
Load Balancer
    ├── Server Instance 1
    ├── Server Instance 2
    └── Server Instance 3
          ↓
    Shared Database
```

### Caching Strategy

```
┌─────────────────────────────────────┐
│  Redis Cache                        │
│  - Metadata definitions             │
│  - Frequently accessed records      │
│  - Dashboard KPIs                   │
└─────────────────────────────────────┘
          ▲
          │
┌─────────────────────────────────────┐
│  Application Servers                │
│  - Cache miss → DB query            │
│  - Cache hit → Fast response        │
└─────────────────────────────────────┘
```

### Database Optimization

```
┌─────────────────────────────────────┐
│  PostgreSQL/MongoDB                 │
│  - Indexes on searchable fields     │
│  - Partitioning for large tables    │
│  - Read replicas for queries        │
│  - Write master for updates         │
└─────────────────────────────────────┘
```

## Security Layers

### 1. Authentication

```
User → OAuth 2.0 / JWT → Verify Token → Grant Access
```

### 2. Authorization

```
Request → Check User Role → Check Object Permissions → Allow/Deny
```

### 3. Row-Level Security

```
Query → Add OwnerId Filter → Return Only User's Records
```

### 4. Field-Level Security

```
Response → Remove Hidden Fields → Return Visible Fields Only
```

### 5. Audit Trail

```
All Changes → Audit Log → Who, What, When, Old/New Values
```

## Deployment Architecture

### Development

```
Developer Machine
    ├── npm run dev (ts-node-dev)
    ├── Hot reload
    └── Mock data
```

### Staging

```
Docker Container
    ├── Node.js Server
    ├── PostgreSQL Database
    └── Redis Cache
```

### Production

```
Cloud Provider (AWS/GCP/Azure)
    ├── Load Balancer
    ├── Auto-scaling Group
    │   ├── Server Instance 1
    │   ├── Server Instance 2
    │   └── Server Instance N
    ├── RDS/Cloud SQL (Database)
    ├── ElastiCache/Memorystore (Cache)
    └── S3/Cloud Storage (Files)
```

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Language**: TypeScript 5+
- **Framework**: Express.js 4+
- **Query Language**: ObjectQL (custom)

### Frontend
- **UI Framework**: amis 6+
- **Styling**: Tailwind CSS 3+
- **State**: Service-based (amis)

### Data
- **Database**: PostgreSQL/MongoDB (future)
- **Cache**: Redis (future)
- **Files**: S3/Cloud Storage (future)

### AI/ML
- **LLM**: OpenAI/Anthropic APIs
- **Analytics**: Custom algorithms

### DevOps
- **CI/CD**: GitHub Actions
- **Containers**: Docker
- **Orchestration**: Kubernetes (optional)
- **Monitoring**: Prometheus + Grafana (future)

## Extension Points

### 1. Custom Objects

Add new `.object.yml` files to define custom business objects.

### 2. Custom Triggers

Implement business logic in TypeScript trigger files.

### 3. Custom Actions

Create new API endpoints for specialized functionality.

### 4. Custom UI

Build new dashboards and components using amis.

### 5. Custom Integrations

Connect to external systems via REST/GraphQL/webhooks.

## Performance Characteristics

### Response Times (Target)

- Simple query: < 50ms
- Complex query with joins: < 200ms
- Dashboard load: < 500ms
- AI briefing: < 3s

### Throughput (Target)

- Read ops: 1000+ req/sec
- Write ops: 100+ req/sec
- Concurrent users: 10,000+

### Storage (Estimate)

- Per user: ~10 MB/year
- 1000 users: ~10 GB/year
- Metadata: < 1 MB

## Future Enhancements

1. **Real Database Integration**
   - PostgreSQL for relational data
   - MongoDB for flexible schemas
   - Redis for caching

2. **Advanced AI Features**
   - Natural language queries
   - Predictive lead scoring
   - Automated email composition
   - Smart scheduling

3. **Mobile Apps**
   - Native iOS app
   - Native Android app
   - React Native option

4. **Workflow Builder**
   - Visual workflow designer
   - No-code automation
   - Approval processes

5. **Reporting Engine**
   - Custom report builder
   - Scheduled reports
   - Export to Excel/PDF

6. **Integration Hub**
   - Pre-built connectors
   - Email sync (Gmail, Outlook)
   - Calendar integration
   - Slack/Teams notifications

## Conclusion

HotCRM's architecture is designed for:
- **Flexibility**: Metadata-driven, easy to customize
- **Scalability**: Horizontal scaling, caching
- **Maintainability**: Type-safe, well-documented
- **Modern UX**: Apple/Linear aesthetics
- **AI-Native**: Built-in intelligent features

This architecture supports rapid development while maintaining enterprise-grade quality and performance.

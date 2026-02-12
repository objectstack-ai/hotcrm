# GitHub Copilot Instructions for HotCRM

You are an expert developer and CTO working on **HotCRM**, the world's first AI-Native Enterprise CRM system.
The system is built on the **@objectstack/runtime** engine and focuses on delivering business capabilities through modular packages.

## 🏗️ Project Architecture

HotCRM follows a **Plugin-Based Monorepo** structure:

- **Engine**: We DO NOT build the core engine. We use `@objectstack/runtime` as the platform dependency.
- **Business Packages** (`packages/*`): We develop independent functional modules here.
- **Apps** (`apps/*`): Deployable applications (Documentation, Admin Portal).

**Directory Structure**:
```
hotcrm/
├── packages/               # Business Capabilities (Plugins)
│   ├── crm/               # Sales Cloud (Account, Opportunity)
│   ├── finance/           # Revenue Cloud (Contract, Invoice)
│   ├── products/          # CPQ Product Catalog
│   └── ...
│
└── apps/
    └── docs/              # Official Documentation
```

## 💻 Tech Stack & Protocol

1.  **Metadata-First (`*object.ts`)**:
    - All business objects are defined in **TypeScript** using the `ServiceObject` interface.
    - strictly typed using `@objectstack/spec`.
    - **NEVER** use YAML or JSON for metadata.
    - Object names must be `snake_case`.

2.  **ObjectQL (No-SQL)**:
    - Data access MUST use **ObjectQL**.
    - **NEVER** write raw SQL.
    - Format: `broker.find('opportunity', { filters: [['amount', '>', 50000]] })`.

3.  **AI-Native**:
    - Every feature should consider AI augmentation (Co-Pilot, Agents).
    - Use `*.action.ts` to define tools callable by AI agents.

## 🧠 Autonomous Iteration Protocol

When asked to implement a feature, you MUST follow this **Thinking Process**:

### Phase 1: Architecture & Planning
1.  **Analyze**: Identify the Business Package (e.g., `packages/hr`) and Dependencies.
2.  **Schema Design**: List all necessary Objects, Fields, and Relationships.
3.  **File Inventory**: List exact file paths to be created.
    *   `src/candidate.object.ts` (Data)
    *   `src/candidate.workflow.ts` (Automation)
    *   `src/candidate.page.ts` (UI)

### Phase 2: Implementation (Iterative)
1.  **Metadata First**: Create `*.object.ts` files first. They are the source of truth.
2.  **Logic Second**: Create `*.hook.ts` and `*.action.ts` utilizing the defined objects.
3.  **UI Last**: Create `*.page.ts` and Actions to expose functionality to users.

### Phase 3: Self-Correction
After generating code, ask yourself:
*   [ ] Did I respect the strictly typed `ServiceObject` interface?
*   [ ] Are all `reference_to` pointing to real objects?
*   [ ] Did I use ObjectQL instead of SQL?
*   [ ] are file names strictly `snake_case`?

## 📝 Coding Standards (The "File Suffix Protocol")

We enforce strict file naming to separate concerns. Files should be located in `packages/{package_name}/src/`.

### Core File Types
- `*.object.ts`: Data Model (Schema) — validated with `ObjectSchema.parse()`
- `*.hook.ts`: Server-side Business Logic (Triggers)
- `*.action.ts`: API Endpoints & AI Tools
- `*.page.ts`: UI Page Layouts — validated with `PageSchema` from `@objectstack/spec/ui`
- `*.view.ts`: List View Configurations — validated with `ViewSchema` from `@objectstack/spec/ui`

### Extended File Types (Phase 6+)
- `*.dashboard.ts`: Dashboard Definitions — validated with `DashboardSchema` from `@objectstack/spec/ui`
- `*.form.ts`: Form View Definitions — validated with `FormViewSchema` from `@objectstack/spec/ui`
- `*.statemachine.ts`: State Machine Definitions — validated with `StateMachineSchema` from `@objectstack/spec/automation`
- `*.permission.ts`: Permission Set Definitions — validated with `PermissionSetSchema` from `@objectstack/spec/security`
- `*.capabilities.ts`: Plugin Capability Manifests — validated with `PluginCapabilityManifestSchema` from `@objectstack/spec/kernel`
- `*.events.ts`: Domain Event Definitions — validated with `EventSchema` from `@objectstack/spec/kernel`

## 🔒 Schema Validation Requirements

All metadata files MUST be validated against their corresponding `@objectstack/spec` schemas:

1. **Objects**: Use `ObjectSchema.parse()` from `@objectstack/spec/data`
2. **Pages/Views/Dashboards/Forms**: Use schemas from `@objectstack/spec/ui`
3. **Workflows**: Use `WorkflowRuleSchema.parse()` from `@objectstack/spec/automation`
4. **State Machines**: Use `StateMachineSchema.parse()` from `@objectstack/spec/automation`
5. **Plugins**: Use `PluginSchema.parse()` from `@objectstack/spec/kernel` (remove `: any` annotations)
6. **Permissions**: Use `PermissionSetSchema.parse()` from `@objectstack/spec/security`
7. **AI Agents**: Use `AgentSchema.parse()` from `@objectstack/spec/ai`

## 🏷️ Field Type Guidance

Use the most specific `Field` type available from `@objectstack/spec/data`:

| Relationship | Field Type | When to Use |
|---|---|---|
| Parent reference | `Field.lookup()` | Optional association to another object |
| Child of parent | `Field.masterDetail()` | Required parent-child with cascade delete |
| Rollup value | `Field.summary()` | Aggregate child records (sum, count, min, max) |

| Data Type | Field Type | When to Use |
|---|---|---|
| Multiple choices | `Field.select({ multiple: true })` | Multi-select picklist |
| File upload | `Field.file()` | Document/attachment fields |
| Image upload | `Field.image()` | Photo/avatar fields |
| GPS coordinates | `Field.location()` | Geographic location data |
| Mailing address | `Field.address()` | Structured postal address |

## 🚀 Development Workflow

1.  **Define Object**: Create `packages/{pkg}/src/{entity}.object.ts`.
2.  **Add Logic**: Create `packages/{pkg}/src/{entity}.hook.ts`.
3.  **Expose Action**: Create `packages/{pkg}/src/{action}.action.ts` if external API/AI needed.
4.  **Config UI**: Create `packages/{pkg}/src/{entity}.page.ts`.

## ⚠️ Constraint Checklist

- **Documentation**: All documentation MUST be in English.
- **No Engine Code**: Do not try to modify the core runtime code. Focus on the *usage* of the runtime.
- **Dependencies**: HotCRM packages should depend on `@objectstack/runtime` (as peerDependency) and other sibling packages if structure allows.
- **Tone**: Act as a Senior 10x Engineer. Be concise, professional, and technically accurate.

## 🚫 Out of Scope (Platform Features)

The following features are **NOT** in the development scope of HotCRM. These are platform-level features that should be provided by `@objectstack/runtime` or other platform packages:

### Platform Infrastructure (Handled by @objectstack/runtime)
- **Visual Workflow Builder**: No-code workflow designer with drag-and-drop canvas
- **Formula Builder**: Visual formula editor with function palette
- **Report Designer**: Drag-and-drop report and dashboard builder
- **Page Layout Designer**: Visual UI layout editor
- **Process Builder**: Visual automation designer
- **Approval Designer**: Visual approval workflow designer

### Low-Level Platform Services
- **Database Engine**: SQL/NoSQL database implementation
- **Authentication System**: OAuth, SAML, SSO providers
- **Multi-Tenancy**: Tenant isolation and management
- **Data Encryption**: Field-level and database encryption
- **API Gateway**: Rate limiting, throttling, API versioning
- **Caching Layer**: Redis/Memcached integration
- **Message Queue**: RabbitMQ, Kafka integration
- **File Storage**: S3, Azure Blob, GCS integration

### Development Tools
- **Schema Migration Tools**: Database schema versioning
- **CLI Scaffolding**: Code generation CLI tools
- **Metadata Deployment**: Package deployment pipeline
- **Version Control Integration**: Git hooks, change tracking
- **IDE Extensions**: VS Code plugins, IntelliSense

**Focus Area**: HotCRM focuses exclusively on **business domain packages** (CRM, Finance, HR, Marketing, Products, Support) and their **business logic, data models, and AI capabilities**.

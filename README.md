# HotCRM - Enterprise-Level CRM System

[![CI](https://github.com/objectstack-ai/hotcrm/workflows/CI/badge.svg)](https://github.com/objectstack-ai/hotcrm/actions/workflows/ci.yml)
[![CodeQL](https://github.com/objectstack-ai/hotcrm/workflows/CodeQL%20Security%20Analysis/badge.svg)](https://github.com/objectstack-ai/hotcrm/actions/workflows/codeql.yml)
[![Code Quality](https://github.com/objectstack-ai/hotcrm/workflows/Code%20Quality/badge.svg)](https://github.com/objectstack-ai/hotcrm/actions/workflows/code-quality.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> A world-class Customer Relationship Management system built on @objectstack/spec v0.9.0 protocol with Salesforce-level functionality and Apple/Linear-level UX.

> 📊 **Development Status**: See [Development Status & Roadmap](DEVELOPMENT_STATUS.md) for current state and next development priorities

> 🚀 **Strategic Plan Available**: See our comprehensive [Strategic Enhancement Plan](docs/README.md) to transform HotCRM into the world's leading AI-Native CRM

> 📝 **Latest Updates**: Upgraded to @objectstack/spec v0.9.0 (February 2, 2026) - all tests passing with zero breaking changes.

> ✅ **Protocol Compliance**: All metadata is fully compliant with @objectstack/spec v0.9.0.

## 🌟 Overview

HotCRM is a **comprehensive, AI-native enterprise CRM** system covering the complete Lead-to-Cash lifecycle. Built on the @objectstack/spec v0.9.0 protocol, it delivers:

- **Complete CRM Suite**: 65 core objects (TypeScript) spanning Marketing, Sales, Service, Finance, and HR domains
- **Metadata-Driven Architecture**: All objects defined through TypeScript (type-safe)
- **Plugin Architecture**: Each business package is an independent plugin with dependency management
- **ObjectQL**: Type-safe query language replacing traditional SQL
- **AI-First Design**: Every major feature enhanced with AI capabilities
- **Modern UI/UX**: Apple/Linear-inspired design with Tailwind CSS
- **Enterprise-Ready**: SLA management, approval workflows, multi-currency support
- **Monorepo Architecture**: Modular package structure for deep customization

## 📚 Architecture

### Core Principles

1. **Metadata Driven**: All business objects are defined natively in TypeScript (`.object.ts`)
2. **Plugin Architecture**: Each business package is an independent plugin with dependency management
3. **ObjectQL**: Data queries use ObjectQL syntax for type-safe, flexible queries
4. **UI Engine**: Frontend rendering based on **ObjectUI** framework with Tailwind CSS styling
5. **AI Native**: Built-in AI capabilities for intelligent insights and automation
6. **Modular Packages**: Clean separation of concerns with pnpm workspaces

### Plugin Architecture

HotCRM uses a **plugin-based architecture** where each business package (CRM, Products, Finance, Support, Marketing, HR) is an independent plugin:

- **CRM Plugin**: Core CRM objects (Account, Contact, Lead, Opportunity, etc.)
- **Marketing Plugin**: Campaign and marketing automation (depends on CRM)
- **Products Plugin**: Product catalog and CPQ functionality (depends on CRM)
- **Finance Plugin**: Contract, invoice, and payment management (depends on CRM)
- **Support Plugin**: Customer support and knowledge base (depends on CRM)
- **HR Plugin**: Human Capital Management - Employee lifecycle and talent management

Each plugin:
- Is self-contained with its own business objects
- Can declare dependencies on other plugins
- Is loaded automatically in dependency order
- Can be developed and deployed independently

See [Plugin Architecture Guide](docs/PLUGIN_ARCHITECTURE.md) for detailed documentation.

### Repository Structure

HotCRM is built on the **@objectstack/runtime** engine, focusing purely on business capabilities.

```
hotcrm/
├── packages/               # Business Capabilities (Plugins)
│   ├── crm/               # Sales Cloud (Account, Opportunity, Lead, Contact)
│   ├── marketing/         # Marketing Cloud (Campaign, Marketing List)
│   ├── finance/           # Revenue Cloud (Contract, Invoice, Payment)
│   ├── products/          # CPQ Product Catalog (Product, Quote, Pricing)
│   ├── support/           # Service Cloud (Case, Knowledge, SLA)
│   ├── hr/                # HR Cloud (Employee, Recruitment, Performance)
│   └── ai/                # AI Services (ML Models, AI Utilities)
│
├── apps/                   # Deployable Applications
│   └── docs/              # Official Documentation Site
```

### Business Packages

Each package is a self-contained plugin defining:
- **Objects**: Data models (`.object.ts`)
- **Logic**: Server-side triggers (`.hook.ts`)
- **UI**: Page layouts and views (`.page.ts`)

### Platform Core

The project runs on **@objectstack/runtime**, which provides:
- **ObjectQL**: The ORM replacement.
- **Metadata Registry**: Loads and validates all business objects.
- **REST API**: Automatically generates endpoints for all objects.

### Package Dependencies

**Vertical Slice Architecture:**

Each domain package is a self-contained vertical slice with schemas, hooks, and actions:

```
@objectstack/runtime (Foundation)
  ├── @hotcrm/crm (Marketing & Sales Vertical Slice)
  │   ├── Schemas: Account, Contact, Lead, Opportunity, Campaign, Activity
  │   ├── Hooks: Opportunity stage automation
  │   └── Actions: AI Smart Briefing
  │
  ├── @hotcrm/support (Customer Service Vertical Slice)
  │   └── Schemas: Case, Knowledge
  │
  ├── @hotcrm/products (Product & Pricing Vertical Slice)
  │   └── Schemas: Product, Pricebook, Quote
  │
  ├── @hotcrm/finance (Financial Operations Vertical Slice)
  │   └── Schemas: Contract, Payment
  │
  ├── @hotcrm/ui (UI Components)
  │
  └── @hotcrm/server (Application Assembly & Startup)
```

**Simplified Dependencies:**

```
@hotcrm/server
  ├── @hotcrm/core
  ├── @hotcrm/crm (includes schemas + hooks + actions)
  ├── @hotcrm/support
  ├── @hotcrm/products
  ├── @hotcrm/finance
  └── @hotcrm/ui

Domain Packages (crm, support, products, finance)
  └── @hotcrm/core

@hotcrm/ui
  └── @hotcrm/core

@hotcrm/core (no dependencies)
```

## 🚀 Getting Started

### Prerequisites

- **Node.js**: >= 20.9.0
- **pnpm**: >= 9.0.0
- **TypeScript**: >= 5.3.0

### Installation

```bash
# Install pnpm if not already installed
npm install -g pnpm

# Clone the repository
git clone https://github.com/objectstack-ai/hotcrm.git
cd hotcrm

# Install all dependencies
pnpm install
```

### Development

```bash
# Start the development server (CLI-based with ObjectStack v0.7.2)
pnpm dev

# Start with legacy Express server (fallback)
pnpm --filter @hotcrm/server dev:legacy

# Build all packages
pnpm build

# Build a specific package
pnpm --filter @hotcrm/core build
pnpm --filter @hotcrm/server build

# Run linting on all packages
pnpm lint

# Lint and auto-fix
pnpm lint:fix

# Run tests
pnpm test

# Validate protocol compliance
node scripts/validate-protocol.js

# Clean all build artifacts
pnpm clean
```

### Production

```bash
# Build all packages
pnpm build

# Start the production server (CLI-based)
pnpm start

# Or use legacy Express server
pnpm --filter @hotcrm/server start:legacy
```

### Server Startup Options

HotCRM provides two server startup modes:

1. **CLI-based (Recommended)**: Uses ObjectStack v0.7.2 runtime with `objectstack.config.ts`
   - `pnpm dev` - Development mode with hot reload
   - `pnpm start` - Production mode
   - Loads 20 business objects from configuration
   - Uses ObjectKernel from @objectstack/core

2. **Legacy Express Server**: Traditional Express.js server with manual API routing
   - `pnpm --filter @hotcrm/server dev:legacy` - Development mode
   - `pnpm --filter @hotcrm/server start:legacy` - Production mode
   - Maintains backward compatibility

### 📖 Development Documentation

**🚀 Strategic Planning** (NEW):
- **[Documentation Index](docs/README.md)** - Complete guide to all strategic planning documents
- **[Strategic Enhancement Plan](docs/STRATEGIC_ENHANCEMENT_PLAN.md)** - Comprehensive 36-week roadmap to world-class CRM
- **[Implementation Roadmap](docs/IMPLEMENTATION_ROADMAP.md)** - Detailed sprint-by-sprint execution plan
- **[Quick Wins](docs/QUICK_WINS.md)** - 10 high-impact features deliverable in 2 weeks

**Start Here**: [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) - Complete development guide with workflows, best practices, and templates

**Detailed Guides**:
- **[Development Workflow](.github/prompts/workflow.prompt.md)** - 3-phase development process (Data 60%, Logic 20%, UI 20%)
- **[Iterative Development](.github/prompts/iteration.prompt.md)** - 5-week MVP development strategy
- **[Version Management](.github/prompts/versioning.prompt.md)** - Release process and semantic versioning
- **[Best Practices](.github/prompts/best-practices.prompt.md)** - Data modeling, security, performance, and UX
- **[Troubleshooting](.github/prompts/troubleshooting.prompt.md)** - Common issues and solutions
- **[Application Templates](.github/prompts/templates.prompt.md)** - CRM, ERP, Project Management templates

**Reference Docs**:
- **[AI Quick Reference](.github/prompts/ai-quick-reference.prompt.md)** - Quick lookup for AI agents
- **[Metadata Protocol](.github/prompts/metadata.prompt.md)** - File suffix system and naming conventions
- **[Platform Capabilities](.github/prompts/capabilities.prompt.md)** - Feature mapping guide

**Legacy Docs**:
- **[Development Plan](./CRM_DEVELOPMENT_PLAN.md)** - Historical roadmap and implementation plan
- **[Quick Start](./QUICKSTART_DEVELOPMENT.md)** - Legacy quick start guide
- **[Protocol Compliance](./PROTOCOL_COMPLIANCE.md)** - @objectstack/spec v0.6.1 compliance details
- **[Contributing](./CONTRIBUTING.md)** - Contribution guidelines
```

## 📦 Package Overview

HotCRM is built as a **modular monorepo** with independently developed packages. Each package is self-contained with clear responsibilities and can be used or deployed independently.

### System-Wide Statistics

**Total:** 65 Objects | 23 AI Actions | 29 Automation Hooks

### Infrastructure Packages

#### @hotcrm/core

Shared core utilities and type helpers for all HotCRM packages.

**Purpose:** Common utilities, TypeScript types, Zod integration  
**Dependencies:** None (foundation layer)

[Read more →](./packages/core/README.md)

#### @hotcrm/server

Application server that orchestrates all business packages and provides REST APIs.

**Purpose:** Runtime server, plugin orchestration, REST API generation  
**Integrated Packages:** All 6 business packages (CRM, Finance, HR, Marketing, Products, Support)  
**Tech Stack:** ObjectStack Runtime, Hono Server, SQLite/MongoDB driver

[Read more →](./packages/server/README.md)

#### @hotcrm/ai

Unified AI/ML service layer providing model registry, prediction services, and ML utilities.

**Features:**
- Multi-provider ML integration (AWS SageMaker, Azure ML, OpenAI)
- Model registry with A/B testing
- Smart caching (Redis + in-memory)
- Performance monitoring and health checks
- SHAP-like explainability
- Pre-registered models (lead scoring, churn prediction, sentiment analysis, revenue forecast, product recommendation)

[Read more →](./packages/ai/README.md)

### Business Domain Packages

Each domain package is a complete vertical slice containing objects, AI actions, and automation hooks:

#### @hotcrm/crm - Sales & Marketing Cloud

**13 Objects** | **8 AI Actions** | **7 Automation Hooks**

Complete Marketing & Sales domain with Account, Contact, Lead, Opportunity management, marketing automation, and activity tracking.

**Objects:** Account, Contact, Lead, Opportunity, Activity, Task, Note, Email Template, Form, Landing Page, Marketing List, Unsubscribe, Assignment Rule

**AI Actions:**
- Enhanced Lead Scoring with ML
- Account AI (health scoring, churn prediction, cross-sell/upsell)
- Contact AI (enrichment, buying intent, sentiment analysis)
- Lead AI (signature parsing, routing, nurturing)
- Opportunity AI (win probability, risk assessment, next steps)
- Campaign AI (content generation, segmentation, optimization)
- AI Smart Briefing (customer insights)
- Lead Conversion (Lead → Account + Contact + Opportunity)

**Automation:**
- Lead scoring triggers
- Activity tracking and rollups
- Contact decision chain validation
- Account health score calculation
- Opportunity stage automation

[Read more →](./packages/crm/README.md)

#### @hotcrm/finance - Revenue Cloud

**4 Objects** | **3 AI Actions** | **1 Automation Hook**

Financial operations with contract lifecycle management, invoicing, and payment tracking.

**Objects:** Contract, Invoice, Invoice Line, Payment

**AI Actions:**
- Revenue Forecasting (monthly/quarterly with risk analysis)
- Contract AI (risk scoring, renewal prediction, compliance checking)
- Invoice Prediction (payment default, cash flow forecasting)

**Automation:**
- Contract billing automation (auto-generate invoices on activation)

[Read more →](./packages/finance/README.md)

#### @hotcrm/hr - Human Capital Management

**16 Objects** | **3 AI Actions** | **4 Automation Hooks**

Complete talent management from recruitment to retirement.

**Objects:** Candidate, Application, Recruitment, Interview, Offer, Onboarding, Employee, Position, Department, Performance Review, Goal, Training, Certification, Attendance, Time Off, Payroll

**AI Actions:**
- Candidate AI (resume parsing, matching, ranking, interview questions)
- Employee AI (retention risk, career paths, skill gaps, team optimization)
- Performance AI (insights, SMART goals, development plans, 360-review synthesis)

**Automation:**
- Candidate scoring and screening
- Employee onboarding workflow
- Performance review rating calculation
- Offer lifecycle management

[Read more →](./packages/hr/README.md)

#### @hotcrm/marketing - Marketing Automation

**2 Objects** | **3 AI Actions (21 Functions)** | **3 Hook Modules (8 Hooks)**

AI-powered campaign management with content generation and multi-touch attribution.

**Objects:** Campaign, Campaign Member

**AI Actions:**
- **Content Generator (7 functions):** Email, social media, landing pages, ad copy, personalization, optimization, tone adaptation
- **Campaign AI (7 functions):** Performance optimization, A/B testing, send-time optimization, channel recommendations
- **Marketing Analytics (7 functions):** Attribution analysis, ROI forecasting, funnel optimization, lead scoring, journey analytics

**Automation:**
- Campaign ROI calculation
- Budget tracking and alerts
- Member engagement tracking
- Lead scoring from engagement
- Statistics aggregation
- Bounce handling

[Read more →](./packages/marketing/README.md)

#### @hotcrm/products - CPQ & Pricing

**9 Objects** | **3 AI Actions** | **3 Hook Modules**

Complete Configure-Price-Quote with product catalog, intelligent pricing, and bundle optimization.

**Objects:** Product, Product Bundle, Product Bundle Component, Quote, Quote Line Item, Pricebook, Price Rule, Discount Schedule, Approval Request

**AI Actions:**
- Pricing Optimizer (competitive analysis, optimal discounts, elasticity)
- Product Recommendation (customer fit, cross-sell, adoption prediction)
- Bundle Suggestion (tailored bundles, composition optimization)

**Automation:**
- Product inventory management
- Pricebook lifecycle (auto-activation/expiration)
- Quote pricing calculation
- Approval routing (5-level matrix)
- Margin protection
- Contract creation from accepted quotes

[Read more →](./packages/products/README.md)

#### @hotcrm/support - Customer Service Cloud

**21 Objects** | **3 AI Actions** | **2 Hook Modules (6 Hooks)**

Omnichannel case management with SLA tracking, knowledge base, and AI-powered routing.

**Objects:** Case, Case Comment, Knowledge Article, SLA Policy, SLA Template, SLA Milestone, Queue, Queue Member, Routing Rule, Escalation Rule, Skill, Agent Skill, Business Hours, Holiday, Holiday Calendar, Portal User, Forum Topic, Forum Post, Email to Case, Web to Case, Social Media Case

**AI Actions:**
- Case AI (auto-categorization, intelligent assignment, RAG search, SLA breach prediction)
- Knowledge AI (article recommendations, auto-tagging, quality scoring, RAG answers)
- SLA Prediction (breach probability, resolution time, workload optimization)

**Automation:**
- Case entitlement verification
- Knowledge article scoring
- AI enhancement (categorization, tagging, summaries)
- Article workflow automation
- Usage tracking
- Search analytics

[Read more →](./packages/support/README.md)

## 🤖 AI-Assisted Development

HotCRM includes a comprehensive **Agent System** to accelerate development. Each agent is an expert in a specific domain:

- **[Metadata Developer](.github/agents/metadata-developer.md)** - Object definitions, fields, relationships
- **[Business Logic](.github/agents/business-logic-agent.md)** - Hooks, triggers, automation
- **[UI Developer](.github/agents/ui-developer.md)** - Views, dashboards, forms
- **[Integration](.github/agents/integration-agent.md)** - APIs, webhooks, external systems
- **[AI Features](.github/agents/ai-features-agent.md)** - ML models, predictions, intelligence
- **[Testing](.github/agents/testing-agent.md)** - Test generation and validation
- **[Documentation](.github/agents/documentation-agent.md)** - Technical writing and guides

**Quick Start**: See the **[Agent Guide](.github/AGENT_GUIDE.md)** for examples and workflows.

**For Complex Tasks**: Use the **[Orchestrator](.github/agents/ORCHESTRATOR.md)** to coordinate multiple agents.

## 📦 Core Features

HotCRM implements a comprehensive enterprise system organized into **6 major domains**:

### 1. 🟢 Marketing & Leads

**Lead Management** (`Lead`)
- Lead capture with duplicate detection
- Public pool for unclaimed leads
- AI-powered lead scoring (0-100 scale)
- Automatic data completeness calculation
- Lead conversion tracking to Account/Contact/Opportunity

**Campaign Management** (`Campaign`)
- Marketing activity planning and execution
- Budget tracking and ROI calculation
- Multi-channel campaign support (Email, Social, Events, etc.)
- Campaign member management
- AI-generated marketing content and audience analysis

### 2. 🔵 Sales Force Automation

**Customer 360** (`Account`)
- Customer/company management with industry classification
- Parent-child account hierarchies
- Annual revenue and employee tracking
- Complete interaction timeline

**Contact Management** (`Contact`)
- Individual contact management with role tracking
- Decision chain visualization
- Business card scanning support
- Social media profile integration

**Opportunity Management** (`Opportunity`)
- Sales pipeline with 7 stages (Prospecting → Closed Won/Lost)
- AI win probability prediction
- Next-step recommendations with AI-suggested talking points
- Competitive intelligence analysis
- Risk factor identification

**Activity Tracking** (`Activity`)
- Call, email, meeting, and task logging
- Check-in capability with GPS location
- AI voice-to-text transcription
- Automatic action item extraction
- Sentiment analysis

**Product Catalog** (`Product`)
- SKU management with product families
- Multi-unit of measure support
- Inventory tracking with stock status
- AI-powered sales points generation
- Smart product bundling recommendations

**Price Management** (`Pricebook`)
- Multi-currency support (CNY, USD, EUR, GBP, JPY, HKD, SGD)
- Regional and channel-based pricing
- Tiered pricing strategies
- Date-effective pricing

**Quotation (CPQ)** (`Quote`)
- Complex quote configuration
- Multi-level discount approval workflow
- Automatic tax and shipping calculation
- PDF generation for customer delivery
- AI-recommended product bundles based on budget
- Win probability prediction

**Contract Management** (`Contract`)
- Contract lifecycle management
- Renewal reminders and tracking
- E-signature integration ready
- Payment plan management

**Payment Tracking** (`Payment`)
- Payment schedule and milestone tracking
- Invoice management
- Overdue monitoring with automated reminders
- Collection assignment and prioritization
- Multiple payment methods support

### 3. 🟠 Service & Customer Success

**Case Management** (`Case`)
- Multi-channel ticket intake (Email, Web, Phone, WeChat, Chat)
- SLA management with automatic calculation
- AI-powered auto-assignment to best agent
- Priority and escalation management
- Customer satisfaction tracking
- AI solution recommendations from knowledge base

**Knowledge Base** (`Knowledge`)
- Help documentation and FAQ management
- Article categorization and tagging
- Version control and review workflow
- Public/Internal/Partner visibility levels
- AI-generated article summaries
- RAG (Retrieval-Augmented Generation) support with vector embeddings
- Usage analytics and helpfulness scoring

### 4. 🟣 Human Capital Management

**Recruitment & Talent Acquisition**
- **Position Management** (`Position`): Job requisitions with requirements
- **Candidate Pipeline** (`Candidate`, `Application`): Applicant tracking with resume parsing
- **Interview Scheduling** (`Interview`): Multi-round interview coordination
- **Offer Management** (`Offer`): Employment offer generation and tracking

**Employee Lifecycle**
- **Employee Master Data** (`Employee`): Core employee information and records
- **Onboarding** (`Onboarding`): New hire onboarding workflows
- **Department Structure** (`Department`): Organizational hierarchy

**Time & Performance**
- **Time Off Management** (`Time_Off`): PTO, sick leave, vacation tracking
- **Attendance Tracking** (`Attendance`): Daily attendance with clock in/out
- **Goal Management** (`Goal`): OKR and KPI tracking
- **Performance Reviews** (`Performance_Review`): 360-degree feedback and annual reviews

**Compensation & Development**
- **Payroll Processing** (`Payroll`): Salary calculations and benefits
- **Training Programs** (`Training`): Learning and development catalog
- **Certifications** (`Certification`): Professional certification tracking

### 5. 🟤 Platform Foundation

**Metadata-Driven Architecture**
- All objects defined natively in TypeScript (`.object.ts`)
- ObjectQL query language for type-safe data access
- Dynamic field and layout management
- Custom validation rules

**Business Automation**
- Trigger-based workflows
- Approval processes
- Automatic calculations
- Cross-object updates

### 6. 🤖 AI Copilot

**AI Enhancement Throughout**
- **Lead**: Auto-scoring, data enrichment from email signatures
- **Campaign**: Content generation, audience analysis, channel recommendations
- **Opportunity**: Win probability, next-step suggestions, competitive intel
- **Activity**: Voice transcription, action item extraction, sentiment analysis
- **Product**: Sales point generation, bundling recommendations
- **Quote**: Smart product combinations, optimal discount suggestions
- **Case**: Auto-categorization, intelligent routing, solution recommendations
- **Knowledge**: Content summarization, related article discovery, RAG-ready embeddings
- **Candidate**: Resume parsing, interview question generation
- **Employee**: Performance insights, attrition prediction, skills gap analysis

## 🎯 Key Statistics

- **65 Core Objects** (TypeScript): Complete enterprise coverage across 6 major clouds
  - **CRM (13 objects)**: Account, Contact, Lead, Opportunity, Activity, Task, Note, Assignment Rule, Email Template, Form, Landing Page, Marketing List, Unsubscribe
  - **Marketing (2 objects)**: Campaign, Campaign Member
  - **Products (9 objects)**: Product, Product Bundle, Product Bundle Component, Quote, Quote Line Item, Pricebook, Price Rule, Discount Schedule, Approval Request
  - **Finance (4 objects)**: Contract, Invoice, Invoice Line, Payment
  - **Support (21 objects)**: Case, Case Comment, Knowledge Article, Forum Topic, Forum Post, Queue, Queue Member, Routing Rule, Escalation Rule, SLA Policy, SLA Milestone, SLA Template, Agent Skill, Skill, Business Hours, Holiday, Holiday Calendar, Portal User, Email to Case, Web to Case, Social Media Case
  - **HR (16 objects)**: Employee, Department, Position, Candidate, Application, Interview, Offer, Recruitment, Onboarding, Time Off, Attendance, Goal, Performance Review, Payroll, Training, Certification
- **6 Business Clouds**: Sales, Marketing, Revenue (Products + Finance), Service, HR, Platform/AI
- **7 Sales Stages**: Complete pipeline from Prospecting to Closed Won/Lost
- **8 Currencies**: Multi-currency support for global operations
- **6 Service Channels**: Email, Web, Phone, WeChat, Chat Bot, Mobile App
- **500+ Fields**: Comprehensive data capture across all objects
- **AI-First Design**: Every major object has AI enhancement capabilities

- KPI cards with real-time metrics
- Interactive pipeline funnel charts
- Activity timeline with team collaboration
- Apple-inspired minimalist design

### 4. AI-Powered Features

- **Smart Briefing**: AI-generated customer summaries and next-step recommendations
- **Personalized Sales Talk**: Industry-specific sales suggestions
- **Predictive Analytics**: Deal scoring and win probability

## 🎨 Design Philosophy

HotCRM follows a design language inspired by:

- **Apple macOS**: Clean, minimalist, high-contrast typography
- **Linear**: Smooth animations, subtle shadows, perfect spacing
- **Tailwind Utilities**: Utility-first CSS for rapid iteration

Design principles:
- Large border radius (rounded-xl, rounded-2xl)
- Subtle borders (border-gray-200)
- Frosted glass effects (backdrop-blur)
- High contrast dark text
- Generous white space

## 🤖 AI Integration

### Smart Briefing

When viewing a customer page, the AI analyzes:
- Recent activities (last 10 interactions)
- Email communications
- Historical data
- Industry context

Output:
- 200-word executive summary
- Personalized next-step recommendations
- Industry-specific sales talking points

## 📖 API Documentation

### ObjectQL Examples

```javascript
// Query accounts with opportunities
const accounts = await db.query({
  object: 'Account',
  fields: ['Name', 'Industry', 'AnnualRevenue'],
  filters: {
    Industry: { $in: ['Technology', 'Finance'] }
  },
  related: {
    Opportunities: {
      fields: ['Name', 'Amount', 'Stage']
    }
  }
});
```

### Trigger Example

```typescript
// Opportunity Stage Change Trigger
export async function onOpportunityStageChange(ctx: TriggerContext) {
  if (ctx.new.Stage === 'Closed Won') {
    // Create contract
    await ctx.db.doc.create('Contract', {
      AccountId: ctx.new.AccountId,
      OpportunityId: ctx.new.Id,
      Status: 'Draft'
    });
    
    // Update account
    await ctx.db.doc.update('Account', ctx.new.AccountId, {
      CustomerStatus: 'Active Customer'
    });
  }
}
```

## 🔒 Security

- All data operations are audited
- Row-level security support
- Field-level permissions
- Encrypted sensitive data
- Weekly CodeQL security scans
- Automated dependency updates via Dependabot

## 🤖 Automation & CI/CD

HotCRM includes comprehensive GitHub Actions workflows for automation:

- **Continuous Integration**: Automated builds, linting, and testing on every PR
- **Security Scanning**: Weekly CodeQL analysis for vulnerability detection
- **Code Quality**: Automated quality checks and best practices enforcement
- **Automated Releases**: Tag-based releases with automatic changelog generation
- **Documentation**: Auto-deploy to GitHub Pages
- **Dependency Management**: Weekly automated dependency updates
- **Issue Management**: Auto-greeting for first-time contributors
- **PR Automation**: Auto-labeling based on changed files

For detailed workflow documentation, see [.github/README.md](.github/README.md) and [.github/AUTOMATION_SUMMARY.md](.github/AUTOMATION_SUMMARY.md).

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) guide first.

## 📞 Support

For support and questions, please open an issue on GitHub.

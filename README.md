# HotCRM - Enterprise-Level CRM System

[![CI](https://github.com/hotcrm/hotcrm/workflows/CI/badge.svg)](https://github.com/hotcrm/hotcrm/actions/workflows/ci.yml)
[![CodeQL](https://github.com/hotcrm/hotcrm/workflows/CodeQL%20Security%20Analysis/badge.svg)](https://github.com/hotcrm/hotcrm/actions/workflows/codeql.yml)
[![Code Quality](https://github.com/hotcrm/hotcrm/workflows/Code%20Quality/badge.svg)](https://github.com/hotcrm/hotcrm/actions/workflows/code-quality.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> A world-class Customer Relationship Management system built on @objectstack/spec v0.6.1 protocol with Salesforce-level functionality and Apple/Linear-level UX.

> 📝 **Latest Updates**: See [UPGRADE_NOTES.md](UPGRADE_NOTES.md) for information about the v0.6.1 upgrade and runtime migration status.

> ✅ **Protocol Compliance**: All metadata is fully compliant with @objectstack/spec v0.6.1. See [PROTOCOL_COMPLIANCE.md](PROTOCOL_COMPLIANCE.md) for details.

## 🌟 Overview

HotCRM is a **comprehensive, AI-native enterprise CRM** system covering the complete Lead-to-Cash lifecycle. Built on the @objectstack/spec v0.6.1 protocol, it delivers:

- **Complete CRM Suite**: 14 core objects spanning Marketing, Sales, Service, and Finance domains
- **Metadata-Driven Architecture**: All objects defined through TypeScript (type-safe)
- **ObjectQL**: Type-safe query language replacing traditional SQL
- **AI-First Design**: Every major feature enhanced with AI capabilities
- **Modern UI/UX**: Apple/Linear-inspired design with Tailwind CSS
- **Enterprise-Ready**: SLA management, approval workflows, multi-currency support
- **Monorepo Architecture**: Modular package structure for deep customization

## 📚 Architecture

### Core Principles

1. **Metadata Driven**: All business objects are defined natively in TypeScript (`.object.ts`)
2. **ObjectQL**: Data queries use ObjectQL syntax for type-safe, flexible queries
3. **UI Engine**: Frontend rendering based on **ObjectUI** framework with Tailwind CSS styling
4. **AI Native**: Built-in AI capabilities for intelligent insights and automation
5. **Modular Packages**: Clean separation of concerns with pnpm workspaces

### Monorepo Structure

HotCRM uses a **multi-package monorepo** architecture powered by pnpm workspaces, allowing for independent development and deployment of different CRM modules:

```
hotcrm/
├── packages/
│   ├── core/                 # Core engine and ObjectQL
│   │   ├── src/
│   │   │   ├── objectql.ts          # ObjectQL query engine
│   │   │   ├── objectstack-spec.d.ts # Type definitions
│   │   │   └── index.ts             # Package exports
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── metadata/             # Business object definitions
│   │   ├── src/
│   │   │   ├── account.object.ts    # Account metadata
│   │   │   ├── contact.object.ts    # Contact metadata
│   │   │   ├── opportunity.object.ts # Opportunity metadata
│   │   │   ├── contract.object.ts   # Contract metadata
│   │   │   └── *.object.yml         # Legacy YAML definitions
│   │   └── package.json
│   │
│   ├── hooks/                # Business logic and triggers
│   │   ├── src/
│   │   │   └── opportunity.hook.ts  # Opportunity automation
│   │   └── package.json
│   │
│   ├── actions/              # Custom business actions
│   │   ├── src/
│   │   │   └── ai_smart_briefing.action.ts
│   │   └── package.json
│   │
│   ├── ui/                   # UI components and dashboards
│   │   ├── src/
│   │   │   ├── dashboard/
│   │   │   │   └── sales_dashboard.dashboard.ts
│   │   │   └── components/
│   │   │       └── AISmartBriefingCard.ts
│   │   └── package.json
│   │
│   └── server/               # Express server and REST APIs
│       ├── src/
│       │   └── server.ts
│       └── package.json
│
├── pnpm-workspace.yaml       # Workspace configuration
├── package.json              # Root package with scripts
└── tsconfig.json             # Root TypeScript config
```

### Package Dependencies

**Vertical Slice Architecture:**

Each domain package is a self-contained vertical slice with schemas, hooks, and actions:

```
@hotcrm/core (Foundation)
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

- Node.js 18+
- pnpm 8+ (recommended for monorepo management)

### Installation

```bash
# Install pnpm if not already installed
npm install -g pnpm

# Install all dependencies
pnpm install
```

### Development

```bash
# Start the development server
pnpm dev

# Build all packages
pnpm build

# Build a specific package
pnpm --filter @hotcrm/core build
pnpm --filter @hotcrm/server build

# Run linting on all packages
pnpm lint

# Clean all build artifacts
pnpm clean
```

### Production

```bash
# Build all packages
pnpm build

# Start the production server
pnpm start
```

## 📦 Package Overview

### Core Package

#### @hotcrm/core

Core engine providing ObjectQL query language and type definitions for the entire CRM system.

**Key Features:**
- ObjectQL query engine for type-safe data access
- TypeScript type definitions for @objectstack/spec
- Database abstraction layer

[Read more →](./packages/core/README.md)

### Domain Packages (Vertical Slices)

Each domain package is a complete vertical slice containing schemas, hooks, and actions:

#### @hotcrm/crm

**Marketing & Sales Domain** - Complete vertical slice including:
- **Schemas (TypeScript)**: Account, Contact, Lead, Opportunity
- **Schemas (Legacy YAML)**: Campaign, Activity
- **Hooks**: Lead conversion automation, Opportunity stage change automation
- **Actions**: AI Smart Briefing for account insights

[Read more →](./packages/crm/README.md)

#### @hotcrm/support

**Customer Service Domain** - Case management and Knowledge base
- **Schemas (Legacy YAML)**: Case, Knowledge
- Package structure prepared for future TypeScript migrations

[Read more →](./packages/support/README.md)

#### @hotcrm/products

**Product & Pricing Domain** - Product catalog, Pricebook, and Quote (CPQ) management
- **Schemas (Legacy YAML)**: Product, Pricebook, Quote
- Package structure prepared for future TypeScript migrations

[Read more →](./packages/products/README.md)

#### @hotcrm/finance

**Financial Operations Domain** - Contract lifecycle and Payment tracking
- **Schemas (TypeScript)**: Contract
- **Schemas (Legacy YAML)**: Payment
- Partial migration to TypeScript in progress

[Read more →](./packages/finance/README.md)

### Application Packages

#### @hotcrm/ui

UI components, dashboards, and page configurations with Apple/Linear-inspired design.

**Includes:**
- Sales Dashboard with KPIs and pipeline visualization
- AI Smart Briefing Card component
- Tailwind CSS-based styling

[Read more →](./packages/ui/README.md)

#### @hotcrm/server

Express server for application assembly and REST API endpoints. Integrates all domain packages.

**Features:**
- RESTful API endpoints for all CRM objects
- ObjectQL query interface
- Dashboard KPIs and metrics
- AI-powered features integration

[Read more →](./packages/server/README.md)

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

HotCRM implements a comprehensive enterprise CRM system organized into **5 major domains**:

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

### 4. 🟣 Platform Foundation

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

### 5. 🤖 AI Copilot

**AI Enhancement Throughout**
- **Lead**: Auto-scoring, data enrichment from email signatures
- **Campaign**: Content generation, audience analysis, channel recommendations
- **Opportunity**: Win probability, next-step suggestions, competitive intel
- **Activity**: Voice transcription, action item extraction, sentiment analysis
- **Product**: Sales point generation, bundling recommendations
- **Quote**: Smart product combinations, optimal discount suggestions
- **Case**: Auto-categorization, intelligent routing, solution recommendations
- **Knowledge**: Content summarization, related article discovery, RAG-ready embeddings

## 🎯 Key Statistics

- **14 Core Objects**: Lead, Campaign, Account, Contact, Opportunity, Activity, Product, Pricebook, Quote, Contract, Payment, Case, Knowledge
- **7 Sales Stages**: Complete pipeline from Prospecting to Closed Won/Lost
- **8 Currencies**: Multi-currency support for global operations
- **6 Service Channels**: Email, Web, Phone, WeChat, Chat Bot, Mobile App
- **100+ Fields**: Comprehensive data capture across all objects
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

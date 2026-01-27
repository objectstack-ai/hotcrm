# HotCRM - Enterprise-Level CRM System

[![CI](https://github.com/hotcrm/hotcrm/workflows/CI/badge.svg)](https://github.com/hotcrm/hotcrm/actions/workflows/ci.yml)
[![CodeQL](https://github.com/hotcrm/hotcrm/workflows/CodeQL%20Security%20Analysis/badge.svg)](https://github.com/hotcrm/hotcrm/actions/workflows/codeql.yml)
[![Code Quality](https://github.com/hotcrm/hotcrm/workflows/Code%20Quality/badge.svg)](https://github.com/hotcrm/hotcrm/actions/workflows/code-quality.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> A world-class Customer Relationship Management system built on @objectstack/spec protocol with Salesforce-level functionality and Apple/Linear-level UX.

## 🌟 Overview

HotCRM is a **comprehensive, AI-native enterprise CRM** system covering the complete Lead-to-Cash lifecycle. Built on the @objectstack/spec protocol, it delivers:

- **Complete CRM Suite**: 14 core objects spanning Marketing, Sales, Service, and Finance domains
- **Metadata-Driven Architecture**: All objects defined through declarative YAML files
- **ObjectQL**: Type-safe query language replacing traditional SQL
- **AI-First Design**: Every major feature enhanced with AI capabilities
- **Modern UI/UX**: Apple/Linear-inspired design with Tailwind CSS
- **Enterprise-Ready**: SLA management, approval workflows, multi-currency support

## 📚 Architecture

### Core Principles

1. **Metadata Driven**: All business objects are defined through declarative YAML files
2. **ObjectQL**: Data queries use ObjectQL syntax for type-safe, flexible queries
3. **UI Engine**: Frontend rendering based on **ObjectUI** framework with Tailwind CSS styling
4. **AI Native**: Built-in AI capabilities for intelligent insights and automation

### Project Structure

```
hotcrm/
├── src/
│   ├── metadata/           # Object definitions (.object.yml)
│   │   ├── Lead.object.yml         # 线索管理
│   │   ├── Campaign.object.yml     # 营销活动
│   │   ├── Account.object.yml      # 客户管理
│   │   ├── Contact.object.yml      # 联系人
│   │   ├── Opportunity.object.yml  # 商机
│   │   ├── Activity.object.yml     # 活动记录
│   │   ├── Product.object.yml      # 产品目录
│   │   ├── Pricebook.object.yml    # 价格表
│   │   ├── Quote.object.yml        # 报价单 (CPQ)
│   │   ├── Contract.object.yml     # 合同
│   │   ├── Payment.object.yml      # 回款
│   │   ├── Case.object.yml         # 工单
│   │   └── Knowledge.object.yml    # 知识库
│   ├── triggers/           # Business automation logic
│   │   └── OpportunityTrigger.ts
│   ├── actions/            # ObjectStack Actions (API endpoints)
│   │   └── AISmartBriefing.ts
│   ├── ui/                 # UI configurations
│   │   ├── dashboard/
│   │   └── components/
│   ├── engine/             # Core engine (ObjectQL, etc.)
│   │   └── objectql.ts
│   └── server.ts           # Main server entry
├── public/                 # Static assets
├── package.json
└── tsconfig.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

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

### 1. 🟢 Marketing & Leads (获客域)

**Lead Management** (`Lead`)
- Lead capture with duplicate detection
- Public pool (公海池) for unclaimed leads
- AI-powered lead scoring (0-100 scale)
- Automatic data completeness calculation
- Lead conversion tracking to Account/Contact/Opportunity

**Campaign Management** (`Campaign`)
- Marketing activity planning and execution
- Budget tracking and ROI calculation
- Multi-channel campaign support (Email, Social, Events, etc.)
- Campaign member management
- AI-generated marketing content and audience analysis

### 2. 🔵 Sales Force Automation (销售域)

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

### 3. 🟠 Service & Customer Success (服务域)

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

### 4. 🟣 Platform Foundation (底座域)

**Metadata-Driven Architecture**
- All objects defined in declarative YAML
- ObjectQL query language for type-safe data access
- Dynamic field and layout management
- Custom validation rules

**Business Automation**
- Trigger-based workflows
- Approval processes
- Automatic calculations
- Cross-object updates

### 5. 🤖 AI Copilot (智能域)

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

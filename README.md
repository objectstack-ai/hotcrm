# HotCRM - Enterprise-Level CRM System

> A world-class Customer Relationship Management system built on @objectstack/spec protocol with Salesforce-level functionality and Apple/Linear-level UX.

## 🌟 Overview

HotCRM is a modern, AI-native CRM system designed for enterprise-level businesses. It combines:

- **Metadata-Driven Architecture**: All objects (Account, Contact, Opportunity, etc.) are defined through JSON/YAML
- **ObjectQL**: Advanced query language replacing traditional SQL
- **Modern UI/UX**: Built with amis framework and Tailwind CSS
- **AI-Powered Features**: Smart briefings, personalized recommendations, and intelligent automation

## 📚 Architecture

### Core Principles

1. **Metadata Driven**: All business objects are defined through declarative YAML files
2. **ObjectQL**: Data queries use ObjectQL syntax for type-safe, flexible queries
3. **UI Engine**: Frontend rendering based on amis framework with Tailwind CSS styling
4. **AI Native**: Built-in AI capabilities for intelligent insights and automation

### Project Structure

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

## 📦 Core Features

### 1. Core CRM Objects

- **Account**: Customer/company management with industry classification, revenue tracking
- **Contact**: Individual contact management with relationship mapping
- **Opportunity**: Sales pipeline and deal tracking
- **Contract**: Automated contract management

### 2. Business Automation

- Automatic contract creation on deal closure
- Account status updates based on opportunity stages
- Real-time notifications for sales directors
- Customizable triggers and workflows

### 3. Modern Dashboard

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

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines first.

## 📞 Support

For support and questions, please open an issue on GitHub.

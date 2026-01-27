# HotCRM Documentation

This directory contains the complete official documentation for HotCRM in fumadocs format.

## Documentation Structure

```
content/docs/
├── index.mdx                    # Documentation home page
├── meta.json                    # Main navigation structure
│
├── getting-started/             # Getting started guides
│   ├── introduction.mdx         # Introduction to HotCRM
│   ├── installation.mdx         # Installation guide
│   ├── quick-start.mdx          # Quick start tutorial
│   └── meta.json
│
├── architecture/                # Architecture documentation
│   ├── overview.mdx             # Architecture overview
│   ├── metadata-driven.mdx      # Metadata-driven architecture
│   ├── objectql.mdx             # ObjectQL query language
│   ├── monorepo-structure.mdx   # Monorepo structure
│   └── meta.json
│
├── features/                    # Feature documentation
│   ├── marketing-leads.mdx      # Lead & Campaign management
│   ├── sales-automation.mdx     # Sales objects (Account, Contact, Opportunity, Activity)
│   ├── product-pricing.mdx      # Product catalog, pricing, and CPQ
│   ├── contracts-payments.mdx   # Contract lifecycle and payments
│   ├── service-support.mdx      # Case management and knowledge base
│   └── meta.json
│
├── ai/                          # AI features documentation
│   ├── overview.mdx             # AI capabilities overview
│   ├── capabilities.mdx         # Detailed AI features
│   └── meta.json
│
├── development/                 # Development guides
│   ├── creating-objects.mdx     # How to create custom objects
│   ├── business-logic.mdx       # Writing hooks and triggers
│   ├── ui-development.mdx       # UI development guide
│   └── meta.json
│
└── api-reference/               # API documentation
    ├── objectql-api.mdx         # ObjectQL API reference
    ├── rest-api.mdx             # REST API reference
    └── meta.json
```

## Documentation Coverage

### Core Objects (14)

**Marketing & Leads**
- Lead
- Campaign

**Sales Force Automation**
- Account
- Contact
- Opportunity
- Activity
- Product
- Pricebook
- Quote

**Financial Operations**
- Contract
- Payment

**Service & Support**
- Case
- Knowledge

### Key Topics

- ✅ Installation and setup
- ✅ Architecture and design principles
- ✅ Metadata-driven development
- ✅ ObjectQL query language
- ✅ All 14 core objects
- ✅ AI capabilities (25+ features)
- ✅ Custom object development
- ✅ Business logic (hooks/triggers)
- ✅ UI development
- ✅ Complete API reference

## Statistics

- **Total Files**: 25 MDX files + 7 meta.json files
- **Total Size**: ~200KB of documentation
- **Code Examples**: 100+ TypeScript/ObjectQL examples
- **Field Documentation**: 150+ fields across all objects
- **AI Features**: 25+ AI capabilities documented
- **API Endpoints**: 30+ REST API endpoints

## Fumadocs Format

All documentation files follow the fumadocs MDX format:

```mdx
---
title: Page Title
description: Page description
---

# Page Heading

Content with MDX components...

<Cards>
  <Card title="..." href="..." icon="...">
    Description
  </Card>
</Cards>

## Section

More content...
```

## Using This Documentation

### For Users

Start with:
1. [Introduction](/docs/getting-started/introduction)
2. [Installation](/docs/getting-started/installation)
3. [Quick Start](/docs/getting-started/quick-start)

### For Developers

Start with:
1. [Architecture Overview](/docs/architecture/overview)
2. [ObjectQL](/docs/architecture/objectql)
3. [Creating Objects](/docs/development/creating-objects)

### For AI Integration

Start with:
1. [AI Overview](/docs/ai/overview)
2. [AI Capabilities](/docs/ai/capabilities)
3. [REST API Reference](/docs/api-reference/rest-api)

## Contributing

When adding new documentation:

1. Follow the fumadocs MDX format
2. Add frontmatter with title and description
3. Use proper heading hierarchy (# → ## → ###)
4. Include code examples with TypeScript
5. Update meta.json files for navigation
6. Cross-reference related documentation

## Building the Documentation Site

To build and serve the documentation with fumadocs:

```bash
# Install fumadocs (if not already installed)
npm install fumadocs-core fumadocs-ui next

# Start development server
npm run dev

# Build for production
npm run build
```

## Language

All documentation is written in **English only** as per the HotCRM documentation standards.

## License

This documentation is part of the HotCRM project and is licensed under the MIT License.

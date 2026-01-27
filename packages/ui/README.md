# @hotcrm/ui

UI components and dashboards for HotCRM.

## Overview

This package contains UI components, dashboards, and page configurations following the Apple/Linear-inspired design principles with Tailwind CSS styling.

## Components

### Sales Dashboard

Comprehensive sales management dashboard with:
- Revenue KPIs
- Lead metrics
- Win rate tracking
- Pipeline visualization
- Recent activity feed

### AI Smart Briefing Card

Interactive card component for displaying AI-generated account briefings.

## Usage

```typescript
import { salesDashboard, AISmartBriefingCard } from '@hotcrm/ui';

// Use dashboard configuration
app.get('/api/ui/dashboard/sales', (req, res) => {
  res.json(salesDashboard);
});
```

## Design Principles

- **Modern SaaS Look**: Clean, spacious, consistently styled
- **Tailwind CSS**: Utility-first CSS framework
- **ObjectUI Framework**: Declarative UI definitions
- **Responsive**: Mobile-first design approach

## Development

```bash
# Build UI package
pnpm --filter @hotcrm/ui build

# Watch mode
pnpm --filter @hotcrm/ui dev
```

## Creating New Components

1. Create component file in `src/components/`
2. Follow Tailwind CSS styling conventions
3. Use TypeScript for type safety
4. Export from `index.ts`
5. Document component usage

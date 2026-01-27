# @hotcrm/ui

UI components, dashboards, and page configurations for HotCRM.

## Overview

This package contains UI components, dashboards, and page configurations following the Apple/Linear-inspired design principles with Tailwind CSS styling. Built on the ObjectUI framework for declarative, metadata-driven user interfaces.

## What's Included

### Dashboards
- **Sales Dashboard** (`sales_dashboard.dashboard.ts`): Comprehensive sales management dashboard with real-time KPIs, pipeline visualization, and activity feeds

### Components
- **AI Smart Briefing Card** (`AISmartBriefingCard.ts`): Interactive card component for displaying AI-generated account briefings and insights

## Features

### Sales Dashboard

The sales dashboard provides a complete view of sales performance with:

**KPI Cards:**
- Revenue metrics with trend indicators
- Lead generation and conversion tracking
- Win rate calculation and monitoring
- Pipeline health indicators

**Visualizations:**
- Interactive pipeline funnel charts by stage
- Deal distribution and conversion rates
- Revenue forecasting graphs

**Activity Feed:**
- Recent customer interactions timeline
- Team collaboration and updates
- Quick action buttons

**AI Integration:**
- Smart briefing card for account insights
- Next-step recommendations
- Industry-specific talking points

### AI Smart Briefing Card

Interactive component that displays:
- AI-generated account overview (200-word summary)
- Key insights from recent activities
- Personalized recommendations
- Industry-specific sales talking points
- Risk and opportunity identification

## Design Principles

HotCRM's UI follows a **Modern SaaS** aesthetic inspired by:

- **Apple macOS**: Clean, minimalist, high-contrast typography
- **Linear**: Smooth animations, subtle shadows, perfect spacing
- **Tailwind CSS**: Utility-first CSS for consistency and rapid iteration

### Design Guidelines:
- **Large Border Radius**: `rounded-xl`, `rounded-2xl` for modern feel
- **Subtle Borders**: `border-gray-200` for visual separation
- **Frosted Glass Effects**: `backdrop-blur` for depth
- **High Contrast**: Dark text on light backgrounds for readability
- **Generous Spacing**: Ample white space for clarity
- **Responsive**: Mobile-first design approach

## Usage

### Importing Dashboard Configurations
```typescript
import { salesDashboard } from '@hotcrm/ui';

// Serve dashboard configuration via API
app.get('/api/ui/dashboard/sales', (req, res) => {
  res.json(salesDashboard);
});
```

### Importing Components
```typescript
import { AISmartBriefingCard } from '@hotcrm/ui';

// Use component configuration in UI rendering
const briefingCard = AISmartBriefingCard({
  accountId: 'acc_123',
  activityLimit: 10
});
```

## Technology Stack

- **TypeScript**: Type-safe component and dashboard definitions
- **Tailwind CSS**: Utility-first CSS framework for styling
- **ObjectUI Framework**: Declarative UI configuration engine
- **Responsive Design**: Mobile-first approach with breakpoints

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

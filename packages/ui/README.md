# @hotcrm/ui

UI components, dashboards, and page configurations for HotCRM.

## Overview

This package contains UI components, dashboards, and page configurations following the Apple/Linear-inspired design principles with Tailwind CSS styling. Built on the ObjectUI framework for declarative, metadata-driven user interfaces.

## What's Included

### Dashboards
- **Sales Dashboard** (`src/dashboard/sales_dashboard.dashboard.ts`): Dashboard configuration structure prepared for implementation

### Components
- **AI Smart Briefing Card** (`src/components/AISmartBriefingCard.ts`): Component definition structure prepared for implementation

> **Note**: The UI package currently contains configuration skeletons. Full implementations with widgets and interactive components are planned for future development.

## Planned Features

### Sales Dashboard (To Be Implemented)

The sales dashboard is designed to provide:

**Planned KPI Cards:**
- Revenue metrics with trend indicators
- Lead generation and conversion tracking
- Win rate calculation and monitoring
- Pipeline health indicators

**Planned Visualizations:**
- Interactive pipeline funnel charts by stage
- Deal distribution and conversion rates
- Revenue forecasting graphs

**Planned Activity Feed:**
- Recent customer interactions timeline
- Team collaboration and updates
- Quick action buttons

**Planned AI Integration:**
- Smart briefing card for account insights
- Next-step recommendations
- Industry-specific talking points

### AI Smart Briefing Card (To Be Implemented)

Component planned to display:
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

// Dashboard configuration structure (implementation pending)
// Will be used for UI rendering once widgets are implemented
app.get('/api/ui/dashboard/sales', (req, res) => {
  res.json(salesDashboard);
});
```

### Importing Components
```typescript
import { AISmartBriefingCard } from '@hotcrm/ui';

// Component configuration structure (implementation pending)
// Will be populated with ObjectUI properties
const briefingCard = AISmartBriefingCard;
```

## Current Status

This package provides the **foundational structure** for UI components and dashboards. The TypeScript definitions and exports are in place, ready for:
- ObjectUI widget implementations
- Dashboard layout configurations
- Component property definitions
- Integration with the server API

## Future Development

Planned enhancements:
- Complete dashboard widget implementations
- Interactive component definitions
- Real-time data binding
- Responsive layout configurations
- Accessibility features (ARIA labels, keyboard navigation)

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

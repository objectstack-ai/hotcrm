// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { Page, PageComponent, View } from '@objectstack/spec/ui';
import { LeadViews } from '../views/lead.view';
import { OpportunityViews } from '../views/opportunity.view';
import { TaskViews } from '../views/task.view';

/**
 * Embed one of an object's OWN saved list views in a page region.
 *
 * The home tabs used to hold a bare `{ type: 'page:section', properties: {} }`
 * each, which renders an empty `<section>` — three tab names promising content
 * over three blank panels. Same lesson as the `record:highlights` card below:
 * a component with no binding renders nothing, silently.
 *
 * `list-view` is the block that renders an object list inside a page (it is in
 * the platform's public block contract, ADR-0080), and it takes its columns /
 * filter / sort inline — there is no way for a page component to name a saved
 * view, so those three keys are READ OFF the saved view here rather than
 * retyped. That is the same iron rule `account_workbench.page.ts` states for
 * interface pages: columns, base filter and sort are inherited, never restated.
 * Retyping them would have created a second definition of "my leads" that
 * drifts from `src/views/lead.view.ts` the first time either side is edited.
 *
 * `{current_user_id}` in a saved view's filter resolves on this path (the
 * ObjectQL read path runs `resolveFilterTokens()` since 17.0.0-rc.0), so
 * "mine" really does mean mine here — measured tab by tab in the browser, see
 * the PR. The nav's My Work group reaches the SAME views by name
 * (`src/apps/crm.app.ts`); these tabs are the landing-page shortcut to them.
 */
const embeddedListView = (id: string, objectName: string, views: View, viewKey: string): PageComponent => {
  const view = views.listViews?.[viewKey];
  // Loud, at build time: a renamed or deleted view must not degrade back into
  // a blank tab — that is the defect this whole component replaces.
  if (!view) throw new Error(`home.page.ts: no saved view "${viewKey}" on ${objectName}`);
  return {
    type: 'list-view',
    id,
    label: view.label,
    properties: {
      objectName,
      viewType: 'grid',
      columns: view.columns,
      filter: view.filter,
      sort: view.sort,
    },
  };
};

/**
 * Sales Home Page
 *
 * Demonstrates a home page layout with dashboards and quick access widgets.
 * Similar to Salesforce Lightning Home Page.
 *
 * Features:
 * - Dashboard-style layout
 * - Multiple component regions
 * - Global search and notifications
 * - Quick action cards
 */
export const SalesHomePage: Page = {
  name: 'sales_home_page',
  label: 'Sales Home',
  description: 'Sales team home page with key metrics and quick actions',
  
  type: 'home',
  
  template: 'three-column',
  kind: 'full',  
  variables: [
    {
      name: 'selectedPeriod',
      type: 'string',
      defaultValue: 'this_month',
    },
  ],
  
  regions: [
    {
      name: 'header',
      width: 'full',
      components: [
        {
          type: 'page:header',
          id: 'home_header',
          label: 'Sales Home Header',
          properties: {
            title: 'Sales Dashboard',
            subtitle: 'Welcome back, {current_user.first_name}',
            icon: 'home',
            breadcrumb: false,
          },
        },
      ],
    },
    
    {
      name: 'left_sidebar',
      width: 'small',
      components: [
        {
          type: 'page:card',
          id: 'quick_create',
          label: 'Quick Create',
          properties: {
            title: 'Quick Create',
            bordered: true,
            body: [
              {
                type: 'nav:menu',
                id: 'create_menu',
                properties: {},
              },
            ],
          },
        },
        {
          type: 'page:card',
          id: 'my_recent_items',
          label: 'Recent Items',
          properties: {
            title: 'Recent Items',
            bordered: true,
          },
        },
      ],
    },
    
    {
      name: 'main',
      width: 'large',
      components: [
        {
          type: 'page:card',
          id: 'key_metrics',
          label: 'Key Metrics',
          properties: {
            title: 'Key Performance Indicators',
            bordered: false,
            // `record:highlights` needs a bound record and real fields; a home
            // page has neither, and the four names it listed (total_revenue,
            // deals_won, …) exist on no object — the card rendered blank.
            // `object-metric` widgets aggregate live data instead.
            body: [
              {
                type: 'object-metric',
                id: 'kpi_revenue_won',
                properties: {
                  objectName: 'crm_opportunity',
                  label: 'Revenue (Won)',
                  icon: 'dollar-sign',
                  aggregate: { field: 'amount', function: 'sum' },
                  filter: { stage: 'closed_won' },
                },
              },
              {
                type: 'object-metric',
                id: 'kpi_deals_won',
                properties: {
                  objectName: 'crm_opportunity',
                  label: 'Deals Won',
                  icon: 'trophy',
                  aggregate: { field: 'id', function: 'count' },
                  filter: { stage: 'closed_won' },
                },
              },
              {
                type: 'object-metric',
                id: 'kpi_pipeline_value',
                properties: {
                  objectName: 'crm_opportunity',
                  label: 'Pipeline Value',
                  icon: 'briefcase',
                  aggregate: { field: 'amount', function: 'sum' },
                  filter: { stage: { $nin: ['closed_won', 'closed_lost'] } },
                },
              },
              {
                type: 'object-metric',
                id: 'kpi_open_leads',
                properties: {
                  objectName: 'crm_lead',
                  label: 'Open Leads',
                  icon: 'user-plus',
                  aggregate: { field: 'id', function: 'count' },
                  filter: { is_converted: false },
                },
              },
            ],
          },
        },
        {
          type: 'page:tabs',
          id: 'home_tabs',
          label: 'Home Tabs',
          properties: {
            type: 'card',
            position: 'top',
            items: [
              {
                label: 'My Leads',
                icon: 'user-plus',
                children: [embeddedListView('home_my_leads', 'crm_lead', LeadViews, 'my_leads')],
              },
              {
                // Was "My Opportunities", which promises every deal I own; the
                // view behind it is the open-pipeline one (the nav's My Work >
                // My Deals opens the same `my_open_deals`). The tab name now
                // says what the panel shows.
                label: 'My Open Deals',
                icon: 'dollar-sign',
                children: [embeddedListView('home_my_deals', 'crm_opportunity', OpportunityViews, 'my_open_deals')],
              },
              {
                // Same correction: `my_open_tasks` excludes completed tasks.
                label: 'My Open Tasks',
                icon: 'list-checks',
                children: [embeddedListView('home_my_tasks', 'crm_task', TaskViews, 'my_open_tasks')],
              },
            ],
          },
        },
      ],
    },
    
    {
      name: 'right_sidebar',
      width: 'medium',
      components: [
        {
          type: 'page:card',
          id: 'ai_briefing',
          // The assistant is the PLATFORM's (`ask`), not an app-owned persona:
          // HotCRM contributes skills, the agent lives in the cloud side
          // (maintainer ruling on #612, 2026-08-04). The retired `sales_copilot`
          // agent (#512, ADR-0063 §2) must not be named in live UI copy — and
          // the entry point is the assistant panel the platform opens from the
          // right edge of every page, which is the wording
          // `content/docs/ai-copilot/index.mdx` landed in #611/PR #1001.
          label: 'Today with the AI Assistant',
          properties: {
            title: 'Ask the AI Assistant',
            description:
              'Open the assistant panel from the right edge of the page and ask "what should I focus on today?" — it sees your live pipeline, schema, and accounts.',
            bordered: true,
          },
        },
        {
          type: 'page:card',
          id: 'upcoming_events',
          label: 'Calendar',
          properties: {
            title: "Today's Schedule",
            bordered: true,
          },
        },
      ],
    },
  ],
  
  isDefault: true,
  assignedProfiles: ['sales_rep', 'sales_manager'],
  
  aria: {
    ariaLabel: 'Sales Home Page',
    ariaDescribedBy: 'Sales team home page with metrics, leads, and quick actions',
  },
};

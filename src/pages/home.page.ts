// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { Page, PageComponent, View } from '@objectstack/spec/ui';
import { EventViews } from '../views/event.view';
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
            // Was `Welcome back, {current_user.first_name}`, which rendered as
            // "Welcome back, " — the name was never going to arrive, because
            // that one string mixes three vocabularies that do not compose:
            //
            //  1. `subtitle` is an `I18nLabel` (`ComponentPropsMap`,
            //     `@objectstack/spec/ui`) — a display string or an inline
            //     locale map, resolved by `resolveI18nLabel`. The field has no
            //     token pass and no expression pass of its own.
            //  2. Braces DO resolve in a page header, but the vocabulary is the
            //     BOUND RECORD's own fields — `case_detail.page.ts` records the
            //     measurement, where `{account}` matched no field and the
            //     subtitle rendered blank until it was spelled `{crm_account}`.
            //     A `type: 'home'` page has no record, so no brace token can
            //     ever resolve here.
            //  3. `current_user.first_name` is a CEL path, and CEL is written
            //     bare, never inside `{…}`. The one resolvable brace token in
            //     the filter vocabulary is `{current_user_id}` on its own.
            //
            // A greeting that names the user is not expressible on a
            // translatable label, so the label now says the part that is true
            // in every locale and the four bundles carry the translations
            // (`pages.sales_home_page.subtitle`). Personalising it would need a
            // component that takes user data — no shipped component does
            // (`user:profile` and its neighbours are `emptyProps` rows), so
            // this is a static greeting rather than a widened accept surface.
            subtitle: 'Welcome back',
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
            children: [
              {
                type: 'nav:menu',
                id: 'create_menu',
                properties: {},
              },
            ],
          },
        },
        // There is no `Recent Items` card here any more, and re-adding one
        // needs a data source that does not exist yet.
        //
        // It shipped as a `page:card` with a title and no body: a bordered box
        // with the words "Recent Items" and nothing under them, on the landing
        // page of every `sales_rep` / `sales_manager`. "Recent" is per-user
        // access history across objects, and the platform publishes no source
        // for it on 17.1.0 — `ComponentPropsMap` has no recent-records
        // component, and the two that sound like one (`record:activity`,
        // `record:history`) both read the page's BOUND RECORD, which a home
        // page does not have. Binding it to one object's list view instead
        // would have made the title lie, which is the defect #771 exists to
        // prevent, so the card is removed rather than filled with something
        // that is not recency. See the tracking issue in the PR that removed
        // it; when the platform ships a recent-records source, this is where
        // the card goes back.
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
            children: [
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
            // ⚠️ This paragraph does not reach the screen, and moving it is NOT
            // this card's to do. `description` is not a prop `page:card`
            // declares (`ComponentPropsMap`, @objectstack/spec/ui): the props
            // schema strips it, and objectui's card renderer builds its
            // `<Card>` from `title` / `bordered` / `children` / `footer` only.
            // So this is a third title-only box beside the two #734 fixed —
            // but the copy is pinned in place by the #1002 persona guard in
            // `test/metadata-references.test.ts`, which reads
            // `properties.description` and asserts it is a string, and that
            // guard encodes a maintainer ruling. Relocating the copy to an
            // `element:text` child means rewriting a ruling-backed guard, which
            // is a different card than "fill the two empty containers". Filed;
            // exempted by name in the empty-container rule until then.
            description:
              'Open the assistant panel from the right edge of the page and ask "what should I focus on today?" — it sees your live pipeline, schema, and accounts.',
            bordered: true,
          },
        },
        {
          type: 'page:card',
          id: 'upcoming_events',
          // Was `Calendar` / "Today's Schedule" over an empty bordered box —
          // the card declared no body, so the renderer had nothing to draw.
          //
          // It is bound to `crm_event`'s saved `upcoming_events` view, read off
          // the view exactly like the tabs above, and the name now matches what
          // the panel shows. "Today's Schedule" is NOT what any existing view
          // says: `my_events` is scoped to the current user but carries no date
          // filter, no sort and no date column (27 seeded rows, mostly `held`
          // interactions from the past), while `upcoming_events` is
          // `status: 'planned'` sorted by `start_datetime` ascending with the
          // date on the row. Narrowing either one to today would mean retyping
          // a filter in this page — the second definition the helper above
          // exists to prevent — so the title says "upcoming" instead of
          // promising a day this page cannot compute.
          label: 'Upcoming Events',
          properties: {
            title: 'Upcoming Events',
            bordered: true,
            children: [embeddedListView('home_upcoming_events', 'crm_event', EventViews, 'upcoming_events')],
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

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
 * drifts from `src/sales/views/lead.view.ts` the first time either side is edited.
 *
 * `{current_user_id}` in a saved view's filter resolves on this path (the
 * ObjectQL read path runs `resolveFilterTokens()` since 17.0.0-rc.0), so
 * "mine" really does mean mine here — measured tab by tab in the browser, see
 * the PR. The nav's My Work group reaches the SAME views by name
 * (`src/sales/apps/crm.app.ts`); these tabs are the landing-page shortcut to them.
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
    // The spec list view's spelling: the object in `data`, the kind in `type`.
    // The 18.0.0-next.3 console reads only these; under the retired
    // `objectName` / `viewType` every tab drew "No object named" (measured;
    // objectstack#22444 ruling C).
    properties: {
      data: { provider: 'object', object: objectName },
      type: 'grid',
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
 */
export const SalesHomePage: Page = {
  name: 'sales_home_page',
  label: 'Sales Home',
  description: 'Sales team home page with key metrics, my open work and upcoming events',
  
  type: 'home',
  
  // `three-column` places `header`, `sidebar`, `main`, `aside` and `footer`;
  // each region below is named for the slot it fills. On @objectstack/spec
  // 18.0.0-next.2 a region the template does not place is refused, so the
  // former `right_sidebar` is `aside`, and the empty `left_sidebar` is gone
  // (see the note above `main`). The page declares no `isDefault` either:
  // that is refused off a record page, and where the app opens is its
  // navigation's business (objectstack#23610).
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
            // The heading is the name the sidebar gives this page (`nav_sales_home`
            // in `crm.app.ts`), so the entry a rep clicks and the page it opens
            // agree (#2125). It restates the page `label` on purpose: the locale
            // packs carry no `pages.sales_home_page.title`, and the platform's
            // `translatePage` puts each pack's `label` here instead, so the
            // heading can never drift from the nav label in any language.
            // `test/sales-home-header.test.ts` holds that, locale by locale.
            title: 'Sales Home',
            // No `subtitle` (#2125). On the 18.0.0-next.3 console the page
            // `description` above is drawn directly under this heading, and it
            // already says what the page holds; a subtitle saying it again
            // would be a second line repeating the first. The former
            // "Welcome back" said nothing: a greeting that names the user is
            // not expressible on a translatable label (the brace vocabulary
            // in a page header is the BOUND RECORD's fields, and a `home`
            // page has none — see `case_detail.page.ts`).
            // `icon` removed from `page:header` in @objectstack/spec 17.0.0
            // (#6946, ADR-0087 D2) — deleted, not renamed. See the full note on
            // `account_detail.page.ts`; nothing ever drew it.
            // `breadcrumb` retired from `page:header` in @objectstack/spec 17.6.0
            // (#20785, `page-header-breadcrumb-removed`) — deleted: no renderer
            // ever drew a trail for it; the app shell's own trail is unchanged.
          },
        },
      ],
    },
    
    // No `sidebar` region. It has held nothing since #2117, and on
    // 18.0.0-next.2 `three-column` gives a declared `sidebar` its column even
    // when it is empty: measured, the empty region pushed `main` 280 px right
    // and left that strip blank beside the KPIs.
    //
    // There is no `Quick Create` card here any more either (#2060 item 5),
    // and re-adding one needs a block that creates records.
    //
    // It was a `page:card` titled "Quick Create" around a bare `nav:menu`,
    // which draws the app's navigation: the sidebar a second time, 28
    // links, nothing that creates. The title lied, as below. On 18.0.0-next.1
    // `ComponentPropsMap` has no create block: the `action:*` blocks run
    // `script` / `url` / `modal` / `flow` / `api` / `form`, where `form`
    // opens a FormView at `/forms/NAME` and `modal` a page, so a "New Lead"
    // button would hard-code a console route. Each list page has its own
    // New button. When the platform ships a create block, it goes in a
    // `sidebar` region here.
    //
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
    // that is not recency. Recorded as #1217; when the platform ships a
    // recent-records source, this is where the card goes back.
    
    {
      name: 'main',
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
            //
            // These read every record — no date window — so each label says
            // "(All Time)": the dashboards' tiles of the same measure follow a
            // date picker or a fixed window and show smaller numbers (#2291).
            // Open Leads is a current-state count on every page and needs no
            // window.
            children: [
              {
                type: 'object-metric',
                id: 'kpi_revenue_won',
                properties: {
                  objectName: 'crm_opportunity',
                  label: 'Total Revenue (All Time)',
                  icon: 'dollar-sign',
                  aggregate: { field: 'amount', function: 'sum' },
                  filter: [{ field: 'stage', operator: 'equals', value: 'closed_won' }],
                },
              },
              {
                type: 'object-metric',
                id: 'kpi_deals_won',
                properties: {
                  objectName: 'crm_opportunity',
                  label: 'Deals Won (All Time)',
                  icon: 'trophy',
                  aggregate: { field: 'id', function: 'count' },
                  filter: [{ field: 'stage', operator: 'equals', value: 'closed_won' }],
                },
              },
              {
                type: 'object-metric',
                id: 'kpi_pipeline_value',
                properties: {
                  objectName: 'crm_opportunity',
                  label: 'Open Pipeline (All Time)',
                  icon: 'briefcase',
                  aggregate: { field: 'amount', function: 'sum' },
                  filter: [{ field: 'stage', operator: 'not_in', value: ['closed_won', 'closed_lost'] }],
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
                  filter: [{ field: 'is_converted', operator: 'equals', value: false }],
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
            /**
             * `type` → `tabStyle` (@objectstack/spec 17.0.0, #6776, ADR-0087
             * D2). The concept and the value vocabulary (`line` | `card` |
             * `pill`) are unchanged; only the spelling moved, because a props
             * key named `type` collides with the page component's own dispatch
             * key: objectui's `SchemaRenderer` hoists `properties` onto the node
             * but deliberately skips `type` and `id` (or the inner value would
             * shadow which renderer to dispatch to), and `sdui-parser` lists
             * `type` in `BASE_PROPS`, so a manifest input by that name is never
             * validated at all.
             *
             * Renaming is behaviour-preserving on this page and on the three
             * record pages: the renderer resolves
             * `schema?.properties?.type || schema?.tabStyle || 'line'`, so it
             * has been honouring the retired spelling as a back-compat read all
             * along and picks up the canonical one through the same hoist.
             */
            tabStyle: 'card',
            position: 'top',
            // Each tab item carries a `value` (#2284): it is the `?tab=` URL
            // token the renderer reads and the key the locale pack translates
            // the tab label under (`pages.sales_home_page.components.home_tabs
            // .items.<value>.label`, spec 18.1.0). An item without one gets no
            // translation slot, so its label stayed English in every locale.
            // Each value is the view key the tab embeds.
            items: [
              {
                value: 'my_leads',
                label: 'My Leads',
                icon: 'user-plus',
                children: [embeddedListView('home_my_leads', 'crm_lead', LeadViews, 'my_leads')],
              },
              {
                // Was "My Opportunities", which promises every deal I own; the
                // view behind it is the open-pipeline one (the nav's My Work >
                // My Deals opens the same `my_open_deals`). The tab name now
                // says what the panel shows.
                value: 'my_open_deals',
                label: 'My Open Deals',
                icon: 'dollar-sign',
                children: [embeddedListView('home_my_deals', 'crm_opportunity', OpportunityViews, 'my_open_deals')],
              },
              {
                // Same correction: `my_open_tasks` excludes completed tasks.
                value: 'my_open_tasks',
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
      name: 'aside',
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
            bordered: true,
            // The paragraph is an `element:text` child (#1581). It used to be
            // `properties.description`, which `page:card` does not declare, so
            // the card rendered as a title over nothing. `content` is not on
            // the locale pack's page-component face, so the four languages
            // live here as an inline locale map, the spec's route for page
            // prose. The #1002 persona guard in
            // `test/metadata-references.test.ts` reads this child.
            children: [
              {
                type: 'element:text',
                id: 'ai_briefing_text',
                properties: {
                  content: {
                    en: 'Open the assistant panel from the right edge of the page and ask "what should I focus on today?" — it sees your live pipeline, schema, and accounts.',
                    'zh-CN':
                      '从页面右侧打开助手面板，询问"我今天应该关注什么？"——它可以实时查看您的销售管道、架构与客户信息。',
                    'es-ES':
                      'Abra el panel del asistente desde el borde derecho de la página y pregunte "¿en qué debería concentrarme hoy?" — ve su flujo de ventas, esquema y cuentas en tiempo real.',
                    'ja-JP':
                      'ページ右端からアシスタントパネルを開き、「今日は何に集中すべきか？」と尋ねてください — リアルタイムのパイプライン、スキーマ、取引先情報を把握しています。',
                  },
                },
              },
            ],
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
  
  aria: {
    ariaLabel: 'Sales Home Page',
    ariaDescribedBy: 'Sales team home page with metrics, my open work and upcoming events',
  },
};

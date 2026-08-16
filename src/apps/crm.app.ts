// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { App } from '@objectstack/spec/ui';

/**
 * HotCRM — v1 navigation.
 *
 * Intentionally narrow. v1 sells one story: "the CRM that rewrites itself
 * when your business changes." Every nav item users see must serve that
 * demo. Marketing/Forecast/Contract/CPQ/Products live in source but are
 * hidden from primary nav for v1 — users still reach them via lookups,
 * global search, or by enabling them in a future profile.
 */
export const CrmApp = App.create({
  name: 'crm_enterprise',
  label: 'HotCRM',
  icon: 'briefcase',
  // ADR-0063 §1/§2 — `defaultAgent` is a surface binding, not a custom-agent
  // slot: the only resolvable values are the two PLATFORM agents, `ask` (data
  // surface) and `build` (authoring surface). HotCRM is a data surface, so it
  // binds `ask`; the app's own AI capability ships as skills (`src/skills/`),
  // which attach to the platform agents by `surface` affinity. The app-authored
  // agents this key used to name were retired in #512.
  defaultAgent: 'ask',
  // `logo`/`favicon` point at the repo's existing `assets/icon.svg` (#731):
  // the previously-referenced `crm-logo.png` / `crm-favicon.ico` were never
  // added to `assets/`, and — separately — the runtime never serves a plain
  // `/assets/*` path at all; static assets under `assets/` are only mounted
  // at `/runtime/assets/:filename` (packages/cli's `createRuntimeAssetsPlugin`
  // in @objectstack/cli). Verified live: GET /runtime/assets/icon.svg → 200,
  // `content-type: image/svg+xml`. Both console consumers accept an SVG
  // string here — `logo` renders via a plain `<img src>` (objectui's
  // `AppSidebar.tsx`) and `favicon` is set via `link.href` (objectui's
  // `AppShell.tsx`'s `useAppShellBranding`) — so repointing to the existing
  // icon is correct without adding new binary assets.
  branding: {
    primaryColor: '#4169E1',
    logo: '/runtime/assets/icon.svg',
    favicon: '/runtime/assets/icon.svg',
  },

  navigation: [
    // Pinned landing — single executive view, single click from launcher.
    {
      id: 'nav_home',
      type: 'dashboard',
      dashboardName: 'executive_dashboard',
      label: 'Home',
      icon: 'home',
    },

    {
      id: 'group_sales',
      type: 'group',
      label: 'Sales',
      icon: 'chart-line',
      expanded: true,
      children: [
        { id: 'nav_lead',        type: 'object', objectName: 'crm_lead',        label: 'Leads',         icon: 'user-plus' },
        { id: 'nav_account',     type: 'object', objectName: 'crm_account',     label: 'Accounts',      icon: 'building' },
        // ADR-0047 interface page — the curated counterpart to the Accounts
        // object entry (quick filters only; activates with spec > 9.2.0).
        { id: 'nav_account_workbench', type: 'page', pageName: 'account_workbench', label: 'Account Workbench', icon: 'sliders-horizontal' },
        { id: 'nav_contact',     type: 'object', objectName: 'crm_contact',     label: 'Contacts',      icon: 'user' },
        { id: 'nav_opportunity', type: 'object', objectName: 'crm_opportunity', label: 'Opportunities', icon: 'target' },
        { id: 'nav_pipeline',    type: 'object', objectName: 'crm_opportunity', viewName: 'pipeline_kanban', label: 'Pipeline', icon: 'columns-3' },
        { id: 'nav_quote',       type: 'object', objectName: 'crm_quote',       label: 'Quotes',        icon: 'receipt' },
        // Contracts close the sales cycle: quote → signed agreement → renewal.
        // The object, its views and its renewal automation all shipped, but
        // there was no way to reach any of it from the app.
        { id: 'nav_contract',    type: 'object', objectName: 'crm_contract',    label: 'Contracts',     icon: 'file-signature' },
        { id: 'nav_sales_dashboard', type: 'dashboard', dashboardName: 'sales_dashboard', label: 'Sales Performance', icon: 'chart-line' },
      ],
    },

    {
      // Everything a rep owes someone. `crm_task` had views, seed data, a
      // recurrence hook and two reminder flows, and no entry point — the only
      // way to see a task was to open the record it hung off.
      id: 'group_work',
      type: 'group',
      label: 'My Work',
      icon: 'list-checks',
      expanded: true,
      // These are ListViews, not a dashboard, and that is deliberate. A
      // "My Day" dashboard was built and removed: dashboard widget filters do
      // NOT interpolate `{current_user}` / `{current_user_id}` — the literal
      // string reaches the query and matches no owner, so every widget renders
      // 0. Proven side by side on one dashboard: `{current_user}` → 0,
      // `{current_user_id}` → 0, no owner filter → 10,100,081. The token is
      // implemented in platform-objects (the ListView data path) and has no
      // counterpart in service-analytics. Filed upstream; until it lands, a
      // ListView is the only surface where "mine" actually means mine.
      children: [
        { id: 'nav_my_tasks', type: 'object', objectName: 'crm_task', viewName: 'my_open_tasks', label: 'My Tasks', icon: 'circle-check' },
        { id: 'nav_my_deals', type: 'object', objectName: 'crm_opportunity', viewName: 'my_open_deals', label: 'My Deals', icon: 'target' },
        { id: 'nav_my_leads', type: 'object', objectName: 'crm_lead', viewName: 'my_leads', label: 'My Leads', icon: 'user-plus' },
        { id: 'nav_my_cases', type: 'object', objectName: 'crm_case', viewName: 'my_open_cases', label: 'My Cases', icon: 'life-buoy' },
        // #592 — the rep's own calendar. Same reasoning as `nav_my_tasks`: a
        // ListView is the only surface where "mine" actually means mine
        // (`{current_user_id}` interpolates on the list-view data path and
        // nowhere else), so the personal calendar is a view, not a dashboard.
        { id: 'nav_my_calendar', type: 'object', objectName: 'crm_event', viewName: 'my_events', label: 'My Calendar', icon: 'calendar-days' },
        { id: 'nav_all_tasks', type: 'object', objectName: 'crm_task', label: 'All Tasks', icon: 'list' },
      ],
    },

    {
      // #592 — activity was the app's largest blind spot: `crm_event` and its
      // attendee rows had nowhere to be seen, and no dashboard anywhere counted
      // an interaction. Kept as its own group rather than buried under Sales,
      // because "what happened with this customer, and when?" is the question
      // the whole batch was about.
      id: 'group_activity',
      type: 'group',
      label: 'Activity',
      icon: 'calendar-days',
      expanded: true,
      children: [
        { id: 'nav_event',          type: 'object',    objectName: 'crm_event',   label: 'Events',          icon: 'calendar-days' },
        { id: 'nav_event_calendar', type: 'object',    objectName: 'crm_event',   viewName: 'event_calendar', label: 'Calendar',    icon: 'calendar' },
        { id: 'nav_event_history',  type: 'object',    objectName: 'crm_event',   viewName: 'held_events',    label: 'Interaction History', icon: 'history' },
        { id: 'nav_activity_dashboard', type: 'dashboard', dashboardName: 'sales_activity_dashboard', label: 'Sales Activity', icon: 'activity' },
      ],
    },

    {
      // Campaigns drive lead_source and the campaign-member records that
      // "Add to Campaign" writes — with no nav entry the marketing half of
      // the data model was invisible.
      id: 'group_marketing',
      type: 'group',
      label: 'Marketing',
      icon: 'megaphone',
      children: [
        { id: 'nav_campaign', type: 'object', objectName: 'crm_campaign', label: 'Campaigns', icon: 'megaphone' },
        { id: 'nav_product',  type: 'object', objectName: 'crm_product',  label: 'Products',  icon: 'package' },
      ],
    },

    {
      id: 'group_service',
      type: 'group',
      label: 'Service',
      icon: 'headset',
      expanded: true,
      children: [
        { id: 'nav_case',      type: 'object', objectName: 'crm_case',              label: 'Cases',     icon: 'life-buoy' },
        { id: 'nav_knowledge', type: 'object', objectName: 'crm_knowledge_article', label: 'Knowledge', icon: 'book-open' },
        { id: 'nav_service_dashboard', type: 'dashboard', dashboardName: 'service_dashboard', label: 'Service Overview', icon: 'gauge' },
      ],
    },

    {
      id: 'group_insights',
      type: 'group',
      label: 'Insights',
      icon: 'sparkles',
      children: [
        // Trimmed to three high-signal reports. Full report catalogue still
        // ships as metadata; admins can pin more from the report picker.
        { id: 'nav_crm_dashboard',            type: 'dashboard', dashboardName: 'crm_overview_dashboard', label: 'CRM Overview',      icon: 'layout-dashboard' },
        { id: 'nav_forecast',                 type: 'object', objectName: 'crm_forecast',                 label: 'Forecasts',         icon: 'trending-up' },
        { id: 'nav_report_pipeline_coverage', type: 'report', reportName: 'pipeline_coverage_by_quarter', label: 'Pipeline Coverage', icon: 'columns-3' },
        { id: 'nav_report_lead_inflow',       type: 'report', reportName: 'lead_inflow_by_month_source',  label: 'Lead Inflow',       icon: 'trending-up' },
        { id: 'nav_report_sla',               type: 'report', reportName: 'sla_performance',              label: 'SLA Performance',   icon: 'timer' },
      ],
    },

    {
      id: 'group_approvals',
      type: 'group',
      label: 'Approvals',
      icon: 'check-circle',
      children: [
        // "Inbox" (zh-CN 待我审批) must land somewhere an approver can actually
        // approve. It used to be `type: 'object'` on `sys_approval_request` —
        // the approvals plugin's raw request table, which is read-only: no row
        // actions, no approve/reject, only Share on the record detail. The label
        // promised an action the destination could not perform (#1123).
        //
        // `component` — not `url`. The platform's approval centre is a
        // first-party console surface registered in the ComponentRegistry as
        // `approvals:inbox` (registered by @objectstack/console itself, source
        // `@object-ui/console`, rendering ApprovalsInboxPage) — exactly what the
        // spec documents `component` for: "a first-party UI shipped with the
        // platform — typically admin/setup surfaces that have no row in any data
        // store". `url` is documented as the *external link* type, and taking it
        // would mean hard-coding a console-internal route plus this app's own
        // name (`/apps/crm_enterprise/system/approvals`) into metadata. A
        // `componentRef` instead resolves against the *current* app base, so the
        // entry keeps the user inside HotCRM's shell without naming the app, and
        // a ref that ever stops resolving renders a loud "Component not
        // registered" panel rather than silently bouncing to the console home.
        //
        // The read-only object list is not kept as a second "history" entry: the
        // approval centre already subsumes it — My Pending / Submitted by me /
        // All tabs plus a status filter (Pending / Approved / Rejected /
        // Recalled / Returned for revision) — so a second entry would add a
        // strictly weaker view of the same rows.
        //
        // `requiresObject` is retained: it is a base nav-item field on every
        // item type, so the entry still hides itself on installs where
        // @objectstack/plugin-approvals is absent and no approval exists to act
        // on.
        { id: 'nav_approval_requests', type: 'component', componentRef: 'approvals:inbox', label: 'Inbox',     icon: 'inbox',   requiresObject: 'sys_approval_request' },
        // No "Processes" item: @objectstack/plugin-approvals registers
        // sys_approval / sys_approval_request / sys_approval_action …, but no
        // `sys_approval_process` object exists in any installed plugin, so the
        // old item's requiresObject guard hid it on every install, forever.
      ],
    },
  ],
});

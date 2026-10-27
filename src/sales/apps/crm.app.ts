// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import { App } from '@objectstack/spec/ui';

// The brand mark, inlined as a `data:` URI of `assets/icon.svg` (#2051), so it
// travels inside the published artifact. The path it replaces,
// `/runtime/assets/icon.svg` (#731), resolves only under `objectstack serve`
// run from this repo — the CLI's `createRuntimeAssetsPlugin` mounts the
// project's `assets/` there. A hosted install runs the artifact, which carried
// the path but not the file, and its runtime mounts no `/runtime/assets/`: the
// logo answered 404 on every hosted environment. The SVG's own bytes, with only
// `%`, `#` and line breaks percent-encoded: a raw `#` would start a URL fragment
// and a raw newline is stripped by the URL parser. `assets/icon.svg` stays the
// single source — `test/app-branding-icon.test.ts` decodes this URI as a browser
// does and requires the file's exact bytes back, so edit the file, then this.
const HOTCRM_ICON =
  'data:image/svg+xml,' +
  '<svg width="256" height="256" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="HotCRM">%0A' +
  '  <rect x="16" y="16" width="224" height="224" rx="56" fill="%23EA580C"/>%0A' +
  '  <path d="M76 64h40v52h24V64h40v128h-40v-52h-24v52H76z" fill="%23FFFFFF"/>%0A' +
  '</svg>%0A';

/**
 * The gate on the entries built on `crm_opportunity` (#2060 item 5): Home
 * (Executive Overview), Sales Home, Sales Performance, CRM Overview and the
 * four opportunity reports under Reports. A member whose permission sets do
 * not read opportunities got each one as a page of "You don't have access"
 * tiles, one 403 per opportunity query. Object entries are pruned by read
 * access already; dashboard, report and page entries are not. Home asks one
 * more term (`EXECUTIVE_AUDIENCE`); the other seven share
 * `OPPORTUNITY_AUDIENCE` below. (This note was the `READS_OPPORTUNITIES` note
 * until #2268 retired that constant; `src/service/index.ts` cites it by that
 * name.)
 *
 * `visible`, not `requiredPermissions` — measured on 18.0.0-next.1: the server
 * keeps an entry only when the caller's permission sets grant every
 * `requiredPermissions` entry as a CAPABILITY (`systemPermissions`), so
 * `['crm_opportunity:read']` hid the entry from every user, the admin
 * included, and a capability of our own would be a grant change. This asks
 * the effective object permission itself.
 *
 * Sales Activity (1 of 13 tiles) stays open: it works without opportunity
 * read. Since objectui#12426 (in the 18.0.0-next.2 console) the gate moves the
 * landing too: the console opens an app on the first entry the member is
 * SHOWN, not the first one served.
 */

/**
 * The read question for the other report entries (#2073 item 1): each asks
 * for read on the object its report's dataset reads. The service module gates
 * its case reports the same way.
 *
 * Customer Churn Signals asks for account read only. Three of its four panels
 * read accounts; measured on 18.0.0-next.3, a service agent (accounts, no
 * opportunities) gets those three and a "You don't have access" panel for
 * Recently Lost Opportunities — a working report, kept open like Sales
 * Activity rather than hidden.
 */
const READS_LEADS = P`current_user.can("crm_lead", "read")`;
const READS_ACCOUNTS = P`current_user.can("crm_account", "read")`;

/**
 * Executive Overview's audience (#2060 item 5): everyone who reads
 * opportunities, except a sales rep and the two service personas.
 *
 * The app opens on the first entry a member is shown, and Home is first, so
 * this gate is what sends a rep to Sales Home (second) instead. A rep's grants
 * are a subset of a manager's on every object, so no `current_user.can(…)`
 * term can tell the two apart: the only candidates are grants a rep happens
 * to lack (`transfer`, `delete`), which say "cannot reassign deals", not "is a
 * rep", and the marketing user lacks them too. What a rep IS, is the holder
 * of the `sales_rep` position (`src/sales/sharing/positions.ts`; it binds the
 * `sales_rep` permission set by name). So the role is asked by position, and
 * the access half stays the same object-permission question as above.
 *
 * The service personas are asked by position for the same reason (#2262).
 * Since #2231 every member holds `crm_user`, the package's `isDefault` set,
 * which reads the member's own opportunities: a service agent and a service
 * manager answer the read question exactly as a manager does, so it no longer
 * keeps Home from them, and they opened the app on Home instead of Service
 * Overview. What they ARE is the holder of the `service_agent` or the
 * `service_manager` position. ⛔ Do not narrow `crm_user` to restore the old
 * answer: #2231 requires a member holding only it to read opportunities.
 *
 * Managers, administrators and the marketing user keep Home first. A member
 * whose positions are unknown evaluates `[]`, so the gate keeps Home for them.
 */
const EXECUTIVE_AUDIENCE = P`current_user.can("crm_opportunity", "read") && !("sales_rep" in current_user.positions) && !("service_agent" in current_user.positions) && !("service_manager" in current_user.positions)`;

/**
 * The audience of Sales Home (#2262) and of the six opportunity entries
 * (#2268: Sales Performance, CRM Overview and the four opportunity reports):
 * everyone who reads opportunities, except the two service personas —
 * `EXECUTIVE_AUDIENCE` above says why they are asked by position. Since #2231
 * the read term alone showed them all seven, each scoped to the deals they
 * own. A rep keeps them: Sales Home is a rep's landing. ⛔ Do not narrow
 * `crm_user` instead (#2231); the object entries (Opportunities, My Deals,
 * Leads…) keep no position term and stay visible to them.
 *
 * Each gate spells the positions out: `P` interpolates a value as a literal,
 * never as an expression, so a sub-predicate cannot be shared by reference.
 * One constant is shared by the seven entries instead.
 */
const OPPORTUNITY_AUDIENCE = P`current_user.can("crm_opportunity", "read") && !("service_agent" in current_user.positions) && !("service_manager" in current_user.positions)`;

/**
 * HotCRM — navigation.
 *
 * Intentionally narrow. The app sells one story: "the CRM that rewrites
 * itself when your business changes," and `content/docs/whats-new.mdx`
 * promises a nav "a new user can find their way around in 30 seconds."
 *
 * ## One entry per destination, one exemplar per nav-item type (#1259)
 *
 * The sidebar had grown to 7 groups / 31 items, almost entirely through one
 * pattern: the same object surfaced again and again through its own views —
 * `crm_event` had four entries, `crm_opportunity` three — while every list
 * page already carries a view-switcher tab strip that reaches all of them.
 * Those redundant view entries are gone; each removed destination stays one
 * click away on its object's tab strip — which the console builds from the
 * VIEW DESCRIPTORS in `src/<pkg>/views/*.view.ts`: the primary `list` plus every
 * `listViews` entry, one tab each, carrying that view's own `label`. So
 * reachability needs nothing authored; a `listViews` entry is on the strip by
 * existing. What `test/view-references.test.ts` → "every named list view is
 * reachable" holds is the half that CAN dangle — a navigation entry naming a
 * view no view file defines.
 *
 * What is NOT trimmed is the demonstration. This is the exemplar app, and
 * nav items come in six kinds — plain `object`, object + `viewName` (a view
 * entry), `page`, `dashboard`, `report`, `component`. **Every kind keeps at
 * least one entry**, because showing an author what each kind looks like is
 * part of what this app is for. `test/app-navigation-shape.test.ts` pins that
 * floor, so a future slimming pass cannot delete the last exemplar of a kind
 * without going red.
 *
 * Personalisation rides the platform's pin + recent mechanisms rather than
 * pre-materialising every possible entry for every user.
 */
export const CrmApp = App.create({
  name: 'crm_enterprise',
  label: 'HotCRM',
  icon: 'briefcase',
  // ADR-0063 §1/§2 — `defaultAgent` is a surface binding, not a custom-agent
  // slot: the only resolvable values are the two PLATFORM agents, `ask` (data
  // surface) and `build` (authoring surface). HotCRM is a data surface, so it
  // binds `ask`; the app's own AI capability ships as skills (`src/*/skills/`),
  // which attach to the platform agents by `surface` affinity. The app-authored
  // agents this key used to name were retired in #512.
  defaultAgent: 'ask',
  // `logo` and `favicon` are the inlined `HOTCRM_ICON` above (#2051), never a
  // server path: an install serves only what the artifact carries. The console
  // passes each value through untouched — `logo` as the sidebar's `<img src>`,
  // `favicon` as the favicon `link.href` — and a `data:` URI renders in both.
  // `primaryColor` is the icon's tile fill (#2066): the mark and the theme are one orange.
  branding: {
    primaryColor: '#EA580C',
    logo: HOTCRM_ICON,
    favicon: HOTCRM_ICON,
  },

  navigation: [
    // ── The order below IS each persona's landing (#2060 item 5) ─────────────
    //
    // The console opens an app on the first entry the member is shown — after
    // `visible`, `requiredPermissions` and the object-read prune, the gates the
    // sidebar draws with (objectui#12426, in the 18.0.0-next.2 console). There
    // is no landing key to declare, so the first three slots are ordered and
    // gated so that each persona's first shown entry is its home:
    //
    //   sales manager · administrator · marketing user → Home (Executive Overview)
    //   sales rep                                       → Sales Home
    //   service agent · service manager                 → Service Overview
    //
    // Both pinned entries are gated away from a service persona by the
    // position it holds (#2262: since #2231 it reads its own opportunities, so
    // the read question alone no longer parts it), and the next slot is the
    // Service group, which the service module fills with its dashboard first.
    // ⛔ Do not put an entry a service persona can see ahead of the Service
    // group: it becomes their landing.
    //
    // A member who reads NONE of the objects this tree names (no HotCRM grant
    // yet: `crm_user` not accepted on a managed environment, #2231) is never
    // opened on this order. Since objectui#13347 (the 18.1.0 console) the app
    // root sends them to the platform's access page first (objectstack#25338,
    // #2250), so ⛔ no gate here asks "reads anything" and HotCRM authors no
    // access page. `test/app-navigation-audience.test.ts` pins both landings.
    {
      id: 'nav_home',
      type: 'dashboard',
      dashboardName: 'executive_dashboard',
      label: 'Home',
      icon: 'home',
      visible: EXECUTIVE_AUDIENCE,
    },
    // The rep's own page (`sales_home_page`): pipeline KPIs, my leads, open
    // deals and open tasks, upcoming events — a rep's landing, because Home
    // above is not shown to a rep.
    {
      id: 'nav_sales_home',
      type: 'page',
      pageName: 'sales_home_page',
      label: 'Sales Home',
      icon: 'layout-grid',
      visible: OPPORTUNITY_AUDIENCE,
    },

    {
      id: 'group_service',
      type: 'group',
      label: 'Service',
      icon: 'headset',
      expanded: true,
      // EMPTY ON PURPOSE — this group is a CONTAINER, not a menu.
      //
      // `crm_case`, `crm_knowledge_article`, `service_dashboard` and
      // `sla_performance` belong to `app.objectstack.hotcrm.service`, and an
      // app's own `navigation` may not name another package's object (ADR-0130
      // §1.5): the entry fails at author time with "references object
      // `crm_case` which is not defined in objects". The module puts all three
      // back through `navigationContributions` (ADR-0029 D7), and it can only
      // aim at a group the app DECLARES — a module cannot create one inside an
      // app it does not own. So the app publishes the anchor and the module
      // fills it; `src/service/index.ts` holds the other half, and the two
      // service items of *My Work* and *Insights* come back the same way.
      //
      // FIRST of the groups on purpose (#2060 item 5): a contributed item lands
      // after everything the app declares ahead of it, so this is the only slot
      // where the module's dashboard can be the first entry a service persona
      // is shown — below Sales, a service agent opened the app on Leads.
      //
      // ⛔ Do not "tidy" the group away: deleting it relocates all three
      // contributed items to the app's top level with a
      // `nav_contribution_group_missing` warning.
      children: [],
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
        // No "Account Workbench" entry (#2286): the ADR-0047 interface page
        // `account_workbench` showed the same rows and columns as Accounts, so
        // a second row here read as a duplicate. The page still ships and is
        // reached by URL — not by ⌘K, whose palette on 18.1.0 lists pages
        // from navigation only. `test/account-workbench-exhibit.test.ts` pins
        // that it is served and that no entry here opens it.
        { id: 'nav_contact',     type: 'object', objectName: 'crm_contact',     label: 'Contacts',      icon: 'user' },
        // No separate "Pipeline" entry: the kanban board is another tab on
        // this same list page — `pipeline_kanban` in
        // `OpportunityViews.listViews`, which the switcher puts on the strip
        // under its own label, *Sales Pipeline* — one click from here and
        // zero clicks further than a second sidebar row. The
        // view-entry exemplar duty this item used to carry now sits with the
        // "My Work" items below, which are all object + `viewName`.
        { id: 'nav_opportunity', type: 'object', objectName: 'crm_opportunity', label: 'Opportunities', icon: 'target' },
        { id: 'nav_sales_dashboard', type: 'dashboard', dashboardName: 'sales_dashboard', label: 'Sales Performance', icon: 'chart-line', visible: OPPORTUNITY_AUDIENCE },
        // Contracts close the sales cycle: quote → signed agreement → renewal.
        // The app's own entry since `crm_contract` moved into this package
        // (`module-split-plan.md` item 11), so it is the last of the group's
        // own children, beside the revenue entries that follow it.
        { id: 'nav_contract',    type: 'object', objectName: 'crm_contract',    label: 'Contracts',     icon: 'file-signature' },
        // Quotes and Products follow, contributed by the revenue module
        // (`src/revenue/index.ts`): the app's own navigation may not name
        // another package's object (rule R3), and a contributed item lands
        // after the group's own children (#2270).
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
      // These are ListViews: they list the records themselves, which a
      // dashboard widget (an aggregate over a dataset, ADR-0021) cannot. Both
      // surfaces resolve `{current_user_id}` since objectstack#12230 — the
      // Service dashboard's "My Open Cases by Priority" is the aggregate
      // counterpart of "My Cases" (#510).
      //
      // Every item here is object + `viewName`, which makes this group the
      // app's view-entry exemplar since #1259 retired the "Pipeline" row.
      // The one exception is the approvals Inbox at the bottom — a
      // `component` entry, and the app's only one.
      children: [
        { id: 'nav_my_tasks', type: 'object', objectName: 'crm_task', viewName: 'my_open_tasks', label: 'My Tasks', icon: 'circle-check' },
        { id: 'nav_my_deals', type: 'object', objectName: 'crm_opportunity', viewName: 'my_open_deals', label: 'My Deals', icon: 'target' },
        { id: 'nav_my_leads', type: 'object', objectName: 'crm_lead', viewName: 'my_leads', label: 'My Leads', icon: 'user-plus' },
        // #592 — the rep's own calendar: a list of events, so a view, not a
        // dashboard.
        { id: 'nav_my_calendar', type: 'object', objectName: 'crm_event', viewName: 'my_events', label: 'My Calendar', icon: 'calendar-days' },
        // No "All Tasks" entry: "My Tasks" opens the `crm_task` list page,
        // whose tab strip leads with *All Tasks* — `TaskViews.list`, name
        // `all_tasks`. It leads because it is the object's PRIMARY list: the
        // switcher moves the primary to the front of the strip and marks it
        // default, so nothing has to be authored to say so. The whole book is
        // one tab away, and the sidebar keeps one row per object instead of
        // two.
        //
        // ── The approvals Inbox lives here, not in a group of its own (#1259)
        //
        // It used to be the single child of an "Approvals" group. Its content
        // is a personal queue — the things waiting on *you* — which is what
        // this group is; a one-item group next to it was structure without a
        // distinction. Dissolving that group is why this entry moved, not any
        // rule against single-item groups (Marketing is one and stays one).
        //
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
        //
        // There is no "Processes" item either: @objectstack/plugin-approvals
        // registers sys_approval_request / sys_approval_action /
        // sys_approval_approver / sys_approval_delegation — but neither a bare
        // `sys_approval` nor a `sys_approval_process` object exists in any
        // installed plugin (measured on the 17.2.0 rosters),
        // so the old item's requiresObject guard hid it on every install,
        // forever.
        { id: 'nav_approval_requests', type: 'component', componentRef: 'approvals:inbox', label: 'Inbox', icon: 'inbox', requiresObject: 'sys_approval_request' },
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
        // One row for the object, one for the dashboard. The calendar and the
        // interaction history are two more tabs on this same list page —
        // `event_calendar` and `held_events` in `EventViews.listViews`, which
        // the switcher puts on the strip under each view's own label — #1259
        // removed the sidebar duplicates, not the surfaces. `crm_event` had
        // four sidebar rows;
        // it was the single largest source of the nav's growth.
        { id: 'nav_event',          type: 'object',    objectName: 'crm_event',   label: 'Events',          icon: 'calendar-days' },
        { id: 'nav_activity_dashboard', type: 'dashboard', dashboardName: 'sales_activity_dashboard', label: 'Sales Activity', icon: 'activity' },
      ],
    },

    {
      // Campaigns drive lead_source and the campaign-member records that
      // "Add to Campaign" writes — with no nav entry the marketing half of
      // the data model was invisible.
      //
      // A single-item group on purpose (#1259). Marketing is a domain of its
      // own, and a reader scanning the sidebar for "where does campaign work
      // live" finds it by name. Item-count symmetry is not the goal; the
      // Approvals group was dissolved because its item *was* personal work,
      // not because one child is too few.
      id: 'group_marketing',
      type: 'group',
      label: 'Marketing',
      icon: 'megaphone',
      // Open on load (#2295), like Insights below: a group with no `expanded`
      // key renders CLOSED, because the spec defaults the key to `false`
      // (`GroupNavItemSchema`, 18.1.0), so Campaigns sat behind a click and
      // the sidebar did not say it existed.
      expanded: true,
      // Campaigns is contributed by the marketing module
      // (`src/marketing/index.ts`) — the app keeps the group as the anchor,
      // as it keeps `group_service`. ⛔ Do not tidy the empty group away:
      // the contributed item would land at the app's top level with a
      // `nav_contribution_group_missing` warning.
      children: [],
    },

    {
      id: 'group_insights',
      type: 'group',
      label: 'Insights',
      icon: 'sparkles',
      expanded: true,
      // The reports this group used to pin moved to Reports below (#2073 item 1).
      children: [
        { id: 'nav_crm_dashboard', type: 'dashboard', dashboardName: 'crm_overview_dashboard', label: 'CRM Overview', icon: 'layout-dashboard', visible: OPPORTUNITY_AUDIENCE },
        { id: 'nav_forecast',      type: 'object', objectName: 'crm_forecast',                 label: 'Forecasts',    icon: 'trending-up' },
      ],
    },

    {
      // EVERY shipped report, one entry each (#2073 item 1). ⌘K finds a report
      // only through a nav entry: it matches the active app's entries by label
      // and name. Since the 18.1.0 console there is also a report index at
      // `<app>/reports`, which the console links as its own *All reports* row
      // after this tree — not a child of this group, and on screen whether
      // the group is open or not (measured, #2295).
      //
      // The sales reports are declared below. The case reports belong to the
      // service module, which contributes them into this group the way it
      // fills `group_service` (see there), after the app's own children.
      // `test/app-navigation-shape.test.ts` requires an entry for each report
      // either package registers, so a new report without one goes red.
      //
      // The only group collapsed on load: opened, it lists one row per report
      // (ten for an administrator, seven for a rep, measured on 18.1.0), which
      // would push everything under it down a screen, and the *All reports*
      // row already reaches every report without a click (#2295).
      id: 'group_reports',
      type: 'group',
      label: 'Reports',
      icon: 'file-chart-column',
      expanded: false,
      children: [
        { id: 'nav_report_opportunities_by_stage', type: 'report', reportName: 'opportunities_by_stage',         label: 'Opportunities by Stage',        icon: 'chart-column',  visible: OPPORTUNITY_AUDIENCE },
        { id: 'nav_report_won_by_owner',           type: 'report', reportName: 'won_opportunities_by_owner',     label: 'Won Opportunities by Owner',    icon: 'trophy',        visible: OPPORTUNITY_AUDIENCE },
        { id: 'nav_report_pipeline_coverage',      type: 'report', reportName: 'pipeline_coverage_by_quarter',   label: 'Pipeline Coverage',             icon: 'columns-3',     visible: OPPORTUNITY_AUDIENCE },
        { id: 'nav_report_funnel_by_owner',        type: 'report', reportName: 'opportunity_funnel_owner_stage', label: 'Opportunity Funnel by Owner',   icon: 'funnel',        visible: OPPORTUNITY_AUDIENCE },
        { id: 'nav_report_lead_inflow',            type: 'report', reportName: 'lead_inflow_by_month_source',    label: 'Lead Engagement',               icon: 'trending-up',   visible: READS_LEADS },
        { id: 'nav_report_accounts_by_industry',   type: 'report', reportName: 'accounts_by_industry_type',      label: 'Accounts by Industry & Type',   icon: 'building',      visible: READS_ACCOUNTS },
        { id: 'nav_report_churn_signals',          type: 'report', reportName: 'customer_churn_signals',         label: 'Customer Churn Signals',        icon: 'heart-pulse',   visible: READS_ACCOUNTS },
      ],
    },

  ],
});

// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import { App } from '@objectstack/spec/ui';
import { HOTCRM_ICON } from '../../sales/apps/crm.app';

/**
 * Who holds the `crm_sales_rep` position (`src/sales/sharing/positions.ts`). The
 * entries below ask it the way the app's Home gate does
 * (`EXECUTIVE_AUDIENCE` in `src/sales/apps/crm.app.ts` says why a rep is asked
 * by position, not by grant). `P` interpolates a value as a literal, never as
 * an expression, so each gate spells the position out.
 *
 * A rep does not see this app at all (`tabPermissions` on the `sales_rep` set,
 * #2417). The entry gates stay: a rep who opens it by its address is shown
 * what #2244 showed them, the customers and their own tasks, and no case
 * entry.
 */
export const NOT_A_SALES_REP = P`!("crm_sales_rep" in current_user.positions)`;

/**
 * The rep's own Knowledge entry in the Sales app (#2367 row 1): exactly the
 * members `NOT_A_SALES_REP` refuses. Contributed from `src/service/index.ts`.
 */
export const SALES_REP = P`"crm_sales_rep" in current_user.positions`;

/**
 * The read gate on this package's dashboard and report entries (#2073 item 1,
 * #2338 item 1): the console prunes an object entry by read access, but not a
 * dashboard or a report entry, so a member who reads no cases would be offered
 * tiles that all refuse.
 */
export const CASE_READ_AUDIENCE = P`current_user.can("crm_case", "read") && !("crm_sales_rep" in current_user.positions)`;

/**
 * the Service app (#2417) — the service team's app, declared by the service
 * package because an app package may declare one app only (ADR-0019 D3,
 * measured on 18.3.0: a second app in `src/sales/apps/` fails `defineStack`).
 * A module's app comes and goes with the module: disabling this package takes
 * the app off the launcher (measured on 18.3.0).
 *
 * It names this package's items directly. The customers, the member's own
 * tasks and calendar and the churn report belong to the app package, and an
 * app's own `navigation` may not name another package's object (ADR-0130), so
 * this app declares the groups as ANCHORS and `src/sales/index.ts` contributes
 * them (`navigationContributions`) — the mirror image of how this package
 * used to fill the Sales app's Service group.
 *
 * The console opens an app on the first entry the member is shown, so Service
 * Overview comes first: it is the service personas' landing, as it was in the
 * one-app menu.
 */
export const ServiceApp = App.create({
  name: 'crm_service',
  label: 'Service',
  description: 'Cases, the knowledge base and the customers they belong to',
  icon: 'headset',
  defaultAgent: 'ask',
  branding: {
    primaryColor: '#EA580C',
    logo: HOTCRM_ICON,
    favicon: HOTCRM_ICON,
  },

  navigation: [
    { id: 'nav_service_dashboard', type: 'dashboard', dashboardName: 'service_dashboard', label: 'Service Overview', icon: 'gauge', visible: CASE_READ_AUDIENCE },

    {
      id: 'group_service',
      type: 'group',
      label: 'Service',
      icon: 'headset',
      expanded: true,
      children: [
        { id: 'nav_case',      type: 'object', objectName: 'crm_case',              label: 'Cases',     icon: 'life-buoy', visible: NOT_A_SALES_REP },
        { id: 'nav_knowledge', type: 'object', objectName: 'crm_knowledge_article', label: 'Knowledge', icon: 'book-open', visible: NOT_A_SALES_REP },
      ],
    },

    // ANCHOR — Accounts and Contacts, contributed by the app package.
    { id: 'group_customers', type: 'group', label: 'Customers', icon: 'building', expanded: true, children: [] },

    {
      id: 'group_work',
      type: 'group',
      label: 'My Work',
      icon: 'list-checks',
      expanded: true,
      // My Tasks and My Calendar are contributed by the app package and land
      // after these two.
      children: [
        { id: 'nav_my_cases', type: 'object', objectName: 'crm_case', viewName: 'my_open_cases', label: 'My Cases', icon: 'life-buoy', visible: NOT_A_SALES_REP },
        { id: 'nav_approval_requests', type: 'component', componentRef: 'approvals:inbox', label: 'Inbox', icon: 'inbox', requiresObject: 'sys_approval_request' },
      ],
    },

    {
      id: 'group_reports',
      type: 'group',
      label: 'Reports',
      icon: 'file-chart-column',
      expanded: false,
      // Customer Churn Signals is contributed by the app package.
      children: [
        { id: 'nav_report_cases_by_status',     type: 'report', reportName: 'cases_by_status_priority',     label: 'Cases by Status and Priority', icon: 'chart-column',  visible: CASE_READ_AUDIENCE },
        { id: 'nav_report_sla',                 type: 'report', reportName: 'sla_performance',              label: 'SLA on Closed Cases',          icon: 'timer',         visible: CASE_READ_AUDIENCE },
        { id: 'nav_report_cases_opened_by_day', type: 'report', reportName: 'cases_opened_by_day_priority', label: 'Cases Opened by Day',          icon: 'calendar-days', visible: CASE_READ_AUDIENCE },
      ],
    },

    {
      id: 'group_help',
      type: 'group',
      label: 'Help',
      icon: 'circle-help',
      expanded: false,
      children: [
        { id: 'nav_help_service', type: 'doc', book: 'crm_service_manual', label: 'Service Manual', icon: 'headset' },
      ],
    },
  ],
});

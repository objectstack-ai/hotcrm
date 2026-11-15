// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { App } from '@objectstack/spec/ui';
import { HOTCRM_ICON } from '../../sales/apps/crm.app';

/**
 * the Order to Cash app (「订单与回款」, hotcrm#2465) — finance's app, declared
 * by the order-to-cash module as the Service and Marketing apps are declared
 * by theirs (an app package may declare one app only, ADR-0019 D3). The
 * maintainer ruled it on 2026-11-15 (option A): finance works here, and the
 * Sales app keeps only the collection plan the reps write. Disabling the
 * module takes the whole app off the launcher, as it does for the Marketing
 * app (measured on 18.3.0, #2417).
 *
 * Who sees it is the app package's permission sets (`tabPermissions`):
 * `ar_accountant` sees this app alone; the rep, service and marketing sets
 * hide it; the manager and the administrators see all four apps.
 *
 * The invoices, payments and collection plan are this package's, so the app
 * opens on them (the console opens an app on the first entry the member is
 * shown). The contracts and accounts they belong to, and the member's own
 * tasks, are the app package's: an app's own `navigation` may not name
 * another package's object (ADR-0130), so those groups are ANCHORS that
 * `src/sales/index.ts` fills through `navigationContributions`.
 */
export const O2cApp = App.create({
  name: 'crm_o2c',
  label: 'Order to Cash',
  description: 'Invoices, payments and the collection plan, with the contracts and accounts they belong to',
  icon: 'receipt',
  defaultAgent: 'ask',
  branding: {
    primaryColor: '#EA580C',
    logo: HOTCRM_ICON,
    favicon: HOTCRM_ICON,
  },

  navigation: [
    {
      id: 'group_receivables',
      type: 'group',
      label: 'Receivables',
      icon: 'receipt',
      expanded: true,
      children: [
        { id: 'nav_invoices', type: 'object', objectName: 'crm_invoice', label: 'Invoices', icon: 'receipt' },
        { id: 'nav_payments', type: 'object', objectName: 'crm_payment', label: 'Payments', icon: 'banknote' },
        { id: 'nav_billing_milestones', type: 'object', objectName: 'crm_billing_milestone', label: 'Billing Milestones', icon: 'flag' },
      ],
    },

    {
      // The module's two working views, each one list away from its object's
      // tab strip: what is past due, and what the plan expects this month.
      id: 'group_follow_up',
      type: 'group',
      label: 'Follow-up',
      icon: 'alarm-clock',
      expanded: true,
      children: [
        { id: 'nav_overdue_invoices', type: 'object', objectName: 'crm_invoice', viewName: 'overdue_invoices', label: 'Overdue Invoices', icon: 'alarm-clock' },
        { id: 'nav_planned_this_month', type: 'object', objectName: 'crm_billing_milestone', viewName: 'planned_this_month', label: 'Planned This Month', icon: 'calendar-days' },
      ],
    },

    // ANCHOR — Contracts and Accounts, contributed by the app package.
    { id: 'group_customers', type: 'group', label: 'Contracts and Accounts', icon: 'file-signature', expanded: true, children: [] },

    {
      id: 'group_work',
      type: 'group',
      label: 'My Work',
      icon: 'list-checks',
      expanded: true,
      // My Tasks is contributed by the app package and lands after the Inbox.
      children: [
        { id: 'nav_approval_requests', type: 'component', componentRef: 'approvals:inbox', label: 'Inbox', icon: 'inbox', requiresObject: 'sys_approval_request' },
      ],
    },

    {
      id: 'group_help',
      type: 'group',
      label: 'Help',
      icon: 'circle-help',
      expanded: false,
      children: [
        { id: 'nav_help_o2c', type: 'doc', book: 'crm_o2c_manual', label: 'Order to Cash Manual', icon: 'receipt' },
      ],
    },
  ],
});

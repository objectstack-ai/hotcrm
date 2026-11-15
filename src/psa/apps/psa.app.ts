// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { App } from '@objectstack/spec/ui';
import { HOTCRM_ICON } from '../../sales/apps/crm.app';

/**
 * the Project Delivery app (「项目交付」, hotcrm#2316) — the delivery team's
 * app, declared by the PSA module as the Service, Marketing and Order to Cash
 * apps are declared by theirs (an app package may declare one app only,
 * ADR-0019 D3). The maintainer ruled the shape on 2026-11-15 (option A,
 * `docs/architecture/psa-module-plan.md`, *Recorded 2026-11-15*): a suite
 * module with its own app. Disabling the module takes the whole app off the
 * launcher, as it does for the Order to Cash app.
 *
 * The module's own objects come first (phase 1a): Projects, then Time and
 * Expenses (with the two to-approve lists a project manager works from), then
 * the rate cards. Accounts, Opportunities and Contracts, and My Tasks, are the
 * app package's, reaching the app through ANCHOR groups that
 * `src/sales/index.ts` fills with `navigationContributions` — an app's own
 * `navigation` may not name another package's object (ADR-0130).
 *
 * Who sees it is the app package's permission sets (`tabPermissions`): the
 * three delivery sets and the sales manager are offered it; reps, service,
 * marketing and receivables hide it. A member who holds none of those sets is
 * offered it too, as every app is offered to them: the administrators, and the
 * executive and director positions, which carry no set of their own (measured
 * on 18.4.0, #2316 phase 0).
 */
export const PsaApp = App.create({
  name: 'crm_psa',
  label: 'Project Delivery',
  description: 'Projects, the people staffed on them, their time and expenses, and the margin that results',
  icon: 'briefcase',
  defaultAgent: 'ask',
  branding: {
    primaryColor: '#0D9488',
    logo: HOTCRM_ICON,
    favicon: HOTCRM_ICON,
  },

  navigation: [
    {
      id: 'group_projects',
      type: 'group',
      label: 'Projects',
      icon: 'briefcase',
      expanded: true,
      children: [
        { id: 'nav_projects', type: 'object', objectName: 'crm_project', label: 'All Projects', icon: 'briefcase' },
        { id: 'nav_my_projects', type: 'object', objectName: 'crm_project', viewName: 'my_projects', label: 'My Projects', icon: 'user-check' },
        { id: 'nav_project_members', type: 'object', objectName: 'crm_project_member', label: 'Staffing', icon: 'user-plus' },
      ],
    },
    {
      id: 'group_time_expenses',
      type: 'group',
      label: 'Time and Expenses',
      icon: 'clock',
      expanded: true,
      children: [
        { id: 'nav_my_timesheets', type: 'object', objectName: 'crm_timesheet', viewName: 'my_timesheets', label: 'My Timesheets', icon: 'clock' },
        { id: 'nav_my_expenses', type: 'object', objectName: 'crm_expense', viewName: 'my_expenses', label: 'My Expenses', icon: 'receipt' },
        { id: 'nav_timesheets_to_approve', type: 'object', objectName: 'crm_timesheet', viewName: 'timesheets_to_approve', label: 'Timesheets to Approve', icon: 'clipboard-check' },
        { id: 'nav_expenses_to_approve', type: 'object', objectName: 'crm_expense', viewName: 'expenses_to_approve', label: 'Expenses to Approve', icon: 'clipboard-check' },
      ],
    },
    {
      id: 'group_rates',
      type: 'group',
      label: 'Rates',
      icon: 'badge-dollar-sign',
      expanded: false,
      children: [
        { id: 'nav_rate_cards', type: 'object', objectName: 'crm_rate_card', label: 'Rate Cards', icon: 'badge-dollar-sign' },
      ],
    },

    // ANCHOR — Accounts, Opportunities and Contracts, contributed by the app package.
    { id: 'group_customers', type: 'group', label: 'Customers and Contracts', icon: 'building', expanded: true, children: [] },

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
  ],
});

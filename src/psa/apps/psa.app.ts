// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
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
 * Expenses (with the two to-approve lists a project manager works from; the
 * expense entries are contributed by the expense module since hotcrm#2556),
 * then the rate cards. Accounts, Opportunities and Contracts, and My Tasks, are the
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
        // Budget versions (#2547): cost, so offered to whoever may read them,
        // which a team member may not.
        {
          id: 'nav_project_budgets', type: 'object', objectName: 'crm_project_budget', label: 'Budgets', icon: 'wallet',
          visible: P`current_user.can("crm_project_budget", "read")`,
        },
        // The plans (#2545): every task the reader may see on the Gantt, and
        // the open tasks they own.
        { id: 'nav_project_plan', type: 'object', objectName: 'crm_project_task', viewName: 'project_plan', label: 'Project Plan', icon: 'gantt-chart' },
        { id: 'nav_my_project_tasks', type: 'object', objectName: 'crm_project_task', viewName: 'my_project_tasks', label: 'My Project Tasks', icon: 'list-checks' },
        // The module's own dashboard, over its own datasets (phase 1c). Its
        // money tiles aggregate the cost a team member may not read: the
        // analytics door refuses that aggregate (403 "not permitted to
        // aggregate [actual_labor_cost, actual_expense_cost]", measured on
        // 18.4.0), so the entry is not offered to someone staffed only as a
        // team member, rather than open on refused tiles. Visibility only;
        // the field-level grant is what protects the figures.
        {
          id: 'nav_projects_overview', type: 'dashboard', dashboardName: 'projects_overview', label: 'Projects Overview', icon: 'chart-bar',
          visible: P`current_user.can("crm_project", "read") && (!("crm_project_member" in current_user.positions) || "crm_project_manager" in current_user.positions || "crm_project_director" in current_user.positions || "crm_pmo" in current_user.positions || "crm_finance_controller" in current_user.positions)`,
        },
      ],
    },
    {
      id: 'group_time_expenses',
      type: 'group',
      label: 'Time and Expenses',
      icon: 'clock',
      expanded: true,
      // My Expenses and Expenses to Approve are the expense module's, which
      // contributes them after these (hotcrm#2556): an app's own navigation
      // may not name another package's object (ADR-0130 R3).
      children: [
        { id: 'nav_my_week', type: 'object', objectName: 'crm_time_entry', viewName: 'my_week_time', label: 'My Week', icon: 'calendar-days' },
        { id: 'nav_my_week_timesheets', type: 'object', objectName: 'crm_timesheet', viewName: 'my_week_timesheets', label: 'Submit This Week', icon: 'send' },
        { id: 'nav_my_timesheets', type: 'object', objectName: 'crm_timesheet', viewName: 'my_timesheets', label: 'My Timesheets', icon: 'clock' },
        { id: 'nav_timesheets_to_approve', type: 'object', objectName: 'crm_timesheet', viewName: 'timesheets_to_approve', label: 'Timesheets to Approve', icon: 'clipboard-check' },
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

    {
      id: 'group_help',
      type: 'group',
      label: 'Help',
      icon: 'circle-help',
      expanded: false,
      children: [
        { id: 'nav_help_psa', type: 'doc', book: 'crm_psa_manual', label: 'Project Delivery Manual', icon: 'briefcase' },
      ],
    },
  ],
});

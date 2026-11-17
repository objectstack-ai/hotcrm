// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import { App } from '@objectstack/spec/ui';
import { HOTCRM_ICON } from '../../sales/apps/crm.app';

/**
 * the Expenses app (「费用报销」, REQ-0011, hotcrm#2556) — where every employee
 * records what they spent and sends it to be paid back on a report, their
 * manager approves the report, and finance marks it paid (hotcrm#2559), declared by the
 * expense module as the Order to Cash and Project Delivery apps are declared
 * by theirs (an app package may declare one app only, ADR-0019 D3). The
 * maintainer ruled reimbursement its own package on 2026-11-16 (the adopted
 * option 「单独的报销包」). Disabling the module takes the whole app off the
 * launcher.
 *
 * Who sees it: every internal member. No permission set hides it, so the
 * launcher offers it to every set that holds an expense grant (all of them,
 * `src/sales/profiles/_expense-grants.ts`); the guest portal set grants
 * nothing here.
 *
 * Reports to Pay is finance's list, shown to the Finance Controller and AR
 * Accountant positions only.
 *
 * Project staff also find My Expenses and Reports to Approve inside the
 * Project Delivery app, contributed by this module (`../index.ts`).
 */
export const ExpenseApp = App.create({
  name: 'crm_expenses',
  label: 'Expenses',
  description: 'What you spent for the company, the reports that pay it back, and the reports waiting for your approval',
  icon: 'receipt',
  defaultAgent: 'ask',
  branding: {
    primaryColor: '#7C3AED',
    logo: HOTCRM_ICON,
    favicon: HOTCRM_ICON,
  },

  navigation: [
    {
      id: 'group_expenses',
      type: 'group',
      label: 'Expenses',
      icon: 'receipt',
      expanded: true,
      children: [
        { id: 'nav_my_expenses', type: 'object', objectName: 'crm_expense', viewName: 'my_expenses', label: 'My Expenses', icon: 'receipt' },
        { id: 'nav_my_expense_reports', type: 'object', objectName: 'crm_expense_report', viewName: 'my_expense_reports', label: 'My Reports', icon: 'wallet' },
        { id: 'nav_expense_reports_to_approve', type: 'object', objectName: 'crm_expense_report', viewName: 'expense_reports_to_approve', label: 'Reports to Approve', icon: 'clipboard-check' },
        {
          id: 'nav_expense_reports_to_pay',
          type: 'object',
          objectName: 'crm_expense_report',
          viewName: 'expense_reports_to_pay',
          label: 'Reports to Pay',
          icon: 'banknote',
          // Finance's list: the people who mark a report paid.
          visible: P`current_user.can("crm_expense_report", "read") && ("crm_finance_controller" in current_user.positions || "crm_ar_accountant" in current_user.positions)`,
        },
        { id: 'nav_all_expenses', type: 'object', objectName: 'crm_expense', label: 'All Expenses', icon: 'list' },
      ],
    },

    {
      id: 'group_work',
      type: 'group',
      label: 'My Work',
      icon: 'list-checks',
      expanded: true,
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
        { id: 'nav_help_expense', type: 'doc', book: 'crm_expense_manual', label: 'Expenses Manual', icon: 'receipt' },
      ],
    },
  ],
});

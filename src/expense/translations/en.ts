// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * English (en) — the expense module's own translations (hotcrm#2556): every
 * row whose target this package registers. The object's rows moved here from
 * Project Delivery with the object; the Project field's label stays in that
 * module's pack, which contributes the field. Why per package: `./index.ts`.
 */
export const en: TranslationData = {
  objects: {
    crm_expense: {
      label: 'Expense',
      pluralLabel: 'Expenses',
      description: 'A cost a person spent for the company, with its receipt',
      fields: {
        owner_id: { label: 'Spent By' },
        name: { label: 'Description' },
        expense_date: { label: 'Date' },
        category: {
          label: 'Category',
          options: {
            travel: 'Travel',
            lodging: 'Lodging',
            meals: 'Meals',
            equipment: 'Equipment',
            other: 'Other',
          },
        },
        amount: { label: 'Amount' },
        paid_by: {
          label: 'Paid By',
          help: 'The employee, who is paid back, or the company.',
          options: {
            employee: 'Employee',
            company: 'Company',
          },
        },
        merchant: { label: 'Merchant' },
        receipt_number: { label: 'Receipt Number' },
        source: {
          label: 'Source',
          help: 'Typed by a person, written by an agent, or imported.',
          options: {
            manual: 'Manual',
            agent: 'Agent',
            import: 'Import',
          },
        },
        is_billable: {
          label: 'Billable',
          help: 'Whether this expense is passed on to the customer.',
        },
        status: {
          label: 'Status',
          options: {
            draft: 'Draft',
            submitted: 'Submitted',
            approved: 'Approved',
            rejected: 'Rejected',
          },
        },
        approver: { label: 'Approver' },
        notes: { label: 'Notes' },
      },
      _views: {
        all_expenses: { label: 'All Expenses' },
        my_expenses: { label: 'My Expenses' },
        expenses_to_approve: { label: 'Expenses to Approve' },
      },
      _sections: {
        basic: { label: 'Expense' },
      },
      _validations: {
        expense_status_progression: { message: 'This status change is not allowed. An expense moves Draft → Submitted → Approved or Rejected; a rejected expense goes back to Draft to be corrected.' },
      },
    },
  },
  // Step names the approval request shows the submitter and the approvers.
  flows: {
    expense_approval: {
      label: 'Expense Approval',
      approvals: {
        approver_review: { label: 'Manager Review' },
        finance_review: { label: 'Finance Controller Review' },
      },
    },
    expense_approval_on_create: {
      label: 'Expense Approval (on create)',
      approvals: {
        approver_review: { label: 'Manager Review' },
        finance_review: { label: 'Finance Controller Review' },
      },
    },
  },
  apps: {
    crm_expenses: {
      label: 'Expenses',
      description: 'What you spent for the company, with its receipts, and the expenses waiting for your approval',
      navigation: {
        group_expenses: { label: 'Expenses' },
        nav_my_expenses: { label: 'My Expenses' },
        nav_expenses_to_approve: { label: 'Expenses to Approve' },
        nav_all_expenses: { label: 'All Expenses' },
        group_work: { label: 'My Work' },
        nav_approval_requests: { label: 'Inbox' },
        group_help: { label: 'Help' },
        nav_help_expense: { label: 'Expenses Manual' },
      },
    },
    // My Expenses and Expenses to Approve, contributed into the Project Delivery app.
    crm_psa: {
      navigation: {
        nav_my_expenses: { label: 'My Expenses' },
        nav_expenses_to_approve: { label: 'Expenses to Approve' },
      },
    },
  },
  books: {
    crm_expense_manual: {
      label: 'HotCRM Expenses Manual',
      description: 'Recording an expense with its receipt, who approves it, and what reaches a project.',
      groups: { expense: { label: 'Expenses' } },
    },
  },
};

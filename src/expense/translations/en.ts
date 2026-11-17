// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * English (en) — the expense module's own translations (hotcrm#2556, hotcrm#2559): every
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
        crm_expense_report: { label: 'Expense Report' },
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
        my_expenses: {
          label: 'My Expenses',
          bulkActions: {
            delete: { label: 'Delete', confirmLabel: 'Delete', confirmText: 'Permanently delete {{count}} expense(s)? This cannot be undone.' },
          },
        },
      },
      _sections: {
        basic: { label: 'Expense' },
      },
      _validations: {
        expense_status_progression: { message: 'This status change is not allowed. An expense follows its report: Draft → Submitted → Approved or Rejected, and back to Draft when the report is recalled or corrected.' },
      },
      _actions: {
        submit_for_reimbursement: { label: 'Submit for Reimbursement', successMessage: 'Submitted for reimbursement. Follow it in My Reports.' },
      },
    },
    crm_expense_report: {
      label: 'Expense Report',
      pluralLabel: 'Expense Reports',
      description: 'Expenses sent together to be approved and paid back',
      fields: {
        owner_id: { label: 'Submitted By' },
        report_number: { label: 'Report Number' },
        name: { label: 'Title' },
        crm_account: { label: 'Account', help: 'The customer the spend was for, when there is one.' },
        total_amount: { label: 'Total' },
        reimbursable_amount: { label: 'To Pay Back', help: 'The expenses the employee paid themselves.' },
        status: {
          label: 'Status',
          options: {
            draft: 'Draft',
            submitted: 'Submitted',
            approved: 'Approved',
            paid: 'Paid',
            rejected: 'Rejected',
          },
        },
        approver: { label: 'Approver' },
        submitted_date: { label: 'Submitted On' },
        approved_date: { label: 'Approved On' },
        description: { label: 'Remarks' },
        review_notes: { label: 'Review Notes', help: 'What a check found, for the approver to read.' },
        payment_date: { label: 'Paid On' },
        payment_reference: { label: 'Payment Reference' },
      },
      _views: {
        all_expense_reports: { label: 'All Expense Reports' },
        my_expense_reports: { label: 'My Reports' },
        expense_reports_to_approve: { label: 'Reports to Approve' },
        expense_reports_to_pay: { label: 'Reports to Pay' },
      },
      _sections: {
        basic: { label: 'Expense Report' },
        payment: { label: 'Payment' },
      },
      _validations: {
        expense_report_status_progression: { message: 'This status change is not allowed. A report moves Draft → Submitted → Approved → Paid; a submitted report can be recalled to Draft, and a rejected one goes back to Draft to be corrected.' },
      },
      _actions: {
        submit_expense_report: { label: 'Submit', successMessage: 'Expense report {{ record.name }} submitted for approval.' },
        reopen_expense_report: { label: 'Back to Draft', successMessage: 'Expense report {{ record.name }} is back in Draft.' },
        mark_expense_report_paid: {
          label: 'Mark as Paid',
          successMessage: 'Expense report {{ record.name }} marked as paid.',
          params: {
            payment_date: { label: 'Paid On' },
            payment_reference: { label: 'Payment Reference' },
          },
        },
      },
    },
  },
  // Step names the approval request shows the submitter and the approvers.
  flows: {
    expense_report_approval: {
      label: 'Expense Report Approval',
      approvals: {
        approver_review: { label: 'Manager Review' },
        finance_review: { label: 'Finance Controller Review' },
      },
    },
    expense_report_project_approval: {
      label: 'Project Expense Report Approval',
      approvals: {
        approver_review: { label: 'Project Manager Review' },
        finance_review: { label: 'Finance Controller Review' },
      },
    },
  },
  apps: {
    crm_expenses: {
      label: 'Expenses',
      description: 'What you spent for the company, the reports that pay it back, and the reports waiting for your approval',
      navigation: {
        group_expenses: { label: 'Expenses' },
        nav_my_expenses: { label: 'My Expenses' },
        nav_my_expense_reports: { label: 'My Reports' },
        nav_expense_reports_to_approve: { label: 'Reports to Approve' },
        nav_expense_reports_to_pay: { label: 'Reports to Pay' },
        nav_all_expenses: { label: 'All Expenses' },
        group_work: { label: 'My Work' },
        nav_approval_requests: { label: 'Inbox' },
        group_help: { label: 'Help' },
        nav_help_expense: { label: 'Expenses Manual' },
      },
    },
    // My Expenses and Reports to Approve, contributed into the Project Delivery app.
    crm_psa: {
      navigation: {
        nav_my_expenses: { label: 'My Expenses' },
        nav_expense_reports_to_approve: { label: 'Reports to Approve' },
      },
    },
  },
  books: {
    crm_expense_manual: {
      label: 'HotCRM Expenses Manual',
      description: 'Recording an expense with its receipt, sending it on a report, who approves it, its payment back, and what reaches a project.',
      groups: { expense: { label: 'Expenses' } },
    },
  },
};

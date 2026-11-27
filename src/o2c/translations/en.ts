// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * English (en) — the Order to Cash module's own translations: every row whose
 * target this package registers. Why they live here and not in the app
 * package's pack: `./index.ts`.
 */
export const en: TranslationData = {
  objects: {
    crm_billing_milestone: {
      label: 'Payment Plan',
      pluralLabel: 'Payment Plans',
      description: 'One step of an account\'s collection plan, planned from an order or a contract: what is due, when, and how much of it is received',
      _validations: {
        billing_milestone_source: { message: 'Choose the order or the contract this step belongs to.' },
      },
      fields: {
        name: {
          label: 'Milestone',
          help: 'What the step is, as the contract says it: "Advance 30%", "Go-live", "Year 2".',
        },
        crm_sales_order: {
          label: 'Order',
        },
        crm_contract: {
          label: 'Contract',
        },
        crm_account: {
          label: 'Account',
        },
        planned_amount: {
          label: 'Planned Amount',
        },
        planned_date: {
          label: 'Planned Date',
        },
        accepted_date: {
          label: 'Accepted Date',
          help: 'For a step paid on acceptance: the day the customer signed it off.',
        },
        received_amount: {
          label: 'Received',
        },
        open_amount: {
          label: 'Open',
        },
        description: {
          label: 'Notes',
        },
      },
      _views: {
        all_billing_milestones: {
          label: 'All Payment Plans',
        },
        planned_this_month: {
          label: 'Planned This Month',
        },
        overdue_billing_milestones: {
          label: 'Overdue Payment Plans',
        },
      },
      _sections: {
        basic: {
          label: 'Payment Plan',
        },
        plan: {
          label: 'Plan',
        },
        figures: {
          label: 'Collection',
        },
      },
    },
    crm_invoice: {
      label: 'Invoice',
      pluralLabel: 'Invoices',
      description: 'An invoice finance issued to an account, against its order or contract',
      fields: {
        invoice_number: {
          label: 'Invoice Number',
          help: 'The number on the invoice, as finance issued it.',
        },
        crm_sales_order: {
          label: 'Order',
        },
        crm_contract: {
          label: 'Contract',
        },
        crm_billing_milestone: {
          label: 'Payment Plan',
        },
        crm_account: {
          label: 'Account',
        },
        issue_date: {
          label: 'Issue Date',
        },
        due_date: {
          label: 'Due Date',
          help: 'Left empty, it is the issue date plus the payment terms of the contract, or else of the order. With neither, type it.',
        },
        status: {
          label: 'Status',
          options: {
            issued: 'Issued',
            cancelled: 'Cancelled',
          },
        },
        amount: {
          label: 'Amount',
          help: 'As issued, tax included.',
        },
        paid_amount: {
          label: 'Paid',
        },
        open_amount: {
          label: 'Open',
        },
        overpaid_amount: {
          label: 'Overpaid',
          help: 'What was paid above the amount. The invoice counts as fully paid; the excess is not set against other invoices.',
        },
        invoice_file: {
          label: 'Invoice File',
        },
        source: {
          label: 'Source',
          help: 'Import covers a spreadsheet, an accounting package\'s export and an ERP writing through the same key.',
          options: {
            manual: 'Manual entry',
            import: 'Import',
          },
        },
        erp_ref: {
          label: 'ERP Reference',
          help: 'The invoice\'s key in finance\'s own system. Importing a row with the same reference updates this invoice.',
        },
        synced_at: {
          label: 'Synced At',
        },
      },
      _views: {
        all_invoices: {
          label: 'All Invoices',
        },
      },
      _sections: {
        basic: {
          label: 'Invoice',
        },
        source: {
          label: 'Source',
        },
      },
    },
    crm_payment: {
      label: 'Payment',
      pluralLabel: 'Payments',
      description: 'Money an account paid: against a payment plan, an order, a contract, or none of them yet',
      fields: {
        payment_number: {
          label: 'Payment Number',
        },
        crm_sales_order: {
          label: 'Order',
        },
        crm_contract: {
          label: 'Contract',
        },
        crm_invoice: {
          label: 'Invoice',
        },
        crm_billing_milestone: {
          label: 'Payment Plan',
        },
        crm_account: {
          label: 'Account',
        },
        payment_date: {
          label: 'Payment Date',
        },
        amount: {
          label: 'Amount',
        },
        method: {
          label: 'Method',
          options: {
            bank_transfer: 'Bank Transfer',
            other: 'Other',
          },
        },
        source: {
          label: 'Source',
          options: {
            manual: 'Manual entry',
            import: 'Import',
          },
        },
        erp_ref: {
          label: 'ERP Reference',
          help: 'The receipt\'s key in finance\'s own system. Importing a row with the same reference updates this payment.',
        },
        synced_at: {
          label: 'Synced At',
        },
      },
      _views: {
        all_payments: {
          label: 'All Payments',
        },
      },
      _sections: {
        basic: {
          label: 'Payment',
        },
        source: {
          label: 'Source',
        },
      },
    },
    // The order's figures, added by this package through `objectExtensions`
    // (hotcrm#2560).
    crm_sales_order: {
      // The rules this package adds to the order (hotcrm#2827).
      _validations: {
        reconfirm_total_below_received: { message: "This order's Total Price is below what was already received (Received). Deal with the overpayment or the invoices first, then confirm." },
        reconfirm_total_below_invoiced: { message: "This order's Total Price is below what was already invoiced (Invoiced). Cancel or correct the invoices first, then confirm." },
      },
      fields: {
        planned_amount: {
          label: 'Planned',
          help: 'The collection plan, summed: what the steps expect to collect.',
        },
        invoiced_amount: {
          label: 'Invoiced',
          help: 'The issued invoices, summed. A cancelled invoice is not counted.',
        },
        received_amount: {
          label: 'Received',
          help: 'The payments received, summed.',
        },
        unpaid_amount: {
          label: 'Unpaid',
          help: 'The amount less what was received, never below 0.',
        },
        uninvoiced_amount: {
          label: 'Uninvoiced',
          help: 'The amount less what was invoiced (issued invoices), never below 0.',
        },
        plan_differs: {
          label: 'Payment Plan Differs',
          help: 'The payment plan\'s total is not the order\'s Total Price. Edit, split or add plan steps so the plan adds up to the order.',
        },
      },
    },
    // The contract's and the account's receivables figures, added by this
    // package through `objectExtensions` (#2416).
    crm_contract: {
      fields: {
        planned_amount: {
          label: 'Planned',
          help: 'The collection plan, summed: what the steps expect to collect.',
        },
        invoiced_amount: {
          label: 'Invoiced',
          help: 'The issued invoices, summed. A cancelled invoice is not counted.',
        },
        received_amount: {
          label: 'Received',
          help: 'The payments received, summed.',
        },
        unpaid_amount: {
          label: 'Unpaid',
          help: 'The Order Amount when the contract has orders, else the Contract Value, less what was received, never below 0.',
        },
        uninvoiced_amount: {
          label: 'Uninvoiced',
          help: 'The Order Amount when the contract has orders, else the Contract Value, less what was invoiced (issued invoices), never below 0.',
        },
        order_count: {
          label: 'Orders',
        },
      },
    },
    crm_account: {
      fields: {
        invoiced_amount: {
          label: 'Invoiced',
          help: 'The issued invoices, summed. A cancelled invoice is not counted.',
        },
        received_amount: {
          label: 'Received',
          help: 'The payments received, summed.',
        },
        unpaid_amount: {
          label: 'Unpaid',
          help: 'What the account\'s confirmed and completed orders, and its signed contracts with no order, still have to receive: each one\'s amount less what it received, never below 0, summed.',
        },
        uninvoiced_amount: {
          label: 'Uninvoiced',
          help: 'What the account\'s confirmed and completed orders, and its signed contracts with no order, still have to invoice: each one\'s amount less its issued invoices, never below 0, summed.',
        },
        unpaid_on_orders: {
          label: 'Unpaid on Orders',
        },
        unpaid_on_contracts: {
          label: 'Unpaid on Contracts',
        },
        uninvoiced_on_orders: {
          label: 'Uninvoiced on Orders',
        },
        uninvoiced_on_contracts: {
          label: 'Uninvoiced on Contracts',
        },
      },
    },
  },
  apps: {
    // The ids this package contributes into the Sales app: the collection
    // plan the reps write, and the manual (#2465).
    crm_enterprise: {
      navigation: {
        nav_billing_milestones: {
          label: 'Payment Plans',
        },
        nav_help_o2c: {
          label: 'Order to Cash Manual',
        },
      },
    },
    // This package's own app, finance's (#2465).
    crm_o2c: {
      label: 'Order to Cash',
      description: 'Invoices, payments and the collection plan, with the contracts and accounts they belong to',
      navigation: {
        group_receivables: { label: 'Receivables' },
        group_follow_up: { label: 'Follow-up' },
        group_customers: { label: 'Orders, Contracts and Accounts' },
        group_work: { label: 'My Work' },
        group_help: { label: 'Help' },
        nav_invoices: { label: 'Invoices' },
        nav_payments: { label: 'Payments' },
        nav_billing_milestones: { label: 'Payment Plans' },
        nav_overdue_billing_milestones: { label: 'Overdue Payment Plans' },
        nav_planned_this_month: { label: 'Planned This Month' },
        nav_approval_requests: { label: 'Inbox' },
        nav_help_o2c: { label: 'Order to Cash Manual' },
      },
    },
  },
  books: {
    crm_o2c_manual: {
      label: 'HotCRM Order to Cash Manual',
      description: 'The collection plan, invoices and payments: what each figure counts, and who writes it.',
      groups: {
        o2c: {
          label: 'Order to Cash',
        },
      },
    },
  },
};

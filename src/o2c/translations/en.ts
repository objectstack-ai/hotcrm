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
      label: 'Billing Milestone',
      pluralLabel: 'Billing Milestones',
      description: 'One step of a contract\'s collection plan: what is due, when, and how much of it is invoiced and received',
      fields: {
        name: {
          label: 'Milestone',
          help: 'What the step is, as the contract says it: "Advance 30%", "Go-live", "Year 2".',
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
        invoiced_amount: {
          label: 'Invoiced',
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
          label: 'All Billing Milestones',
        },
        planned_this_month: {
          label: 'Planned This Month',
        },
      },
      _sections: {
        basic: {
          label: 'Milestone',
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
      description: 'An invoice finance issued against a contract, and how much of it is paid',
      fields: {
        invoice_number: {
          label: 'Invoice Number',
          help: 'The number on the invoice, as finance issued it.',
        },
        crm_contract: {
          label: 'Contract',
        },
        crm_billing_milestone: {
          label: 'Billing Milestone',
        },
        crm_account: {
          label: 'Account',
        },
        issue_date: {
          label: 'Issue Date',
        },
        due_date: {
          label: 'Due Date',
          help: 'Left empty, it is the issue date plus the contract\'s payment terms.',
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
        overdue_invoices: {
          label: 'Overdue Invoices',
        },
      },
      _sections: {
        basic: {
          label: 'Invoice',
        },
        amounts: {
          label: 'Amounts',
        },
        source: {
          label: 'Source',
        },
      },
    },
    crm_payment: {
      label: 'Payment',
      pluralLabel: 'Payments',
      description: 'Money received against a contract, an invoice or a plan step',
      fields: {
        payment_number: {
          label: 'Payment Number',
        },
        crm_contract: {
          label: 'Contract',
        },
        crm_invoice: {
          label: 'Invoice',
        },
        crm_billing_milestone: {
          label: 'Billing Milestone',
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
  },
  apps: {
    crm_enterprise: {
      navigation: {
        nav_billing_milestones: {
          label: 'Billing Milestones',
        },
        nav_invoices: {
          label: 'Invoices',
        },
        nav_payments: {
          label: 'Payments',
        },
        nav_help_o2c: {
          label: 'Order to Cash Manual',
        },
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

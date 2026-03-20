import type { TranslationData } from '@objectstack/spec/system';

/**
 * English (en) — Finance Cloud Translations
 *
 * Per-locale file: one file per language, following the `per_locale` convention.
 * Each file exports a single `TranslationData` object for its locale.
 *
 * Covers all 9 Finance objects with field labels, select options, and help texts.
 */
export const en: TranslationData = {
  objects: {
    contract: {
      label: 'Contract',
      pluralLabel: 'Contracts',
      fields: {
        contract_number: { label: 'Contract Number' },
        account: { label: 'Account' },
        opportunity: { label: 'Opportunity' },
        status: {
          label: 'Status',
          options: {
            Draft: 'Draft', 'In Approval': 'In Approval', Activated: 'Activated',
            'On Hold': 'On Hold', Completed: 'Completed', Terminated: 'Terminated',
          },
        },
        start_date: { label: 'Start Date' },
        end_date: { label: 'End Date' },
        contract_term: { label: 'Contract Term (Months)', help: 'Duration of the contract in months' },
        contract_value: { label: 'Contract Value' },
      },
    },

    invoice: {
      label: 'Invoice',
      pluralLabel: 'Invoices',
      fields: {
        invoice_number: { label: 'Invoice Number' },
        account: { label: 'Account' },
        contract: { label: 'Contract' },
        status: {
          label: 'Status',
          options: { Draft: 'Draft', Posted: 'Posted', Paid: 'Paid', Void: 'Void' },
        },
        total_amount: { label: 'Total Amount' },
        due_date: { label: 'Due Date' },
        payment_terms: {
          label: 'Payment Terms',
          options: {
            'Due on Receipt': 'Due on Receipt', 'Net 15': 'Net 15',
            'Net 30': 'Net 30', 'Net 60': 'Net 60',
          },
        },
        line_item_count: { label: 'Line Item Count', help: 'Number of line items on this invoice' },
        calculated_subtotal: { label: 'Calculated Subtotal' },
      },
    },

    invoice_line: {
      label: 'Invoice Line',
      pluralLabel: 'Invoice Lines',
      fields: {
        invoice: { label: 'Invoice' },
        product: { label: 'Product' },
        description: { label: 'Description' },
        quantity: { label: 'Quantity' },
        unit_price: { label: 'Unit Price' },
        amount: { label: 'Amount' },
      },
    },

    payment: {
      label: 'Payment',
      pluralLabel: 'Payments',
      fields: {
        payment_number: { label: 'Payment Number' },
        name: { label: 'Payment Name' },
        type: {
          label: 'Type',
          options: {
            'Down Payment': 'Down Payment', 'Milestone Payment': 'Milestone Payment',
            'Delivery Payment': 'Delivery Payment', 'Acceptance Payment': 'Acceptance Payment',
            'Final Payment': 'Final Payment', 'Recurring Payment': 'Recurring Payment',
            'Maintenance Fee': 'Maintenance Fee', Other: 'Other',
          },
        },
        status: {
          label: 'Status',
          options: {
            Planned: 'Planned', Invoiced: 'Invoiced', Received: 'Received',
            Overdue: 'Overdue', 'Written Off': 'Written Off', Cancelled: 'Cancelled',
          },
        },
        account: { label: 'Account' },
        opportunity: { label: 'Related Opportunity' },
        contract: { label: 'Related Contract' },
        quote: { label: 'Related Quote' },
        planned_amount: { label: 'Planned Amount' },
        received_amount: { label: 'Received Amount' },
        planned_date: { label: 'Planned Date' },
        actual_date: { label: 'Actual Date' },
        payment_method: {
          label: 'Payment Method',
          options: {
            'Bank Transfer': 'Bank Transfer', Check: 'Check', Cash: 'Cash',
            'Credit Card': 'Credit Card', Alipay: 'Alipay',
            'WeChat Pay': 'WeChat Pay', Other: 'Other',
          },
        },
        invoice_number: { label: 'Invoice Number' },
      },
    },

    credit_note: {
      label: 'Credit Note',
      pluralLabel: 'Credit Notes',
      fields: {
        credit_note_number: { label: 'Credit Note Number' },
        invoice_id: { label: 'Original Invoice' },
        account_id: { label: 'Account' },
        status: {
          label: 'Status',
          options: { Draft: 'Draft', Issued: 'Issued', Applied: 'Applied', Void: 'Void' },
        },
        credit_date: { label: 'Credit Date' },
        amount: { label: 'Credit Amount' },
        tax_amount: { label: 'Tax Amount' },
        total_amount: { label: 'Total Amount' },
        reason: {
          label: 'Reason',
          options: {
            'Billing Error': 'Billing Error', 'Product Return': 'Product Return',
            'Service Issue': 'Service Issue', 'Price Adjustment': 'Price Adjustment',
            'Duplicate Payment': 'Duplicate Payment', 'Contract Cancellation': 'Contract Cancellation',
            Other: 'Other',
          },
        },
        notes: { label: 'Notes' },
        applied_to_invoice_id: { label: 'Applied To Invoice' },
        remaining_balance: { label: 'Remaining Balance' },
        approved_by_id: { label: 'Approved By' },
        approved_date: { label: 'Approved Date' },
      },
    },

    billing_schedule: {
      label: 'Billing Schedule',
      pluralLabel: 'Billing Schedules',
      fields: {
        name: { label: 'Schedule Name' },
        contract_id: { label: 'Contract' },
        account_id: { label: 'Account' },
        status: {
          label: 'Status',
          options: {
            Draft: 'Draft', Active: 'Active', Paused: 'Paused',
            Completed: 'Completed', Cancelled: 'Cancelled',
          },
        },
        frequency: {
          label: 'Billing Frequency',
          options: {
            Weekly: 'Weekly', Monthly: 'Monthly', Quarterly: 'Quarterly',
            'Semi-Annually': 'Semi-Annually', Annually: 'Annually', Custom: 'Custom',
          },
        },
        billing_day: { label: 'Billing Day', help: 'Day of the month to generate invoices' },
        start_date: { label: 'Start Date' },
        end_date: { label: 'End Date' },
        next_billing_date: { label: 'Next Billing Date' },
        amount: { label: 'Billing Amount' },
        tax_rate: { label: 'Tax Rate' },
        total_billed: { label: 'Total Billed' },
        total_remaining: { label: 'Total Remaining' },
        invoices_generated: { label: 'Invoices Generated', help: 'Total number of invoices created by this schedule' },
        auto_generate_invoice: { label: 'Auto-Generate Invoices' },
        payment_terms: {
          label: 'Payment Terms',
          options: {
            'Due on Receipt': 'Due on Receipt', 'Net 15': 'Net 15',
            'Net 30': 'Net 30', 'Net 45': 'Net 45',
            'Net 60': 'Net 60', 'Net 90': 'Net 90',
          },
        },
        last_invoice_date: { label: 'Last Invoice Date' },
        owner_id: { label: 'Owner' },
      },
    },

    revenue_schedule: {
      label: 'Revenue Schedule',
      pluralLabel: 'Revenue Schedules',
      fields: {
        name: { label: 'Schedule Name' },
        contract_id: { label: 'Contract' },
        invoice_id: { label: 'Invoice' },
        recognition_rule_id: { label: 'Recognition Rule' },
        status: {
          label: 'Status',
          options: {
            Draft: 'Draft', Active: 'Active', Completed: 'Completed',
            Suspended: 'Suspended', Cancelled: 'Cancelled',
          },
        },
        total_amount: { label: 'Total Amount' },
        recognized_amount: { label: 'Recognized Amount' },
        deferred_amount: { label: 'Deferred Amount' },
        recognition_start_date: { label: 'Recognition Start' },
        recognition_end_date: { label: 'Recognition End' },
        recognition_method: {
          label: 'Recognition Method',
          options: {
            'Straight Line': 'Straight Line', Milestone: 'Milestone',
            'Percentage of Completion': 'Percentage of Completion',
            'Point in Time': 'Point in Time', 'As Invoiced': 'As Invoiced',
          },
        },
        frequency: {
          label: 'Recognition Frequency',
          options: { Monthly: 'Monthly', Quarterly: 'Quarterly', Annually: 'Annually' },
        },
        periods_total: { label: 'Total Periods' },
        periods_recognized: { label: 'Periods Recognized' },
        amount_per_period: { label: 'Amount Per Period' },
        next_recognition_date: { label: 'Next Recognition Date' },
        last_recognition_date: { label: 'Last Recognition Date' },
        currency_code: { label: 'Currency' },
        notes: { label: 'Notes' },
        owner_id: { label: 'Owner' },
      },
    },

    revenue_recognition_rule: {
      label: 'Revenue Recognition Rule',
      pluralLabel: 'Revenue Recognition Rules',
      fields: {
        name: { label: 'Rule Name' },
        description: { label: 'Description' },
        rule_type: {
          label: 'Rule Type',
          options: {
            'Product-Based': 'Product-Based', 'Service-Based': 'Service-Based',
            Subscription: 'Subscription', License: 'License',
            Milestone: 'Milestone', Custom: 'Custom',
          },
        },
        recognition_method: {
          label: 'Default Method',
          options: {
            'Straight Line': 'Straight Line', Milestone: 'Milestone',
            'Percentage of Completion': 'Percentage of Completion',
            'Point in Time': 'Point in Time', 'As Invoiced': 'As Invoiced',
          },
        },
        applicable_products: { label: 'Applicable Products' },
        performance_obligation: { label: 'Performance Obligation' },
        recognition_trigger: {
          label: 'Recognition Trigger',
          options: {
            'Contract Start': 'Contract Start', 'Service Delivery': 'Service Delivery',
            'Customer Acceptance': 'Customer Acceptance', 'Milestone Completion': 'Milestone Completion',
            'Invoice Date': 'Invoice Date',
          },
        },
        is_active: { label: 'Active' },
        effective_date: { label: 'Effective Date' },
        expiration_date: { label: 'Expiration Date' },
        compliance_standard: {
          label: 'Compliance Standard',
          options: { 'ASC 606': 'ASC 606', 'IFRS 15': 'IFRS 15', Both: 'Both' },
        },
        auto_create_schedule: { label: 'Auto-Create Schedule' },
        priority: { label: 'Priority', help: 'Lower number = higher priority' },
        owner_id: { label: 'Owner' },
      },
    },

    payment_method: {
      label: 'Payment Method',
      pluralLabel: 'Payment Methods',
      fields: {
        account_id: { label: 'Account' },
        type: {
          label: 'Payment Type',
          options: {
            'Credit Card': 'Credit Card', 'Bank Transfer (ACH)': 'Bank Transfer (ACH)',
            'Wire Transfer': 'Wire Transfer', Check: 'Check',
            PayPal: 'PayPal', 'Direct Debit': 'Direct Debit',
          },
        },
        status: {
          label: 'Status',
          options: {
            Active: 'Active', Expired: 'Expired',
            Inactive: 'Inactive', 'Verification Pending': 'Verification Pending',
          },
        },
        is_default: { label: 'Default Payment Method' },
        card_last_four: { label: 'Card Last 4 Digits' },
        card_brand: {
          label: 'Card Brand',
          options: { Visa: 'Visa', Mastercard: 'Mastercard', Amex: 'Amex', Discover: 'Discover' },
        },
        expiration_month: { label: 'Expiration Month' },
        expiration_year: { label: 'Expiration Year' },
        bank_name: { label: 'Bank Name' },
        bank_account_last_four: { label: 'Account Last 4' },
        billing_address: { label: 'Billing Address' },
        nickname: { label: 'Nickname' },
        payment_gateway: { label: 'Payment Gateway' },
        gateway_token: { label: 'Gateway Token' },
        last_used_date: { label: 'Last Used' },
        verified: { label: 'Verified' },
        owner_id: { label: 'Owner' },
      },
    },
  },

  apps: {
    finance: {
      label: 'Finance',
      description: 'Revenue cloud for contracts, invoices, payments, and revenue recognition',
    },
  },

  messages: {
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.back': 'Back',
    'common.confirm': 'Confirm',
    'common.refresh': 'Refresh',
    'nav.finance': 'Finance',
    'nav.revenue_recognition': 'Revenue Recognition',
    'nav.views_dashboards': 'Views & Dashboards',
    'nav.finance_dashboard': 'Finance Dashboard',
    'success.saved': 'Record saved successfully',
    'success.deleted': 'Record deleted successfully',
    'success.invoice_posted': 'Invoice posted successfully',
    'success.payment_received': 'Payment recorded successfully',
    'success.contract_activated': 'Contract activated successfully',
    'success.credit_note_issued': 'Credit note issued successfully',
    'success.revenue_recognized': 'Revenue recognized successfully',
    'confirm.delete': 'Are you sure you want to delete this record?',
    'confirm.post_invoice': 'Post this invoice? This action cannot be undone.',
    'confirm.void_invoice': 'Void this invoice? This will reverse all related entries.',
    'confirm.activate_contract': 'Activate this contract?',
    'error.required': 'This field is required',
    'error.load_failed': 'Failed to load data',
    'error.save_failed': 'Failed to save record',
    'error.payment_failed': 'Payment processing failed',
    'error.invoice_generation_failed': 'Failed to generate invoice',
  },

  validationMessages: {
    contract_dates_invalid: 'Contract end date must be after start date',
    invoice_amount_required: 'Invoice amount must be greater than zero',
    payment_exceeds_invoice: 'Payment amount exceeds invoice total',
    credit_note_exceeds_invoice: 'Credit note amount cannot exceed original invoice total',
    billing_schedule_dates_invalid: 'Billing schedule end date must be after start date',
    revenue_amount_mismatch: 'Recognized amount cannot exceed total amount',
    payment_method_expired: 'This payment method has expired',
    duplicate_invoice_number: 'An invoice with this number already exists',
  },
};

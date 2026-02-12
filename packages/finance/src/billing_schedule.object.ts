import { ObjectSchema, Field } from '@objectstack/spec/data';

export const BillingSchedule = ObjectSchema.create({
  name: 'billing_schedule',
  label: 'Billing Schedule',
  pluralLabel: 'Billing Schedules',
  icon: 'calendar-check',
  description: 'Recurring billing schedules for contracts and subscriptions',

  fields: {
    name: Field.text({
      label: 'Schedule Name',
      required: true,
      maxLength: 255,
      description: 'Name of the billing schedule'
    }),
    contract_id: Field.lookup('contract', {
      label: 'Contract',
      required: true,
      description: 'Associated contract'
    }),
    account_id: Field.lookup('account', {
      label: 'Account',
      required: true,
      description: 'Customer account'
    }),
    status: Field.select({
      label: 'Status',
      required: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Active', value: 'active' },
        { label: 'Paused', value: 'paused' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' }
      ],
      defaultValue: 'draft'
    }),
    frequency: Field.select({
      label: 'Billing Frequency',
      required: true,
      options: [
        { label: 'Weekly', value: 'weekly' },
        { label: 'Monthly', value: 'monthly' },
        { label: 'Quarterly', value: 'quarterly' },
        { label: 'Semi-Annually', value: 'semi_annually' },
        { label: 'Annually', value: 'annually' },
        { label: 'Custom', value: 'custom' }
      ]
    }),
    billing_day: Field.number({
      label: 'Billing Day',
      precision: 0,
      description: 'Day of the month for billing (1-28)'
    }),
    start_date: Field.date({
      label: 'Start Date',
      required: true,
      description: 'First billing date'
    }),
    end_date: Field.date({
      label: 'End Date',
      description: 'Last billing date'
    }),
    next_billing_date: Field.date({
      label: 'Next Billing Date',
      readonly: true,
      description: 'Next scheduled billing date'
    }),
    amount: Field.currency({
      label: 'Billing Amount',
      required: true,
      description: 'Amount per billing cycle'
    }),
    tax_rate: Field.percent({
      label: 'Tax Rate',
      description: 'Applicable tax rate'
    }),
    total_billed: Field.currency({
      label: 'Total Billed',
      readonly: true,
      description: 'Cumulative amount billed to date'
    }),
    total_remaining: Field.currency({
      label: 'Total Remaining',
      readonly: true,
      description: 'Remaining amount to be billed'
    }),
    invoices_generated: Field.number({
      label: 'Invoices Generated',
      readonly: true,
      precision: 0,
      description: 'Count of invoices generated from this schedule'
    }),
    auto_generate_invoice: Field.boolean({
      label: 'Auto-Generate Invoices',
      defaultValue: true,
      description: 'Automatically create invoices on billing date'
    }),
    payment_terms: Field.select({
      label: 'Payment Terms',
      options: [
        { label: 'Due on Receipt', value: 'due_on_receipt' },
        { label: 'Net 15', value: 'net_15' },
        { label: 'Net 30', value: 'net_30' },
        { label: 'Net 45', value: 'net_45' },
        { label: 'Net 60', value: 'net_60' },
        { label: 'Net 90', value: 'net_90' }
      ],
      defaultValue: 'net_30'
    }),
    last_invoice_date: Field.date({
      label: 'Last Invoice Date',
      readonly: true
    }),
    owner_id: Field.lookup('users', {
      label: 'Owner',
      required: true
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    feeds: true,
    files: true
  },
});

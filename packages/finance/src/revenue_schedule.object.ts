import { ObjectSchema, Field } from '@objectstack/spec/data';

export const RevenueSchedule = ObjectSchema.create({
  name: 'revenue_schedule',
  label: 'Revenue Schedule',
  pluralLabel: 'Revenue Schedules',
  icon: 'calendar-alt',
  description: 'Revenue recognition schedules for ASC 606 compliance',

  fields: {
    name: Field.text({ label: 'Schedule Name', required: true, maxLength: 255 }),
    contract_id: Field.lookup('contract', { label: 'Contract', required: true }),
    invoice_id: Field.lookup('invoice', { label: 'Invoice' }),
    recognition_rule_id: Field.lookup('revenue_recognition_rule', { label: 'Recognition Rule', required: true }),
    status: Field.select({
      label: 'Status', required: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Active', value: 'active' },
        { label: 'Completed', value: 'completed' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Cancelled', value: 'cancelled' }
      ],
      defaultValue: 'draft'
    }),
    total_amount: Field.currency({ label: 'Total Amount', required: true, description: 'Total revenue to recognize' }),
    recognized_amount: Field.currency({ label: 'Recognized Amount', readonly: true, description: 'Amount recognized to date' }),
    deferred_amount: Field.currency({ label: 'Deferred Amount', readonly: true, description: 'Remaining amount to recognize' }),
    recognition_start_date: Field.date({ label: 'Recognition Start', required: true }),
    recognition_end_date: Field.date({ label: 'Recognition End', required: true }),
    recognition_method: Field.select({
      label: 'Recognition Method', required: true,
      options: [
        { label: 'Straight Line', value: 'straight_line' },
        { label: 'Milestone', value: 'milestone' },
        { label: 'Percentage of Completion', value: 'percentage_completion' },
        { label: 'Point in Time', value: 'point_in_time' },
        { label: 'As Invoiced', value: 'as_invoiced' }
      ]
    }),
    frequency: Field.select({
      label: 'Recognition Frequency',
      options: [
        { label: 'Monthly', value: 'monthly' },
        { label: 'Quarterly', value: 'quarterly' },
        { label: 'Annually', value: 'annually' }
      ],
      defaultValue: 'monthly'
    }),
    periods_total: Field.number({ label: 'Total Periods', precision: 0 }),
    periods_recognized: Field.number({ label: 'Periods Recognized', readonly: true, precision: 0, defaultValue: 0 }),
    amount_per_period: Field.currency({ label: 'Amount Per Period', readonly: true }),
    next_recognition_date: Field.date({ label: 'Next Recognition Date', readonly: true }),
    last_recognition_date: Field.date({ label: 'Last Recognition Date', readonly: true }),
    currency_code: Field.text({ label: 'Currency', maxLength: 3, defaultValue: 'USD' }),
    notes: Field.textarea({ label: 'Notes', maxLength: 4000 }),
    owner_id: Field.lookup('users', { label: 'Owner', required: true })
  },

  enable: { searchable: true, trackHistory: true, feeds: true, files: true },
});

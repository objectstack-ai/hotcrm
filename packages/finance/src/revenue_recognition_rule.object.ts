import { ObjectSchema, Field } from '@objectstack/spec/data';

export const RevenueRecognitionRule = ObjectSchema.create({
  name: 'revenue_recognition_rule',
  label: 'Revenue Recognition Rule',
  pluralLabel: 'Revenue Recognition Rules',
  icon: 'balance-scale',
  description: 'ASC 606 compliance rules for revenue recognition',

  fields: {
    name: Field.text({ label: 'Rule Name', required: true, maxLength: 255 }),
    description: Field.textarea({ label: 'Description', maxLength: 4000 }),
    rule_type: Field.select({
      label: 'Rule Type', required: true,
      options: [
        { label: 'Product-Based', value: 'product_based' },
        { label: 'Service-Based', value: 'service_based' },
        { label: 'Subscription', value: 'subscription' },
        { label: 'License', value: 'license' },
        { label: 'Milestone', value: 'milestone' },
        { label: 'Custom', value: 'custom' }
      ]
    }),
    recognition_method: Field.select({
      label: 'Default Method', required: true,
      options: [
        { label: 'Straight Line', value: 'straight_line' },
        { label: 'Milestone', value: 'milestone' },
        { label: 'Percentage of Completion', value: 'percentage_completion' },
        { label: 'Point in Time', value: 'point_in_time' },
        { label: 'As Invoiced', value: 'as_invoiced' }
      ]
    }),
    applicable_products: Field.text({ label: 'Applicable Products', maxLength: 1000, description: 'Comma-separated product IDs or categories' }),
    performance_obligation: Field.textarea({ label: 'Performance Obligation', maxLength: 4000, description: 'ASC 606 performance obligation description' }),
    recognition_trigger: Field.select({
      label: 'Recognition Trigger',
      options: [
        { label: 'Contract Start', value: 'contract_start' },
        { label: 'Service Delivery', value: 'service_delivery' },
        { label: 'Customer Acceptance', value: 'customer_acceptance' },
        { label: 'Milestone Completion', value: 'milestone_completion' },
        { label: 'Invoice Date', value: 'invoice_date' }
      ]
    }),
    is_active: Field.boolean({ label: 'Active', defaultValue: true }),
    effective_date: Field.date({ label: 'Effective Date', required: true }),
    expiration_date: Field.date({ label: 'Expiration Date' }),
    compliance_standard: Field.select({
      label: 'Compliance Standard',
      options: [
        { label: 'ASC 606', value: 'asc_606' },
        { label: 'IFRS 15', value: 'ifrs_15' },
        { label: 'Both', value: 'both' }
      ],
      defaultValue: 'asc_606'
    }),
    auto_create_schedule: Field.boolean({ label: 'Auto-Create Schedule', defaultValue: true }),
    priority: Field.number({ label: 'Priority', precision: 0, defaultValue: 100 }),
    owner_id: Field.lookup('users', { label: 'Owner', required: true })
  },

  enable: { searchable: true, trackHistory: true, feeds: true, files: true },
});

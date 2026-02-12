import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Subscription = ObjectSchema.create({
  name: 'subscription',
  label: 'Subscription',
  pluralLabel: 'Subscriptions',
  icon: 'sync-alt',
  description: 'Subscription management with renewal, amendment, and cancellation tracking',

  fields: {
    name: Field.text({ label: 'Subscription Name', required: true, maxLength: 255 }),
    account_id: Field.lookup('account', { label: 'Account', required: true }),
    product_id: Field.lookup('product', { label: 'Product', required: true }),
    contract_id: Field.lookup('contract', { label: 'Contract' }),
    quote_id: Field.lookup('quote', { label: 'Original Quote' }),
    status: Field.select({
      label: 'Status', required: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Active', value: 'active' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Pending Renewal', value: 'pending_renewal' },
        { label: 'Renewed', value: 'renewed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Expired', value: 'expired' }
      ],
      defaultValue: 'draft'
    }),
    subscription_type: Field.select({
      label: 'Subscription Type',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Renewal', value: 'renewal' },
        { label: 'Amendment', value: 'amendment' },
        { label: 'Upgrade', value: 'upgrade' },
        { label: 'Downgrade', value: 'downgrade' }
      ],
      defaultValue: 'new'
    }),
    start_date: Field.date({ label: 'Start Date', required: true }),
    end_date: Field.date({ label: 'End Date', required: true }),
    term_months: Field.number({ label: 'Term (Months)', precision: 0, description: 'Subscription term length' }),
    billing_frequency: Field.select({
      label: 'Billing Frequency',
      options: [
        { label: 'Monthly', value: 'monthly' },
        { label: 'Quarterly', value: 'quarterly' },
        { label: 'Semi-Annually', value: 'semi_annually' },
        { label: 'Annually', value: 'annually' }
      ],
      defaultValue: 'monthly'
    }),
    quantity: Field.number({ label: 'Quantity', precision: 0, defaultValue: 1 }),
    unit_price: Field.currency({ label: 'Unit Price', required: true }),
    mrr: Field.currency({ label: 'Monthly Recurring Revenue', readonly: true }),
    arr: Field.currency({ label: 'Annual Recurring Revenue', readonly: true }),
    total_contract_value: Field.currency({ label: 'Total Contract Value', readonly: true }),
    discount_percent: Field.percent({ label: 'Discount %', defaultValue: 0 }),
    auto_renew: Field.boolean({ label: 'Auto-Renew', defaultValue: true }),
    renewal_term_months: Field.number({ label: 'Renewal Term (Months)', precision: 0 }),
    cancellation_date: Field.date({ label: 'Cancellation Date' }),
    cancellation_reason: Field.select({
      label: 'Cancellation Reason',
      options: [
        { label: 'Too Expensive', value: 'too_expensive' },
        { label: 'Missing Features', value: 'missing_features' },
        { label: 'Competitor Switch', value: 'competitor_switch' },
        { label: 'Not Using', value: 'not_using' },
        { label: 'Company Closure', value: 'company_closure' },
        { label: 'Other', value: 'other' }
      ]
    }),
    renewal_opportunity_id: Field.lookup('opportunity', { label: 'Renewal Opportunity' }),
    previous_subscription_id: Field.lookup('subscription', { label: 'Previous Subscription' }),
    days_until_renewal: Field.number({ label: 'Days Until Renewal', readonly: true, precision: 0 }),
    owner_id: Field.lookup('users', { label: 'Owner', required: true })
  },

  enable: { searchable: true, trackHistory: true, feeds: true, files: true },
});

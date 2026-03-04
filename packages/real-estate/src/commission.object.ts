import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Commission = ObjectSchema.create({
  name: 'commission',
  label: 'Commission',
  icon: 'percent',
  fields: {
    transaction_id: Field.lookup('listing', { label: 'Transaction' }),
    agent_id: Field.lookup('contact', { label: 'Agent', required: true }),
    commission_rate: Field.percent({ label: 'Commission Rate' }),
    commission_amount: Field.currency({ label: 'Commission Amount', required: true }),
    split_type: Field.select({
      label: 'Split Type',
      options: [
        { label: 'Full', value: 'full' },
        { label: 'Co-Listing', value: 'co_listing' },
        { label: 'Referral', value: 'referral' }
      ],
      defaultValue: 'full'
    }),
    payment_status: Field.select({
      label: 'Payment Status',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Paid', value: 'paid' },
        { label: 'Partial', value: 'partial' }
      ],
      defaultValue: 'pending'
    }),
    payment_date: Field.date({ label: 'Payment Date' })
  }
});

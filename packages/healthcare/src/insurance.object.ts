import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Insurance = ObjectSchema.create({
  name: 'insurance',
  label: 'Insurance',
  icon: 'shield',
  fields: {
    provider_name: Field.text({ label: 'Insurance Provider', required: true }),
    plan_type: Field.select({
      label: 'Plan Type',
      options: [
        { label: 'HMO', value: 'hmo' },
        { label: 'PPO', value: 'ppo' },
        { label: 'EPO', value: 'epo' },
        { label: 'POS', value: 'pos' },
        { label: 'HDHP', value: 'hdhp' }
      ]
    }),
    policy_number: Field.text({ label: 'Policy Number', required: true }),
    group_number: Field.text({ label: 'Group Number' }),
    coverage_start: Field.date({ label: 'Coverage Start Date' }),
    coverage_end: Field.date({ label: 'Coverage End Date' }),
    copay: Field.currency({ label: 'Copay Amount' }),
    deductible: Field.currency({ label: 'Deductible Amount' }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Expired', value: 'expired' },
        { label: 'Cancelled', value: 'cancelled' }
      ],
      defaultValue: 'active'
    })
  }
});

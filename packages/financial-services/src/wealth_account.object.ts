import { ObjectSchema, Field } from '@objectstack/spec/data';

export const WealthAccount = ObjectSchema.create({
  name: 'wealth_account',
  label: 'Wealth Account',
  fields: {
    client_id: Field.lookup('contact', { label: 'Client', required: true }),
    account_type: Field.select({
      label: 'Account Type',
      required: true,
      options: [
        { label: 'Individual', value: 'individual' },
        { label: 'Joint', value: 'joint' },
        { label: 'Trust', value: 'trust' },
        { label: 'Corporate', value: 'corporate' },
        { label: 'Retirement', value: 'retirement' }
      ]
    }),
    balance: Field.number({ label: 'Account Balance', min: 0 }),
    risk_profile: Field.select({
      label: 'Risk Profile',
      options: [
        { label: 'Conservative', value: 'conservative' },
        { label: 'Moderate', value: 'moderate' },
        { label: 'Aggressive', value: 'aggressive' },
        { label: 'Very Aggressive', value: 'very_aggressive' }
      ]
    }),
    investment_strategy: Field.select({
      label: 'Investment Strategy',
      options: [
        { label: 'Growth', value: 'growth' },
        { label: 'Income', value: 'income' },
        { label: 'Balanced', value: 'balanced' },
        { label: 'Preservation', value: 'preservation' }
      ]
    }),
    advisor_id: Field.lookup('contact', { label: 'Financial Advisor' }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Frozen', value: 'frozen' },
        { label: 'Closed', value: 'closed' }
      ],
      defaultValue: 'active'
    }),
    opened_date: Field.text({ label: 'Account Opened Date' }),
    currency: Field.text({ label: 'Currency', defaultValue: 'USD' })
  }
});

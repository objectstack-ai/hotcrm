import { ObjectSchema, Field } from '@objectstack/spec/data';

export const CompensationPlan = ObjectSchema.create({
  name: 'compensation_plan',
  label: 'Compensation Plan',
  pluralLabel: 'Compensation Plans',
  icon: 'money-bill-wave',
  description: 'Employee compensation management including salary, bonuses, and equity',

  fields: {
    employee_id: Field.lookup('employee', { label: 'Employee', required: true }),
    plan_name: Field.text({ label: 'Plan Name', required: true, maxLength: 255 }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Active', value: 'active' },
        { label: 'Superseded', value: 'superseded' },
        { label: 'Expired', value: 'expired' }
      ],
      defaultValue: 'draft'
    }),
    effective_date: Field.date({ label: 'Effective Date', required: true }),
    end_date: Field.date({ label: 'End Date' }),
    base_salary: Field.currency({ label: 'Base Salary', required: true }),
    pay_frequency: Field.select({
      label: 'Pay Frequency',
      options: [
        { label: 'Weekly', value: 'weekly' },
        { label: 'Bi-Weekly', value: 'bi_weekly' },
        { label: 'Semi-Monthly', value: 'semi_monthly' },
        { label: 'Monthly', value: 'monthly' },
        { label: 'Annually', value: 'annually' }
      ],
      defaultValue: 'monthly'
    }),
    currency_code: Field.text({ label: 'Currency', maxLength: 3, defaultValue: 'USD' }),
    bonus_target_percent: Field.percent({ label: 'Bonus Target %', description: 'Target bonus as percentage of base salary' }),
    bonus_max_percent: Field.percent({ label: 'Bonus Max %' }),
    commission_rate: Field.percent({ label: 'Commission Rate' }),
    equity_shares: Field.number({ label: 'Equity Shares', precision: 0 }),
    equity_vesting_months: Field.number({ label: 'Vesting Period (Months)', precision: 0 }),
    equity_cliff_months: Field.number({ label: 'Cliff (Months)', precision: 0 }),
    total_compensation: Field.currency({ label: 'Total Compensation', readonly: true, description: 'Base + target bonus + estimated equity value' }),
    compa_ratio: Field.percent({ label: 'Compa-Ratio', readonly: true, description: 'Salary relative to market midpoint' }),
    salary_range_min: Field.currency({ label: 'Salary Range Min' }),
    salary_range_max: Field.currency({ label: 'Salary Range Max' }),
    salary_range_midpoint: Field.currency({ label: 'Salary Range Midpoint' }),
    last_raise_date: Field.date({ label: 'Last Raise Date' }),
    last_raise_percent: Field.percent({ label: 'Last Raise %' }),
    next_review_date: Field.date({ label: 'Next Review Date' }),
    approved_by_id: Field.lookup('users', { label: 'Approved By' }),
    notes: Field.textarea({ label: 'Notes', maxLength: 4000 })
  },

  enable: { searchable: true, trackHistory: true, feeds: true, files: true },
});

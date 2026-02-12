import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Benefit = ObjectSchema.create({
  name: 'benefit',
  label: 'Benefit',
  pluralLabel: 'Benefits',
  icon: 'hand-holding-heart',
  description: 'Employee benefits administration including health, dental, vision, and retirement plans',

  fields: {
    name: Field.text({ label: 'Benefit Name', required: true, maxLength: 255 }),
    benefit_type: Field.select({
      label: 'Benefit Type', required: true,
      options: [
        { label: '🏥 Health Insurance', value: 'health_insurance' },
        { label: '🦷 Dental Insurance', value: 'dental_insurance' },
        { label: '👁️ Vision Insurance', value: 'vision_insurance' },
        { label: '💰 401(k) / Retirement', value: 'retirement' },
        { label: '🏖️ PTO', value: 'pto' },
        { label: '🤝 Life Insurance', value: 'life_insurance' },
        { label: '♿ Disability', value: 'disability' },
        { label: '🏋️ Wellness', value: 'wellness' },
        { label: '📚 Education', value: 'education' },
        { label: '🚗 Commuter', value: 'commuter' },
        { label: '📦 Other', value: 'other' }
      ]
    }),
    provider: Field.text({ label: 'Provider', maxLength: 255, description: 'Insurance company or benefit provider' }),
    plan_name: Field.text({ label: 'Plan Name', maxLength: 255 }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Pending', value: 'pending' },
        { label: 'Expired', value: 'expired' }
      ],
      defaultValue: 'active'
    }),
    employee_id: Field.lookup('employee', { label: 'Employee', required: true }),
    enrollment_date: Field.date({ label: 'Enrollment Date', required: true }),
    effective_date: Field.date({ label: 'Effective Date', required: true }),
    termination_date: Field.date({ label: 'Termination Date' }),
    employee_contribution: Field.currency({ label: 'Employee Contribution', description: 'Per-period employee cost' }),
    employer_contribution: Field.currency({ label: 'Employer Contribution', description: 'Per-period employer cost' }),
    total_cost: Field.currency({ label: 'Total Cost', readonly: true }),
    coverage_level: Field.select({
      label: 'Coverage Level',
      options: [
        { label: 'Employee Only', value: 'employee_only' },
        { label: 'Employee + Spouse', value: 'employee_spouse' },
        { label: 'Employee + Children', value: 'employee_children' },
        { label: 'Family', value: 'family' }
      ]
    }),
    deductible: Field.currency({ label: 'Deductible' }),
    max_annual_benefit: Field.currency({ label: 'Max Annual Benefit' }),
    vesting_percentage: Field.percent({ label: 'Vesting %', description: 'For retirement benefits' }),
    beneficiary_name: Field.text({ label: 'Beneficiary', maxLength: 255 }),
    notes: Field.textarea({ label: 'Notes', maxLength: 2000 })
  },

  enable: { searchable: true, trackHistory: true, feeds: true, files: true },
});

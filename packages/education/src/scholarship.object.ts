import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Scholarship = ObjectSchema.create({
  name: 'scholarship',
  label: 'Scholarship',
  icon: 'award',
  fields: {
    name: Field.text({ label: 'Scholarship Name', required: true, maxLength: 255 }),
    amount: Field.number({ label: 'Award Amount', required: true, min: 0 }),
    criteria: Field.textarea({ label: 'Eligibility Criteria', required: true }),
    application_deadline: Field.text({ label: 'Application Deadline' }),
    recipients: Field.number({ label: 'Number of Recipients', min: 0, defaultValue: 0 }),
    fund_balance: Field.number({ label: 'Fund Balance', min: 0 }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Closed', value: 'closed' },
        { label: 'Awarded', value: 'awarded' },
        { label: 'Depleted', value: 'depleted' }
      ],
      defaultValue: 'open'
    }),
    academic_year: Field.text({ label: 'Academic Year' }),
    department: Field.text({ label: 'Eligible Department' }),
    min_gpa: Field.number({ label: 'Minimum GPA Requirement', min: 0, max: 4 })
  }
});

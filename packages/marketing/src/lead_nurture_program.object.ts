import { ObjectSchema, Field } from '@objectstack/spec/data';

export const LeadNurtureProgram = ObjectSchema.create({
  name: 'lead_nurture_program',
  label: 'Lead Nurture Program',
  pluralLabel: 'Lead Nurture Programs',
  icon: 'seedling',
  description: 'Manage lead nurturing programs with enrollment, graduation criteria, and cadence tracking.',

  fields: {
    name: Field.text({
      label: 'Program Name',
      required: true,
      searchable: true
    }),
    description: Field.textarea({ label: 'Description' }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Active', value: 'active' },
        { label: 'Paused', value: 'paused' },
        { label: 'Completed', value: 'completed' }
      ],
      defaultValue: 'draft'
    }),
    cadence_type: Field.select({
      label: 'Cadence Type',
      options: [
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Biweekly', value: 'biweekly' },
        { label: 'Monthly', value: 'monthly' },
        { label: 'Custom', value: 'custom' }
      ]
    }),
    cadence_days: Field.number({ label: 'Cadence Days' }),
    steps_count: Field.number({ label: 'Steps Count' }),
    campaign: Field.lookup('campaign', { label: 'Campaign' }),
    enrollment_criteria: Field.textarea({ label: 'Enrollment Criteria' }),
    graduation_criteria: Field.textarea({ label: 'Graduation Criteria' }),
    graduation_score: Field.number({ label: 'Graduation Score' }),
    total_enrolled: Field.number({ label: 'Total Enrolled' }),
    total_graduated: Field.number({ label: 'Total Graduated' }),
    total_dropped: Field.number({ label: 'Total Dropped' }),
    graduation_rate: Field.percent({ label: 'Graduation Rate' }),
    start_date: Field.datetime({ label: 'Start Date' }),
    end_date: Field.datetime({ label: 'End Date' }),
    created_by: Field.text({ label: 'Created By' })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    apiEnabled: true,
  },
});

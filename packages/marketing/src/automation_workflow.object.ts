import { ObjectSchema, Field } from '@objectstack/spec/data';

export const AutomationWorkflow = ObjectSchema.create({
  name: 'automation_workflow',
  label: 'Automation Workflow',
  pluralLabel: 'Automation Workflows',
  icon: 'workflow',
  description: 'Define and manage automated marketing workflows with triggers, steps, and enrollment tracking.',

  fields: {
    name: Field.text({
      label: 'Workflow Name',
      required: true,
      searchable: true
    }),
    description: Field.textarea({ label: 'Description' }),
    trigger_type: Field.select({
      label: 'Trigger Type',
      options: [
        { label: 'Form Submission', value: 'form_submission' },
        { label: 'List Membership', value: 'list_membership' },
        { label: 'Lead Score Change', value: 'lead_score_change' },
        { label: 'Date Based', value: 'date_based' },
        { label: 'Event Based', value: 'event_based' }
      ]
    }),
    entry_criteria: Field.textarea({ label: 'Entry Criteria' }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Active', value: 'active' },
        { label: 'Paused', value: 'paused' },
        { label: 'Completed', value: 'completed' },
        { label: 'Archived', value: 'archived' }
      ],
      defaultValue: 'draft'
    }),
    campaign: Field.lookup('campaign', { label: 'Campaign' }),
    marketing_list: Field.lookup('marketing_list', { label: 'Marketing List' }),
    steps_count: Field.number({ label: 'Steps Count' }),
    enrolled_count: Field.number({ label: 'Enrolled Count' }),
    completed_count: Field.number({ label: 'Completed Count' }),
    conversion_rate: Field.percent({ label: 'Conversion Rate' }),
    start_date: Field.datetime({ label: 'Start Date' }),
    end_date: Field.datetime({ label: 'End Date' }),
    is_active: Field.boolean({ label: 'Active', defaultValue: true }),
    created_by: Field.text({ label: 'Created By' })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    apiEnabled: true,
  },
});

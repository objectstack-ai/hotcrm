import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Journey = ObjectSchema.create({
  name: 'journey',
  label: 'Journey',
  pluralLabel: 'Journeys',
  icon: 'route',
  description: 'Customer journey orchestration with multi-step engagement flows',

  fields: {
    name: Field.text({ label: 'Journey Name', required: true, maxLength: 255 }),
    description: Field.textarea({ label: 'Description', maxLength: 4000 }),
    status: Field.select({
      label: 'Status', required: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Active', value: 'active' },
        { label: 'Paused', value: 'paused' },
        { label: 'Completed', value: 'completed' },
        { label: 'Archived', value: 'archived' }
      ],
      defaultValue: 'draft'
    }),
    journey_type: Field.select({
      label: 'Journey Type', required: true,
      options: [
        { label: 'Welcome', value: 'welcome' },
        { label: 'Nurture', value: 'nurture' },
        { label: 'Re-engagement', value: 're_engagement' },
        { label: 'Onboarding', value: 'onboarding' },
        { label: 'Upsell', value: 'upsell' },
        { label: 'Retention', value: 'retention' },
        { label: 'Custom', value: 'custom' }
      ]
    }),
    entry_criteria: Field.textarea({ label: 'Entry Criteria', maxLength: 4000, description: 'JSON criteria for journey entry' }),
    exit_criteria: Field.textarea({ label: 'Exit Criteria', maxLength: 4000, description: 'JSON criteria for journey exit' }),
    start_date: Field.datetime({ label: 'Start Date' }),
    end_date: Field.datetime({ label: 'End Date' }),
    total_contacts_entered: Field.number({ label: 'Total Entered', readonly: true, precision: 0, defaultValue: 0 }),
    active_contacts: Field.number({ label: 'Active Contacts', readonly: true, precision: 0, defaultValue: 0 }),
    completed_contacts: Field.number({ label: 'Completed', readonly: true, precision: 0, defaultValue: 0 }),
    conversion_rate: Field.percent({ label: 'Conversion Rate', readonly: true }),
    goal_metric: Field.text({ label: 'Goal Metric', maxLength: 255, description: 'KPI this journey aims to improve' }),
    goal_target: Field.number({ label: 'Goal Target', precision: 2 }),
    owner_id: Field.lookup('users', { label: 'Owner', required: true }),
    campaign_id: Field.lookup('campaign', { label: 'Campaign', description: 'Associated campaign' }),
    is_recurring: Field.boolean({ label: 'Recurring', defaultValue: false }),
    max_entries_per_contact: Field.number({ label: 'Max Entries Per Contact', precision: 0, defaultValue: 1 })
  },

  enable: { searchable: true, trackHistory: true, feeds: true, files: true },
});

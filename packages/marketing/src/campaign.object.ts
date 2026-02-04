import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Campaign = ObjectSchema.create({
  name: 'campaign',
  label: 'Marketing Campaign',
  pluralLabel: 'Marketing Campaigns',
  icon: 'megaphone',
  description: 'Plan, execute, and track marketing campaigns.',
  
  fields: {
    name: Field.text({ 
      label: 'Campaign Name', 
      required: true, 
      searchable: true 
    }),
    type: Field.select({
      label: 'Type',
      options: [
        { label: 'Conference', value: 'conference' },
        { label: 'Webinar', value: 'webinar' },
        { label: 'Trade Show', value: 'trade_show' },
        { label: 'Email', value: 'email' },
        { label: 'Social Media', value: 'social_media' },
        { label: 'Advertisement', value: 'advertisement' },
        { label: 'Direct Mail', value: 'direct_mail' },
        { label: 'Partners', value: 'partners' },
        { label: 'Other', value: 'other' }
      ]
    }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Planned', value: 'planned' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' },
        { label: 'Aborted', value: 'aborted' }
      ],
      defaultValue: 'Planned'
    }),
    start_date: Field.date({ label: 'Start Date' }),
    end_date: Field.date({ label: 'End Date' }),
    budgeted_cost: Field.currency({ label: 'Budgeted Cost', scale: 2 }),
    actual_cost: Field.currency({ label: 'Actual Cost', scale: 2 }),
    expected_revenue: Field.currency({ label: 'Expected Revenue', scale: 2 }),
    actual_revenue: Field.currency({ 
      label: 'Actual Revenue', 
      scale: 2,
      readonly: true,
      description: 'Calculated from Won Opportunities' 
    }),
    description: Field.textarea({ label: 'Description' }),
    is_active: Field.boolean({ label: 'Active', defaultValue: true }),
    parent_campaign: Field.lookup('campaign', { label: 'Parent Campaign' })
  },
  
  enable: {
    searchable: true,
    trackHistory: true,
    apiEnabled: true,
  },
});


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
        { label: 'Conference', value: 'Conference' },
        { label: 'Webinar', value: 'Webinar' },
        { label: 'Trade Show', value: 'Trade Show' },
        { label: 'Email', value: 'Email' },
        { label: 'Social Media', value: 'Social Media' },
        { label: 'Advertisement', value: 'Advertisement' },
        { label: 'Direct Mail', value: 'Direct Mail' },
        { label: 'Partners', value: 'Partners' },
        { label: 'Other', value: 'Other' }
      ]
    }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Planned', value: 'Planned' },
        { label: 'In Progress', value: 'In Progress' },
        { label: 'Completed', value: 'Completed' },
        { label: 'Aborted', value: 'Aborted' }
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
    searchEnabled: true,
    trackHistory: true,
    apiEnabled: true,
  },
});


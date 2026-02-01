export default {
  name: 'campaign',
  label: 'Marketing Campaign',
  icon: 'megaphone',
  description: 'Plan, execute, and track marketing campaigns.',
  fields: {
    name: { 
      type: 'text', 
      label: 'Campaign Name', 
      required: true, 
      searchable: true 
    },
    type: {
      type: 'select',
      label: 'Type',
      options: [
        'Conference',
        'Webinar',
        'Trade Show',
        'Email',
        'Social Media',
        'Advertisement',
        'Direct Mail',
        'Partners',
        'Other'
      ]
    },
    status: {
      type: 'select',
      label: 'Status',
      options: ['Planned', 'In Progress', 'Completed', 'Aborted'],
      defaultValue: 'Planned'
    },
    start_date: { type: 'date', label: 'Start Date' },
    end_date: { type: 'date', label: 'End Date' },
    budgeted_cost: { type: 'currency', label: 'Budgeted Cost', scale: 2 },
    actual_cost: { type: 'currency', label: 'Actual Cost', scale: 2 },
    expected_revenue: { type: 'currency', label: 'Expected Revenue', scale: 2 },
    actual_revenue: { 
      type: 'currency', 
      label: 'Actual Revenue', 
      scale: 2,
      readonly: true,
      description: 'Calculated from Won Opportunities' 
    },
    description: { type: 'textarea', label: 'Description' },
    is_active: { type: 'boolean', label: 'Active', defaultValue: true },
    parent_campaign: { type: 'lookup', reference: 'campaign', label: 'Parent Campaign' }
  }
}


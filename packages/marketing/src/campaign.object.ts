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
    budgeted_cost: { type: 'currency', label: 'Budgeted Cost' },
    actual_cost: { type: 'currency', label: 'Actual Cost' },
    expected_revenue: { type: 'currency', label: 'Expected Revenue' },
    description: { type: 'textarea', label: 'Description' },
    isActive: { type: 'boolean', label: 'Active', defaultValue: true },
    parent_campaign: { type: 'lookup', reference_to: 'campaign', label: 'Parent Campaign' }
  }
}

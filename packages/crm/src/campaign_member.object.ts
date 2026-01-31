
const CampaignMember = {
  name: 'campaign_member',
  label: 'Campaign Member',
  labelPlural: 'Campaign Members',
  icon: 'users',
  description: 'Many-to-many relationship tracking between Campaigns and Leads/Contacts',
  enable: {
    searchable: true,
    trackHistory: true,
    files: false
  },
  fields: {
    // Relationship Fields
    campaign_id: {
      type: 'lookup',
      label: 'Campaign',
      reference: 'Campaign',
      required: true,
      description: 'The marketing campaign this member belongs to'
    },
    lead_id: {
      type: 'lookup',
      label: 'Lead',
      reference: 'Lead',
      description: 'Related lead (mutually exclusive with contact_id)'
    },
    contact_id: {
      type: 'lookup',
      label: 'Contact',
      reference: 'Contact',
      description: 'Related contact (mutually exclusive with lead_id)'
    },
    
    // status & Engagement
    status: {
      type: 'select',
      label: 'Member status',
      required: true,
      defaultValue: 'Sent',
      options: [
        { label: '📤 Sent', value: 'Sent' },
        { label: '👁️ Opened', value: 'Opened' },
        { label: '🖱️ Clicked', value: 'Clicked' },
        { label: '✅ Responded', value: 'Responded' },
        { label: '🚫 Unsubscribed', value: 'Unsubscribed' }
      ]
    },
    first_responded_date: {
      type: 'datetime',
      label: 'First Responded Date',
      readonly: true,
      description: 'Timestamp when member first responded to campaign'
    },
    
    // Member Details
    member_source: {
      type: 'select',
      label: 'Member Source',
      defaultValue: 'Manual',
      options: [
        { label: '✍️ Manual', value: 'Manual' },
        { label: '📥 Import', value: 'Import' },
        { label: '🔌 API', value: 'API' },
        { label: '🤖 Automation', value: 'Automation' }
      ]
    },
    notes: {
      type: 'textarea',
      label: 'notes',
      maxLength: 2000,
      description: 'Additional notes about this campaign member'
    },
    
    // Email Tracking (for email campaigns)
    email_bounced_reason: {
      type: 'text',
      label: 'Email Bounced Reason',
      readonly: true,
      maxLength: 255
    },
    email_bounced_date: {
      type: 'datetime',
      label: 'Email Bounced Date',
      readonly: true
    },
    has_responded: {
      type: 'checkbox',
      label: 'Has Responded',
      defaultValue: false,
      readonly: true,
      description: 'Auto-set to true when status is Responded'
    },
    
    // Tracking
    first_opened_date: {
      type: 'datetime',
      label: 'First Opened Date',
      readonly: true
    },
    first_clicked_date: {
      type: 'datetime',
      label: 'First Clicked Date',
      readonly: true
    },
    number_of_opens: {
      type: 'number',
      label: 'Number of Opens',
      defaultValue: 0,
      precision: 0,
      readonly: true
    },
    number_of_clicks: {
      type: 'number',
      label: 'Number of Clicks',
      defaultValue: 0,
      precision: 0,
      readonly: true
    }
  },
  relationships: [
    {
      name: 'Campaign',
      type: 'belongsTo',
      object: 'Campaign',
      foreignKey: 'campaign_id',
      label: 'Campaign'
    },
    {
      name: 'Lead',
      type: 'belongsTo',
      object: 'Lead',
      foreignKey: 'lead_id',
      label: 'Lead'
    },
    {
      name: 'Contact',
      type: 'belongsTo',
      object: 'Contact',
      foreignKey: 'contact_id',
      label: 'Contact'
    }
  ],
  listViews: [
    {
      name: 'AllMembers',
      label: 'All Campaign Members',
      filters: [],
      columns: ['campaign_id', 'lead_id', 'contact_id', 'status', 'member_source', 'first_responded_date'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'Responded',
      label: 'Responded',
      filters: [['status', '=', 'Responded']],
      columns: ['campaign_id', 'lead_id', 'contact_id', 'first_responded_date', 'notes'],
      sort: [['first_responded_date', 'desc']]
    },
    {
      name: 'Engaged',
      label: 'Engaged (Opened/Clicked)',
      filters: [['status', 'in', ['Opened', 'Clicked']]],
      columns: ['campaign_id', 'lead_id', 'contact_id', 'status', 'number_of_opens', 'number_of_clicks', 'first_opened_date'],
      sort: [['first_opened_date', 'desc']]
    },
    {
      name: 'Unsubscribed',
      label: 'Unsubscribed',
      filters: [['status', '=', 'Unsubscribed']],
      columns: ['campaign_id', 'lead_id', 'contact_id', 'first_responded_date', 'notes'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'NotEngaged',
      label: 'Not Engaged',
      filters: [['status', '=', 'Sent']],
      columns: ['campaign_id', 'lead_id', 'contact_id', 'member_source', 'CreatedDate'],
      sort: [['CreatedDate', 'desc']]
    }
  ],
  validationRules: [
    {
      name: 'RequireLeadOrContact',
      errorMessage: 'Campaign Member must have either a Lead or a Contact',
      formula: 'AND(ISBLANK(lead_id), ISBLANK(contact_id))'
    },
    {
      name: 'PreventBothLeadAndContact',
      errorMessage: 'Campaign Member cannot have both Lead and Contact',
      formula: 'AND(NOT(ISBLANK(lead_id)), NOT(ISBLANK(contact_id)))'
    },
    {
      name: 'StatusProgression',
      errorMessage: 'status cannot regress (e.g., from Responded to Sent)',
      formula: 'AND(PRIORVALUE(status) = "Responded", status = "Sent")'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Campaign Member Information',
        columns: 2,
        fields: ['campaign_id', 'lead_id', 'contact_id', 'status', 'member_source']
      },
      {
        label: 'Engagement Tracking',
        columns: 2,
        fields: ['first_opened_date', 'first_clicked_date', 'first_responded_date', 'number_of_opens', 'number_of_clicks', 'has_responded']
      },
      {
        label: 'Email Bounced Information',
        columns: 2,
        fields: ['email_bounced_date', 'email_bounced_reason']
      },
      {
        label: 'notes',
        columns: 1,
        fields: ['notes']
      }
    ]
  }
};

export default CampaignMember;

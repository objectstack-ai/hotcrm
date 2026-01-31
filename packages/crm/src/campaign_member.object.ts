
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
    CampaignId: {
      type: 'lookup',
      label: 'Campaign',
      reference: 'Campaign',
      required: true,
      description: 'The marketing campaign this member belongs to'
    },
    LeadId: {
      type: 'lookup',
      label: 'Lead',
      reference: 'Lead',
      description: 'Related lead (mutually exclusive with ContactId)'
    },
    ContactId: {
      type: 'lookup',
      label: 'Contact',
      reference: 'Contact',
      description: 'Related contact (mutually exclusive with LeadId)'
    },
    
    // Status & Engagement
    Status: {
      type: 'select',
      label: 'Member Status',
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
    FirstRespondedDate: {
      type: 'datetime',
      label: 'First Responded Date',
      readonly: true,
      description: 'Timestamp when member first responded to campaign'
    },
    
    // Member Details
    MemberSource: {
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
    Notes: {
      type: 'textarea',
      label: 'Notes',
      maxLength: 2000,
      description: 'Additional notes about this campaign member'
    },
    
    // Email Tracking (for email campaigns)
    EmailBouncedReason: {
      type: 'text',
      label: 'Email Bounced Reason',
      readonly: true,
      maxLength: 255
    },
    EmailBouncedDate: {
      type: 'datetime',
      label: 'Email Bounced Date',
      readonly: true
    },
    HasResponded: {
      type: 'checkbox',
      label: 'Has Responded',
      defaultValue: false,
      readonly: true,
      description: 'Auto-set to true when Status is Responded'
    },
    
    // Tracking
    FirstOpenedDate: {
      type: 'datetime',
      label: 'First Opened Date',
      readonly: true
    },
    FirstClickedDate: {
      type: 'datetime',
      label: 'First Clicked Date',
      readonly: true
    },
    NumberOfOpens: {
      type: 'number',
      label: 'Number of Opens',
      defaultValue: 0,
      precision: 0,
      readonly: true
    },
    NumberOfClicks: {
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
      foreignKey: 'CampaignId',
      label: 'Campaign'
    },
    {
      name: 'Lead',
      type: 'belongsTo',
      object: 'Lead',
      foreignKey: 'LeadId',
      label: 'Lead'
    },
    {
      name: 'Contact',
      type: 'belongsTo',
      object: 'Contact',
      foreignKey: 'ContactId',
      label: 'Contact'
    }
  ],
  listViews: [
    {
      name: 'AllMembers',
      label: 'All Campaign Members',
      filters: [],
      columns: ['CampaignId', 'LeadId', 'ContactId', 'Status', 'MemberSource', 'FirstRespondedDate'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'Responded',
      label: 'Responded',
      filters: [['Status', '=', 'Responded']],
      columns: ['CampaignId', 'LeadId', 'ContactId', 'FirstRespondedDate', 'Notes'],
      sort: [['FirstRespondedDate', 'desc']]
    },
    {
      name: 'Engaged',
      label: 'Engaged (Opened/Clicked)',
      filters: [['Status', 'in', ['Opened', 'Clicked']]],
      columns: ['CampaignId', 'LeadId', 'ContactId', 'Status', 'NumberOfOpens', 'NumberOfClicks', 'FirstOpenedDate'],
      sort: [['FirstOpenedDate', 'desc']]
    },
    {
      name: 'Unsubscribed',
      label: 'Unsubscribed',
      filters: [['Status', '=', 'Unsubscribed']],
      columns: ['CampaignId', 'LeadId', 'ContactId', 'FirstRespondedDate', 'Notes'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'NotEngaged',
      label: 'Not Engaged',
      filters: [['Status', '=', 'Sent']],
      columns: ['CampaignId', 'LeadId', 'ContactId', 'MemberSource', 'CreatedDate'],
      sort: [['CreatedDate', 'desc']]
    }
  ],
  validationRules: [
    {
      name: 'RequireLeadOrContact',
      errorMessage: 'Campaign Member must have either a Lead or a Contact',
      formula: 'AND(ISBLANK(LeadId), ISBLANK(ContactId))'
    },
    {
      name: 'PreventBothLeadAndContact',
      errorMessage: 'Campaign Member cannot have both Lead and Contact',
      formula: 'AND(NOT(ISBLANK(LeadId)), NOT(ISBLANK(ContactId)))'
    },
    {
      name: 'StatusProgression',
      errorMessage: 'Status cannot regress (e.g., from Responded to Sent)',
      formula: 'AND(PRIORVALUE(Status) = "Responded", Status = "Sent")'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Campaign Member Information',
        columns: 2,
        fields: ['CampaignId', 'LeadId', 'ContactId', 'Status', 'MemberSource']
      },
      {
        label: 'Engagement Tracking',
        columns: 2,
        fields: ['FirstOpenedDate', 'FirstClickedDate', 'FirstRespondedDate', 'NumberOfOpens', 'NumberOfClicks', 'HasResponded']
      },
      {
        label: 'Email Bounced Information',
        columns: 2,
        fields: ['EmailBouncedDate', 'EmailBouncedReason']
      },
      {
        label: 'Notes',
        columns: 1,
        fields: ['Notes']
      }
    ]
  }
};

export default CampaignMember;

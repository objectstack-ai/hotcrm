
const Case = {
  name: 'case',
  label: 'Case',
  labelPlural: 'Cases',
  icon: 'ticket-alt',
  description: 'Customer service case and support request management with SLA tracking and AI-powered routing',
  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true,
    emailToCase: true
  },
  fields: {
    // Basic Information
    case_number: {
      type: 'autonumber',
      label: 'Case Number',
      format: 'CASE-{YYYY}-{0000}',
      readonly: true,
      searchable: true
    },
    subject: {
      type: 'text',
      label: 'subject',
      required: true,
      searchable: true,
      maxLength: 255
    },
    description: {
      type: 'textarea',
      label: 'description',
      required: true,
      maxLength: 32000,
      searchable: true
    },
    status: {
      type: 'select',
      label: 'status',
      required: true,
      defaultValue: 'New',
      options: [
        { label: '🆕 New', value: 'New' },
        { label: '📋 Open', value: 'Open' },
        { label: '🔄 In Progress', value: 'In Progress' },
        { label: '⏸️ Waiting on Customer', value: 'Waiting on Customer' },
        { label: '⏰ Escalated', value: 'Escalated' },
        { label: '✅ Resolved', value: 'Resolved' },
        { label: '🔒 Closed', value: 'Closed' }
      ]
    },
    priority: {
      type: 'select',
      label: 'priority',
      required: true,
      defaultValue: 'Medium',
      options: [
        { label: '🔴 Critical', value: 'Critical' },
        { label: '🟠 High', value: 'High' },
        { label: '🟡 Medium', value: 'Medium' },
        { label: '🟢 Low', value: 'Low' }
      ]
    },
    severity: {
      type: 'select',
      label: 'severity',
      options: [
        { label: 'S1 - Critical Impact', value: 'S1' },
        { label: 'S2 - High Impact', value: 'S2' },
        { label: 'S3 - Medium Impact', value: 'S3' },
        { label: 'S4 - Low Impact', value: 'S4' }
      ]
    },
    type: {
      type: 'select',
      label: 'Case type',
      options: [
        { label: '🐛 Problem', value: 'Problem' },
        { label: '❓ Question', value: 'Question' },
        { label: '🆘 Incident', value: 'Incident' },
        { label: '💡 Feature Request', value: 'Feature Request' },
        { label: '🎓 Training', value: 'Training' },
        { label: '🔧 Maintenance', value: 'Maintenance' },
        { label: '📖 Other', value: 'Other' }
      ]
    },
    origin: {
      type: 'select',
      label: 'origin Channel',
      required: true,
      options: [
        { label: '📧 Email', value: 'Email' },
        { label: '🌐 Web', value: 'Web' },
        { label: '📞 Phone', value: 'Phone' },
        { label: '💬 WeChat', value: 'WeChat' },
        { label: '🤖 Chat Bot', value: 'Chat Bot' },
        { label: '📱 Mobile App', value: 'Mobile App' },
        { label: '👤 Walk-in', value: 'Walk-in' },
        { label: '🎯 Other', value: 'Other' }
      ]
    },
    // Related Records
    account_id: {
      type: 'lookup',
      label: 'Account',
      reference: 'account',
      required: true
    },
    contact_id: {
      type: 'lookup',
      label: 'Contact',
      reference: 'contact'
    },
    contract_id: {
      type: 'lookup',
      label: 'Contract',
      reference: 'Contract',
      description: 'Service contract'
    },
    product_id: {
      type: 'lookup',
      label: 'Product',
      reference: 'product'
    },
    asset_id: {
      type: 'lookup',
      label: 'Asset',
      reference: 'Asset',
      description: 'Related asset or equipment'
    },
    parent_case_id: {
      type: 'lookup',
      label: 'Parent Case',
      reference: 'case',
      description: 'Parent case if this is a sub-case'
    },
    // Assignment
    owner_id: {
      type: 'lookup',
      label: 'Owner',
      reference: 'users',
      required: true
    },
    assigned_to_queue_id: {
      type: 'lookup',
      label: 'Queue',
      reference: 'Queue',
      description: 'Support team queue'
    },
    // SLA Management
    sla_level: {
      type: 'select',
      label: 'SLA Level',
      options: [
        { label: '🏆 Platinum', value: 'Platinum' },
        { label: '🥇 Gold', value: 'Gold' },
        { label: '🥈 Silver', value: 'Silver' },
        { label: '🥉 Bronze', value: 'Bronze' },
        { label: '📋 Standard', value: 'Standard' }
      ]
    },
    response_due_date: {
      type: 'datetime',
      label: 'Response Due',
      readonly: true,
      description: 'Auto-calculated based on SLA'
    },
    resolution_due_date: {
      type: 'datetime',
      label: 'resolution Due',
      readonly: true,
      description: 'Auto-calculated based on SLA'
    },
    first_response_time: {
      type: 'datetime',
      label: 'First Response Time',
      readonly: true
    },
    actual_resolution_time: {
      type: 'datetime',
      label: 'Actual resolution Time',
      readonly: true
    },
    response_time_minutes: {
      type: 'number',
      label: 'Response Time (Minutes)',
      precision: 0,
      readonly: true
    },
    resolution_time_minutes: {
      type: 'number',
      label: 'resolution Time (Minutes)',
      precision: 0,
      readonly: true
    },
    is_sla_violated: {
      type: 'checkbox',
      label: 'SLA Violated',
      readonly: true,
      defaultValue: false
    },
    sla_violation_type: {
      type: 'select',
      label: 'SLA Violation type',
      readonly: true,
      options: [
        { label: 'Response Time Violation', value: 'Response' },
        { label: 'resolution Time Violation', value: 'resolution' },
        { label: 'Both', value: 'Both' }
      ]
    },
    // Escalation
    is_escalated: {
      type: 'checkbox',
      label: 'Escalated',
      defaultValue: false
    },
    escalated_date: {
      type: 'datetime',
      label: 'Escalated Date',
      readonly: true
    },
    escalated_to_id: {
      type: 'lookup',
      label: 'Escalated To',
      reference: 'users'
    },
    escalation_reason: {
      type: 'textarea',
      label: 'Escalation Reason',
      maxLength: 2000
    },
    escalation_level: {
      type: 'number',
      label: 'Escalation Level',
      precision: 0,
      defaultValue: 0,
      readonly: true,
      description: 'Number of times escalated'
    },
    // resolution
    resolution: {
      type: 'textarea',
      label: 'resolution',
      maxLength: 32000,
      searchable: true
    },
    root_cause: {
      type: 'textarea',
      label: 'Root Cause',
      maxLength: 5000
    },
    resolution_category: {
      type: 'select',
      label: 'resolution Category',
      options: [
        { label: '💻 Technical Support', value: 'Technical Support' },
        { label: '📚 Product Guidance', value: 'Product Guidance' },
        { label: '🔧 Configuration Change', value: 'Configuration Change' },
        { label: '🐛 Bug Fix', value: 'Bug Fix' },
        { label: '📦 Product Update', value: 'Product Update' },
        { label: '🎓 Training', value: 'Training' },
        { label: '❌ No Fix Needed', value: 'No Fix Needed' },
        { label: '🎯 Other', value: 'Other' }
      ]
    },
    work_around_provided: {
      type: 'checkbox',
      label: 'Workaround Provided',
      defaultValue: false
    },
    // Customer Satisfaction (CSAT)
    customer_satisfaction: {
      type: 'select',
      label: 'Customer Satisfaction',
      readonly: true,
      options: [
        { label: '😄 Very Satisfied', value: 'Very Satisfied' },
        { label: '🙂 Satisfied', value: 'Satisfied' },
        { label: '😐 Neutral', value: 'Neutral' },
        { label: '😟 Dissatisfied', value: 'Dissatisfied' },
        { label: '😡 Very Dissatisfied', value: 'Very Dissatisfied' }
      ]
    },
    satisfaction_score: {
      type: 'number',
      label: 'CSAT Score',
      precision: 0,
      min: 1,
      max: 5,
      readonly: true,
      description: 'Customer satisfaction rating (1-5)'
    },
    customer_feedback: {
      type: 'textarea',
      label: 'Customer Feedback',
      maxLength: 5000,
      readonly: true
    },
    csat_survey_date: {
      type: 'datetime',
      label: 'CSAT Survey Date',
      readonly: true
    },
    // Timestamps
    closed_date: {
      type: 'datetime',
      label: 'Closed Date',
      readonly: true
    },
    reopened_date: {
      type: 'datetime',
      label: 'Reopened Date',
      readonly: true
    },
    reopen_count: {
      type: 'number',
      label: 'Reopen Count',
      precision: 0,
      defaultValue: 0,
      readonly: true
    },
    // AI Enhancement Fields
    ai_auto_category: {
      type: 'select',
      label: 'AI Auto Category',
      readonly: true,
      options: [
        { label: 'Technical', value: 'Technical' },
        { label: 'Product', value: 'Product' },
        { label: 'Billing', value: 'Billing' },
        { label: 'Feature', value: 'Feature' },
        { label: 'Complaint', value: 'Complaint' },
        { label: 'Other', value: 'Other' }
      ]
    },
    ai_suggested_assignee_id: {
      type: 'lookup',
      label: 'AI Suggested Assignee',
      reference: 'users',
      readonly: true,
      description: 'AI-recommended agent based on skills and availability'
    },
    ai_related_knowledge: {
      type: 'text',
      label: 'AI Related Knowledge',
      readonly: true,
      maxLength: 500,
      description: 'Related knowledge base article IDs'
    },
    ai_suggested_solution: {
      type: 'textarea',
      label: 'AI Suggested Solution',
      readonly: true,
      maxLength: 5000,
      description: 'AI-generated solution based on knowledge base'
    },
    ai_sentiment_analysis: {
      type: 'select',
      label: 'AI Sentiment',
      readonly: true,
      options: [
        { label: '😊 Positive', value: 'Positive' },
        { label: '😐 Neutral', value: 'Neutral' },
        { label: '😟 Negative', value: 'Negative' },
        { label: '😡 Angry', value: 'Angry' }
      ]
    },
    ai_urgency_score: {
      type: 'number',
      label: 'AI Urgency Score',
      precision: 0,
      min: 0,
      max: 100,
      readonly: true,
      description: 'AI-calculated urgency score (0-100)'
    },
    ai_keywords: {
      type: 'text',
      label: 'AI Keywords',
      readonly: true,
      maxLength: 500,
      description: 'Extracted keywords from case description'
    }
  },
  relationships: [
    {
      name: 'CaseComments',
      type: 'hasMany',
      object: 'CaseComment',
      foreignKey: 'case_id',
      label: 'Case Comments'
    },
    {
      name: 'Activities',
      type: 'hasMany',
      object: 'Activity',
      foreignKey: 'what_id',
      label: 'Activities'
    },
    {
      name: 'ChildCases',
      type: 'hasMany',
      object: 'Case',
      foreignKey: 'parent_case_id',
      label: 'Child Cases'
    },
    {
      name: 'SLAHistory',
      type: 'hasMany',
      object: 'SLAHistory',
      foreignKey: 'case_id',
      label: 'SLA History'
    }
  ],
  listViews: [
    {
      name: 'AllCases',
      label: 'All Cases',
      filters: [],
      columns: ['case_number', 'subject', 'account_id', 'priority', 'status', 'owner_id', 'CreatedDate'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'MyCases',
      label: 'My Cases',
      filters: [
        ['owner_id', '=', '$currentUser'],
        ['status', 'not in', ['Closed']]
      ],
      columns: ['case_number', 'subject', 'account_id', 'priority', 'status', 'resolution_due_date'],
      sort: [['priority', 'desc'], ['resolution_due_date', 'asc']]
    },
    {
      name: 'TeamQueue',
      label: 'Team Queue',
      filters: [
        ['assigned_to_queue_id', '!=', null],
        ['status', 'not in', ['Closed', 'Resolved']]
      ],
      columns: ['case_number', 'subject', 'account_id', 'priority', 'status', 'assigned_to_queue_id', 'CreatedDate'],
      sort: [['priority', 'desc'], ['CreatedDate', 'asc']]
    },
    {
      name: 'OpenCases',
      label: 'Open',
      filters: [
        ['status', 'not in', ['Closed', 'Resolved']]
      ],
      columns: ['case_number', 'subject', 'account_id', 'priority', 'status', 'owner_id', 'CreatedDate'],
      sort: [['CreatedDate', 'asc']]
    },
    {
      name: 'HighPriority',
      label: 'High priority',
      filters: [
        ['priority', 'in', ['Critical', 'High']],
        ['status', 'not in', ['Closed', 'Resolved']]
      ],
      columns: ['case_number', 'subject', 'account_id', 'priority', 'status', 'resolution_due_date', 'owner_id'],
      sort: [['priority', 'desc']]
    },
    {
      name: 'EscalatedCases',
      label: 'Escalated',
      filters: [
        ['is_escalated', '=', true],
        ['status', 'not in', ['Closed', 'Resolved']]
      ],
      columns: ['case_number', 'subject', 'account_id', 'priority', 'escalated_date', 'escalated_to_id', 'owner_id'],
      sort: [['escalated_date', 'desc']]
    },
    {
      name: 'SLAViolations',
      label: 'SLA Violations',
      filters: [
        ['is_sla_violated', '=', true]
      ],
      columns: ['case_number', 'subject', 'account_id', 'sla_level', 'sla_violation_type', 'resolution_due_date', 'owner_id'],
      sort: [['resolution_due_date', 'asc']]
    },
    {
      name: 'TodayClosed',
      label: 'Today Closed',
      filters: [
        ['status', '=', 'Closed'],
        ['closed_date', 'today', null]
      ],
      columns: ['case_number', 'subject', 'account_id', 'resolution_time_minutes', 'customer_satisfaction', 'closed_date'],
      sort: [['closed_date', 'desc']]
    },
    {
      name: 'RecentlyClosed',
      label: 'Recently Closed',
      filters: [
        ['status', '=', 'Closed'],
        ['closed_date', 'last_n_days', 30]
      ],
      columns: ['case_number', 'subject', 'account_id', 'resolution_time_minutes', 'customer_satisfaction', 'closed_date'],
      sort: [['closed_date', 'desc']]
    },
    {
      name: 'WaitingOnCustomer',
      label: 'Waiting on Customer',
      filters: [
        ['status', '=', 'Waiting on Customer']
      ],
      columns: ['case_number', 'subject', 'account_id', 'contact_id', 'ModifiedDate', 'owner_id'],
      sort: [['ModifiedDate', 'asc']]
    },
    {
      name: 'UnassignedCases',
      label: 'Unassigned',
      filters: [
        ['assigned_to_queue_id', '=', null],
        ['status', '=', 'New']
      ],
      columns: ['case_number', 'subject', 'account_id', 'priority', 'origin', 'CreatedDate', 'ai_urgency_score'],
      sort: [['ai_urgency_score', 'desc'], ['CreatedDate', 'asc']]
    }
  ],
  validationRules: [
    {
      name: 'ResolutionRequiredWhenResolved',
      errorMessage: 'resolution is required when status is Resolved',
      formula: 'AND(status = "Resolved", ISBLANK(resolution))'
    },
    {
      name: 'ClosedCaseReadOnly',
      errorMessage: 'Closed cases cannot be modified',
      formula: 'AND(PRIORVALUE(status) = "Closed", status != "Closed", NOT(ISNEW()))'
    },
    {
      name: 'EscalationReasonRequired',
      errorMessage: 'Escalation reason is required when escalating a case',
      formula: 'AND(is_escalated = true, ISBLANK(escalation_reason))'
    },
    {
      name: 'EscalatedToRequired',
      errorMessage: 'Escalated To user is required when case is escalated',
      formula: 'AND(is_escalated = true, ISBLANK(escalated_to_id))'
    },
    {
      name: 'ContactMustBelongToAccount',
      errorMessage: 'Contact must belong to the selected Account',
      formula: 'AND(NOT(ISBLANK(contact_id)), NOT(ISBLANK(account_id)))'
    },
    {
      name: 'ResolutionCategoryRequired',
      errorMessage: 'resolution category is required when case is resolved',
      formula: 'AND(status = "Resolved", ISBLANK(resolution_category))'
    },
    {
      name: 'RootCauseRequired',
      errorMessage: 'Root cause is required for high priority cases when resolved',
      formula: 'AND(status = "Resolved", priority IN ("Critical", "High"), ISBLANK(root_cause))'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Case Information',
        columns: 2,
        fields: ['case_number', 'subject', 'status', 'priority', 'severity', 'type', 'origin']
      },
      {
        label: 'Related Records',
        columns: 2,
        fields: ['account_id', 'contact_id', 'contract_id', 'product_id', 'asset_id', 'parent_case_id']
      },
      {
        label: 'Assignment',
        columns: 2,
        fields: ['owner_id', 'assigned_to_queue_id']
      },
      {
        label: 'SLA Management',
        columns: 2,
        fields: ['sla_level', 'response_due_date', 'resolution_due_date', 'first_response_time', 'actual_resolution_time', 'response_time_minutes', 'resolution_time_minutes', 'is_sla_violated', 'sla_violation_type']
      },
      {
        label: 'Escalation',
        columns: 2,
        fields: ['is_escalated', 'escalated_date', 'escalated_to_id', 'escalation_reason', 'escalation_level']
      },
      {
        label: 'resolution',
        columns: 1,
        fields: ['resolution', 'root_cause', 'resolution_category', 'work_around_provided']
      },
      {
        label: 'Customer Satisfaction',
        columns: 2,
        fields: ['customer_satisfaction', 'satisfaction_score', 'customer_feedback', 'csat_survey_date']
      },
      {
        label: 'Case History',
        columns: 2,
        fields: ['closed_date', 'reopened_date', 'reopen_count']
      },
      {
        label: 'AI Smart Routing',
        columns: 1,
        fields: ['ai_auto_category', 'ai_suggested_assignee_id', 'ai_related_knowledge', 'ai_suggested_solution', 'ai_sentiment_analysis', 'ai_urgency_score', 'ai_keywords']
      },
      {
        label: 'description',
        columns: 1,
        fields: ['description']
      }
    ]
  }
};

export default Case;

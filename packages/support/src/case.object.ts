
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
    CaseNumber: {
      type: 'autonumber',
      label: 'Case Number',
      format: 'CASE-{YYYY}-{0000}',
      readonly: true,
      searchable: true
    },
    Subject: {
      type: 'text',
      label: 'Subject',
      required: true,
      searchable: true,
      maxLength: 255
    },
    Description: {
      type: 'textarea',
      label: 'Description',
      required: true,
      maxLength: 32000,
      searchable: true
    },
    Status: {
      type: 'select',
      label: 'Status',
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
    Priority: {
      type: 'select',
      label: 'Priority',
      required: true,
      defaultValue: 'Medium',
      options: [
        { label: '🔴 Critical', value: 'Critical' },
        { label: '🟠 High', value: 'High' },
        { label: '🟡 Medium', value: 'Medium' },
        { label: '🟢 Low', value: 'Low' }
      ]
    },
    Severity: {
      type: 'select',
      label: 'Severity',
      options: [
        { label: 'S1 - Critical Impact', value: 'S1' },
        { label: 'S2 - High Impact', value: 'S2' },
        { label: 'S3 - Medium Impact', value: 'S3' },
        { label: 'S4 - Low Impact', value: 'S4' }
      ]
    },
    Type: {
      type: 'select',
      label: 'Case Type',
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
    Origin: {
      type: 'select',
      label: 'Origin Channel',
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
    AccountId: {
      type: 'lookup',
      label: 'Account',
      reference: 'Account',
      required: true
    },
    ContactId: {
      type: 'lookup',
      label: 'Contact',
      reference: 'Contact'
    },
    ContractId: {
      type: 'lookup',
      label: 'Contract',
      reference: 'Contract',
      description: 'Service contract'
    },
    ProductId: {
      type: 'lookup',
      label: 'Product',
      reference: 'Product'
    },
    AssetId: {
      type: 'lookup',
      label: 'Asset',
      reference: 'Asset',
      description: 'Related asset or equipment'
    },
    ParentCaseId: {
      type: 'lookup',
      label: 'Parent Case',
      reference: 'Case',
      description: 'Parent case if this is a sub-case'
    },
    // Assignment
    OwnerId: {
      type: 'lookup',
      label: 'Owner',
      reference: 'User',
      required: true
    },
    AssignedToQueueId: {
      type: 'lookup',
      label: 'Queue',
      reference: 'Queue',
      description: 'Support team queue'
    },
    // SLA Management
    SLALevel: {
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
    ResponseDueDate: {
      type: 'datetime',
      label: 'Response Due',
      readonly: true,
      description: 'Auto-calculated based on SLA'
    },
    ResolutionDueDate: {
      type: 'datetime',
      label: 'Resolution Due',
      readonly: true,
      description: 'Auto-calculated based on SLA'
    },
    FirstResponseTime: {
      type: 'datetime',
      label: 'First Response Time',
      readonly: true
    },
    ActualResolutionTime: {
      type: 'datetime',
      label: 'Actual Resolution Time',
      readonly: true
    },
    ResponseTimeMinutes: {
      type: 'number',
      label: 'Response Time (Minutes)',
      precision: 0,
      readonly: true
    },
    ResolutionTimeMinutes: {
      type: 'number',
      label: 'Resolution Time (Minutes)',
      precision: 0,
      readonly: true
    },
    IsSLAViolated: {
      type: 'checkbox',
      label: 'SLA Violated',
      readonly: true,
      defaultValue: false
    },
    SLAViolationType: {
      type: 'select',
      label: 'SLA Violation Type',
      readonly: true,
      options: [
        { label: 'Response Time Violation', value: 'Response' },
        { label: 'Resolution Time Violation', value: 'Resolution' },
        { label: 'Both', value: 'Both' }
      ]
    },
    // Escalation
    IsEscalated: {
      type: 'checkbox',
      label: 'Escalated',
      defaultValue: false
    },
    EscalatedDate: {
      type: 'datetime',
      label: 'Escalated Date',
      readonly: true
    },
    EscalatedToId: {
      type: 'lookup',
      label: 'Escalated To',
      reference: 'User'
    },
    EscalationReason: {
      type: 'textarea',
      label: 'Escalation Reason',
      maxLength: 2000
    },
    EscalationLevel: {
      type: 'number',
      label: 'Escalation Level',
      precision: 0,
      defaultValue: 0,
      readonly: true,
      description: 'Number of times escalated'
    },
    // Resolution
    Resolution: {
      type: 'textarea',
      label: 'Resolution',
      maxLength: 32000,
      searchable: true
    },
    RootCause: {
      type: 'textarea',
      label: 'Root Cause',
      maxLength: 5000
    },
    ResolutionCategory: {
      type: 'select',
      label: 'Resolution Category',
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
    WorkAroundProvided: {
      type: 'checkbox',
      label: 'Workaround Provided',
      defaultValue: false
    },
    // Customer Satisfaction (CSAT)
    CustomerSatisfaction: {
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
    SatisfactionScore: {
      type: 'number',
      label: 'CSAT Score',
      precision: 0,
      min: 1,
      max: 5,
      readonly: true,
      description: 'Customer satisfaction rating (1-5)'
    },
    CustomerFeedback: {
      type: 'textarea',
      label: 'Customer Feedback',
      maxLength: 5000,
      readonly: true
    },
    CSATSurveyDate: {
      type: 'datetime',
      label: 'CSAT Survey Date',
      readonly: true
    },
    // Timestamps
    ClosedDate: {
      type: 'datetime',
      label: 'Closed Date',
      readonly: true
    },
    ReopenedDate: {
      type: 'datetime',
      label: 'Reopened Date',
      readonly: true
    },
    ReopenCount: {
      type: 'number',
      label: 'Reopen Count',
      precision: 0,
      defaultValue: 0,
      readonly: true
    },
    // AI Enhancement Fields
    AIAutoCategory: {
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
    AISuggestedAssigneeId: {
      type: 'lookup',
      label: 'AI Suggested Assignee',
      reference: 'User',
      readonly: true,
      description: 'AI-recommended agent based on skills and availability'
    },
    AIRelatedKnowledge: {
      type: 'text',
      label: 'AI Related Knowledge',
      readonly: true,
      maxLength: 500,
      description: 'Related knowledge base article IDs'
    },
    AISuggestedSolution: {
      type: 'textarea',
      label: 'AI Suggested Solution',
      readonly: true,
      maxLength: 5000,
      description: 'AI-generated solution based on knowledge base'
    },
    AISentimentAnalysis: {
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
    AIUrgencyScore: {
      type: 'number',
      label: 'AI Urgency Score',
      precision: 0,
      min: 0,
      max: 100,
      readonly: true,
      description: 'AI-calculated urgency score (0-100)'
    },
    AIKeywords: {
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
      foreignKey: 'CaseId',
      label: 'Case Comments'
    },
    {
      name: 'Activities',
      type: 'hasMany',
      object: 'Activity',
      foreignKey: 'WhatId',
      label: 'Activities'
    },
    {
      name: 'ChildCases',
      type: 'hasMany',
      object: 'Case',
      foreignKey: 'ParentCaseId',
      label: 'Child Cases'
    },
    {
      name: 'SLAHistory',
      type: 'hasMany',
      object: 'SLAHistory',
      foreignKey: 'CaseId',
      label: 'SLA History'
    }
  ],
  listViews: [
    {
      name: 'AllCases',
      label: 'All Cases',
      filters: [],
      columns: ['CaseNumber', 'Subject', 'AccountId', 'Priority', 'Status', 'OwnerId', 'CreatedDate'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'MyCases',
      label: 'My Cases',
      filters: [
        ['OwnerId', '=', '$currentUser'],
        ['Status', 'not in', ['Closed']]
      ],
      columns: ['CaseNumber', 'Subject', 'AccountId', 'Priority', 'Status', 'ResolutionDueDate'],
      sort: [['Priority', 'desc'], ['ResolutionDueDate', 'asc']]
    },
    {
      name: 'TeamQueue',
      label: 'Team Queue',
      filters: [
        ['AssignedToQueueId', '!=', null],
        ['Status', 'not in', ['Closed', 'Resolved']]
      ],
      columns: ['CaseNumber', 'Subject', 'AccountId', 'Priority', 'Status', 'AssignedToQueueId', 'CreatedDate'],
      sort: [['Priority', 'desc'], ['CreatedDate', 'asc']]
    },
    {
      name: 'OpenCases',
      label: 'Open',
      filters: [
        ['Status', 'not in', ['Closed', 'Resolved']]
      ],
      columns: ['CaseNumber', 'Subject', 'AccountId', 'Priority', 'Status', 'OwnerId', 'CreatedDate'],
      sort: [['CreatedDate', 'asc']]
    },
    {
      name: 'HighPriority',
      label: 'High Priority',
      filters: [
        ['Priority', 'in', ['Critical', 'High']],
        ['Status', 'not in', ['Closed', 'Resolved']]
      ],
      columns: ['CaseNumber', 'Subject', 'AccountId', 'Priority', 'Status', 'ResolutionDueDate', 'OwnerId'],
      sort: [['Priority', 'desc']]
    },
    {
      name: 'EscalatedCases',
      label: 'Escalated',
      filters: [
        ['IsEscalated', '=', true],
        ['Status', 'not in', ['Closed', 'Resolved']]
      ],
      columns: ['CaseNumber', 'Subject', 'AccountId', 'Priority', 'EscalatedDate', 'EscalatedToId', 'OwnerId'],
      sort: [['EscalatedDate', 'desc']]
    },
    {
      name: 'SLAViolations',
      label: 'SLA Violations',
      filters: [
        ['IsSLAViolated', '=', true]
      ],
      columns: ['CaseNumber', 'Subject', 'AccountId', 'SLALevel', 'SLAViolationType', 'ResolutionDueDate', 'OwnerId'],
      sort: [['ResolutionDueDate', 'asc']]
    },
    {
      name: 'TodayClosed',
      label: 'Today Closed',
      filters: [
        ['Status', '=', 'Closed'],
        ['ClosedDate', 'today', null]
      ],
      columns: ['CaseNumber', 'Subject', 'AccountId', 'ResolutionTimeMinutes', 'CustomerSatisfaction', 'ClosedDate'],
      sort: [['ClosedDate', 'desc']]
    },
    {
      name: 'RecentlyClosed',
      label: 'Recently Closed',
      filters: [
        ['Status', '=', 'Closed'],
        ['ClosedDate', 'last_n_days', 30]
      ],
      columns: ['CaseNumber', 'Subject', 'AccountId', 'ResolutionTimeMinutes', 'CustomerSatisfaction', 'ClosedDate'],
      sort: [['ClosedDate', 'desc']]
    },
    {
      name: 'WaitingOnCustomer',
      label: 'Waiting on Customer',
      filters: [
        ['Status', '=', 'Waiting on Customer']
      ],
      columns: ['CaseNumber', 'Subject', 'AccountId', 'ContactId', 'ModifiedDate', 'OwnerId'],
      sort: [['ModifiedDate', 'asc']]
    },
    {
      name: 'UnassignedCases',
      label: 'Unassigned',
      filters: [
        ['AssignedToQueueId', '=', null],
        ['Status', '=', 'New']
      ],
      columns: ['CaseNumber', 'Subject', 'AccountId', 'Priority', 'Origin', 'CreatedDate', 'AIUrgencyScore'],
      sort: [['AIUrgencyScore', 'desc'], ['CreatedDate', 'asc']]
    }
  ],
  validationRules: [
    {
      name: 'ResolutionRequiredWhenResolved',
      errorMessage: 'Resolution is required when status is Resolved',
      formula: 'AND(Status = "Resolved", ISBLANK(Resolution))'
    },
    {
      name: 'ClosedCaseReadOnly',
      errorMessage: 'Closed cases cannot be modified',
      formula: 'AND(PRIORVALUE(Status) = "Closed", Status != "Closed", NOT(ISNEW()))'
    },
    {
      name: 'EscalationReasonRequired',
      errorMessage: 'Escalation reason is required when escalating a case',
      formula: 'AND(IsEscalated = true, ISBLANK(EscalationReason))'
    },
    {
      name: 'EscalatedToRequired',
      errorMessage: 'Escalated To user is required when case is escalated',
      formula: 'AND(IsEscalated = true, ISBLANK(EscalatedToId))'
    },
    {
      name: 'ContactMustBelongToAccount',
      errorMessage: 'Contact must belong to the selected Account',
      formula: 'AND(NOT(ISBLANK(ContactId)), NOT(ISBLANK(AccountId)))'
    },
    {
      name: 'ResolutionCategoryRequired',
      errorMessage: 'Resolution category is required when case is resolved',
      formula: 'AND(Status = "Resolved", ISBLANK(ResolutionCategory))'
    },
    {
      name: 'RootCauseRequired',
      errorMessage: 'Root cause is required for high priority cases when resolved',
      formula: 'AND(Status = "Resolved", Priority IN ("Critical", "High"), ISBLANK(RootCause))'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Case Information',
        columns: 2,
        fields: ['CaseNumber', 'Subject', 'Status', 'Priority', 'Severity', 'Type', 'Origin']
      },
      {
        label: 'Related Records',
        columns: 2,
        fields: ['AccountId', 'ContactId', 'ContractId', 'ProductId', 'AssetId', 'ParentCaseId']
      },
      {
        label: 'Assignment',
        columns: 2,
        fields: ['OwnerId', 'AssignedToQueueId']
      },
      {
        label: 'SLA Management',
        columns: 2,
        fields: ['SLALevel', 'ResponseDueDate', 'ResolutionDueDate', 'FirstResponseTime', 'ActualResolutionTime', 'ResponseTimeMinutes', 'ResolutionTimeMinutes', 'IsSLAViolated', 'SLAViolationType']
      },
      {
        label: 'Escalation',
        columns: 2,
        fields: ['IsEscalated', 'EscalatedDate', 'EscalatedToId', 'EscalationReason', 'EscalationLevel']
      },
      {
        label: 'Resolution',
        columns: 1,
        fields: ['Resolution', 'RootCause', 'ResolutionCategory', 'WorkAroundProvided']
      },
      {
        label: 'Customer Satisfaction',
        columns: 2,
        fields: ['CustomerSatisfaction', 'SatisfactionScore', 'CustomerFeedback', 'CSATSurveyDate']
      },
      {
        label: 'Case History',
        columns: 2,
        fields: ['ClosedDate', 'ReopenedDate', 'ReopenCount']
      },
      {
        label: 'AI Smart Routing',
        columns: 1,
        fields: ['AIAutoCategory', 'AISuggestedAssigneeId', 'AIRelatedKnowledge', 'AISuggestedSolution', 'AISentimentAnalysis', 'AIUrgencyScore', 'AIKeywords']
      },
      {
        label: 'Description',
        columns: 1,
        fields: ['Description']
      }
    ]
  }
};

export default Case;

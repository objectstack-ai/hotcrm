
const EscalationRule = {
  name: 'escalation_rule',
  label: 'Escalation Rule',
  labelPlural: 'Escalation Rules',
  icon: 'arrow-up',
  description: 'Rules for automatic case escalation based on SLA violations or conditions',
  enable: {
    searchable: true,
    trackHistory: true
  },
  fields: {
    // Basic Information
    Name: {
      type: 'text',
      label: 'Rule Name',
      required: true,
      maxLength: 255,
      searchable: true
    },
    Description: {
      type: 'textarea',
      label: 'Description',
      maxLength: 2000
    },
    IsActive: {
      type: 'checkbox',
      label: 'Active',
      defaultValue: true
    },
    // Trigger Conditions
    TriggerType: {
      type: 'select',
      label: 'Trigger Type',
      required: true,
      options: [
        { label: 'SLA Violation', value: 'SLAViolation' },
        { label: 'Response Time Exceeded', value: 'ResponseTime' },
        { label: 'Resolution Time Exceeded', value: 'ResolutionTime' },
        { label: 'No Activity', value: 'NoActivity' },
        { label: 'Customer Sentiment', value: 'Sentiment' },
        { label: 'Manual Trigger', value: 'Manual' }
      ]
    },
    ThresholdMinutes: {
      type: 'number',
      label: 'Threshold (Minutes)',
      precision: 0,
      min: 1,
      description: 'Time threshold for triggering escalation'
    },
    // Escalation Target
    EscalationLevel: {
      type: 'number',
      label: 'Escalation Level',
      required: true,
      precision: 0,
      min: 1,
      max: 5,
      defaultValue: 1,
      description: 'Level of escalation (1-5)'
    },
    EscalateToType: {
      type: 'select',
      label: 'Escalate To',
      required: true,
      options: [
        { label: 'User', value: 'User' },
        { label: 'Queue', value: 'Queue' },
        { label: 'Role', value: 'Role' },
        { label: 'Manager', value: 'Manager' }
      ]
    },
    EscalateToUserId: {
      type: 'lookup',
      label: 'Escalate to User',
      reference: 'User',
      description: 'Specific user to escalate to'
    },
    EscalateToQueueId: {
      type: 'lookup',
      label: 'Escalate to Queue',
      reference: 'Queue',
      description: 'Queue to escalate to'
    },
    EscalateToRoleId: {
      type: 'lookup',
      label: 'Escalate to Role',
      reference: 'Role',
      description: 'Role to escalate to (any user with this role)'
    },
    // Notification
    NotifyOriginalOwner: {
      type: 'checkbox',
      label: 'Notify Original Owner',
      defaultValue: true
    },
    NotifyEscalationTarget: {
      type: 'checkbox',
      label: 'Notify Escalation Target',
      defaultValue: true
    },
    NotifyCustomer: {
      type: 'checkbox',
      label: 'Notify Customer',
      defaultValue: false
    },
    EmailTemplateId: {
      type: 'lookup',
      label: 'Email Template',
      reference: 'EmailTemplate',
      description: 'Email template for escalation notification'
    },
    // Additional Actions
    UpdatePriority: {
      type: 'checkbox',
      label: 'Update Priority',
      defaultValue: false
    },
    NewPriority: {
      type: 'select',
      label: 'New Priority',
      options: [
        { label: 'Critical', value: 'Critical' },
        { label: 'High', value: 'High' },
        { label: 'Medium', value: 'Medium' },
        { label: 'Low', value: 'Low' }
      ]
    },
    UpdateStatus: {
      type: 'checkbox',
      label: 'Update Status',
      defaultValue: false
    },
    NewStatus: {
      type: 'select',
      label: 'New Status',
      options: [
        { label: 'New', value: 'New' },
        { label: 'Open', value: 'Open' },
        { label: 'In Progress', value: 'In Progress' },
        { label: 'Escalated', value: 'Escalated' },
        { label: 'Waiting on Customer', value: 'Waiting on Customer' }
      ]
    },
    // Filters
    ApplicableCaseTypes: {
      type: 'multiselect',
      label: 'Applicable Case Types',
      options: [
        { label: 'Problem', value: 'Problem' },
        { label: 'Question', value: 'Question' },
        { label: 'Incident', value: 'Incident' },
        { label: 'Feature Request', value: 'Feature Request' },
        { label: 'Training', value: 'Training' },
        { label: 'Maintenance', value: 'Maintenance' },
        { label: 'Other', value: 'Other' }
      ]
    },
    ApplicablePriorities: {
      type: 'multiselect',
      label: 'Applicable Priorities',
      options: [
        { label: 'Critical', value: 'Critical' },
        { label: 'High', value: 'High' },
        { label: 'Medium', value: 'Medium' },
        { label: 'Low', value: 'Low' }
      ]
    },
    // Statistics
    TimesTriggered: {
      type: 'number',
      label: 'Times Triggered',
      precision: 0,
      readonly: true,
      description: 'Number of times this rule has triggered'
    },
    LastTriggeredDate: {
      type: 'datetime',
      label: 'Last Triggered',
      readonly: true
    }
  },
  validationRules: [
    {
      name: 'EscalationTargetRequired',
      errorMessage: 'Escalation target is required based on escalate to type',
      formula: 'OR(AND(EscalateToType = "User", ISBLANK(EscalateToUserId)), AND(EscalateToType = "Queue", ISBLANK(EscalateToQueueId)), AND(EscalateToType = "Role", ISBLANK(EscalateToRoleId)))'
    },
    {
      name: 'ThresholdRequiredForTimeBased',
      errorMessage: 'Threshold is required for time-based triggers',
      formula: 'AND(TriggerType IN ("ResponseTime", "ResolutionTime", "NoActivity"), ISBLANK(ThresholdMinutes))'
    },
    {
      name: 'NewPriorityRequired',
      errorMessage: 'New priority is required when update priority is enabled',
      formula: 'AND(UpdatePriority = true, ISBLANK(NewPriority))'
    },
    {
      name: 'NewStatusRequired',
      errorMessage: 'New status is required when update status is enabled',
      formula: 'AND(UpdateStatus = true, ISBLANK(NewStatus))'
    }
  ],
  listViews: [
    {
      name: 'AllRules',
      label: 'All Escalation Rules',
      filters: [],
      columns: ['Name', 'TriggerType', 'EscalationLevel', 'EscalateToType', 'IsActive', 'TimesTriggered'],
      sort: [['EscalationLevel', 'asc']]
    },
    {
      name: 'ActiveRules',
      label: 'Active Rules',
      filters: [
        ['IsActive', '=', true]
      ],
      columns: ['Name', 'TriggerType', 'EscalationLevel', 'EscalateToType', 'TimesTriggered', 'LastTriggeredDate'],
      sort: [['EscalationLevel', 'asc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Rule Information',
        columns: 2,
        fields: ['Name', 'Description', 'IsActive']
      },
      {
        label: 'Trigger Conditions',
        columns: 2,
        fields: ['TriggerType', 'ThresholdMinutes', 'EscalationLevel']
      },
      {
        label: 'Escalation Target',
        columns: 2,
        fields: ['EscalateToType', 'EscalateToUserId', 'EscalateToQueueId', 'EscalateToRoleId']
      },
      {
        label: 'Notifications',
        columns: 2,
        fields: ['NotifyOriginalOwner', 'NotifyEscalationTarget', 'NotifyCustomer', 'EmailTemplateId']
      },
      {
        label: 'Additional Actions',
        columns: 2,
        fields: ['UpdatePriority', 'NewPriority', 'UpdateStatus', 'NewStatus']
      },
      {
        label: 'Filters',
        columns: 2,
        fields: ['ApplicableCaseTypes', 'ApplicablePriorities']
      },
      {
        label: 'Statistics',
        columns: 2,
        fields: ['TimesTriggered', 'LastTriggeredDate']
      }
    ]
  }
};

export default EscalationRule;

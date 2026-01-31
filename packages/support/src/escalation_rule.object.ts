
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
    name: {
      type: 'text',
      label: 'Rule name',
      required: true,
      maxLength: 255,
      searchable: true
    },
    description: {
      type: 'textarea',
      label: 'description',
      maxLength: 2000
    },
    is_active: {
      type: 'checkbox',
      label: 'Active',
      defaultValue: true
    },
    // Trigger Conditions
    trigger_type: {
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
    threshold_minutes: {
      type: 'number',
      label: 'Threshold (Minutes)',
      precision: 0,
      min: 1,
      description: 'Time threshold for triggering escalation'
    },
    // Escalation Target
    escalation_level: {
      type: 'number',
      label: 'Escalation Level',
      required: true,
      precision: 0,
      min: 1,
      max: 5,
      defaultValue: 1,
      description: 'Level of escalation (1-5)'
    },
    escalate_to_type: {
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
    escalate_to_user_id: {
      type: 'lookup',
      label: 'Escalate to User',
      reference: 'User',
      description: 'Specific user to escalate to'
    },
    escalate_to_queue_id: {
      type: 'lookup',
      label: 'Escalate to Queue',
      reference: 'Queue',
      description: 'Queue to escalate to'
    },
    escalate_to_role_id: {
      type: 'lookup',
      label: 'Escalate to Role',
      reference: 'Role',
      description: 'Role to escalate to (any user with this role)'
    },
    // Notification
    notify_original_owner: {
      type: 'checkbox',
      label: 'Notify Original Owner',
      defaultValue: true
    },
    notify_escalation_target: {
      type: 'checkbox',
      label: 'Notify Escalation Target',
      defaultValue: true
    },
    notify_customer: {
      type: 'checkbox',
      label: 'Notify Customer',
      defaultValue: false
    },
    email_template_id: {
      type: 'lookup',
      label: 'Email Template',
      reference: 'EmailTemplate',
      description: 'Email template for escalation notification'
    },
    // Additional Actions
    update_priority: {
      type: 'checkbox',
      label: 'Update Priority',
      defaultValue: false
    },
    new_priority: {
      type: 'select',
      label: 'New Priority',
      options: [
        { label: 'Critical', value: 'Critical' },
        { label: 'High', value: 'High' },
        { label: 'Medium', value: 'Medium' },
        { label: 'Low', value: 'Low' }
      ]
    },
    update_status: {
      type: 'checkbox',
      label: 'Update Status',
      defaultValue: false
    },
    new_status: {
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
    applicable_case_types: {
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
    applicable_priorities: {
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
    times_triggered: {
      type: 'number',
      label: 'Times Triggered',
      precision: 0,
      readonly: true,
      description: 'Number of times this rule has triggered'
    },
    last_triggered_date: {
      type: 'datetime',
      label: 'Last Triggered',
      readonly: true
    }
  },
  validationRules: [
    {
      name: 'EscalationTargetRequired',
      errorMessage: 'Escalation target is required based on escalate to type',
      formula: 'OR(AND(escalate_to_type = "User", ISBLANK(escalate_to_user_id)), AND(escalate_to_type = "Queue", ISBLANK(escalate_to_queue_id)), AND(escalate_to_type = "Role", ISBLANK(escalate_to_role_id)))'
    },
    {
      name: 'ThresholdRequiredForTimeBased',
      errorMessage: 'Threshold is required for time-based triggers',
      formula: 'AND(trigger_type IN ("ResponseTime", "ResolutionTime", "NoActivity"), ISBLANK(threshold_minutes))'
    },
    {
      name: 'NewPriorityRequired',
      errorMessage: 'New priority is required when update priority is enabled',
      formula: 'AND(update_priority = true, ISBLANK(new_priority))'
    },
    {
      name: 'NewStatusRequired',
      errorMessage: 'New status is required when update status is enabled',
      formula: 'AND(update_status = true, ISBLANK(new_status))'
    }
  ],
  listViews: [
    {
      name: 'AllRules',
      label: 'All Escalation Rules',
      filters: [],
      columns: ['name', 'trigger_type', 'escalation_level', 'escalate_to_type', 'is_active', 'times_triggered'],
      sort: [['escalation_level', 'asc']]
    },
    {
      name: 'ActiveRules',
      label: 'Active Rules',
      filters: [
        ['is_active', '=', true]
      ],
      columns: ['name', 'trigger_type', 'escalation_level', 'escalate_to_type', 'times_triggered', 'last_triggered_date'],
      sort: [['escalation_level', 'asc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Rule Information',
        columns: 2,
        fields: ['name', 'description', 'is_active']
      },
      {
        label: 'Trigger Conditions',
        columns: 2,
        fields: ['trigger_type', 'threshold_minutes', 'escalation_level']
      },
      {
        label: 'Escalation Target',
        columns: 2,
        fields: ['escalate_to_type', 'escalate_to_user_id', 'escalate_to_queue_id', 'escalate_to_role_id']
      },
      {
        label: 'Notifications',
        columns: 2,
        fields: ['notify_original_owner', 'notify_escalation_target', 'notify_customer', 'email_template_id']
      },
      {
        label: 'Additional Actions',
        columns: 2,
        fields: ['update_priority', 'new_priority', 'update_status', 'new_status']
      },
      {
        label: 'Filters',
        columns: 2,
        fields: ['applicable_case_types', 'applicable_priorities']
      },
      {
        label: 'Statistics',
        columns: 2,
        fields: ['times_triggered', 'last_triggered_date']
      }
    ]
  }
};

export default EscalationRule;

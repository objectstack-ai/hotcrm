
const Queue = {
  name: 'queue',
  label: 'Support Queue',
  labelPlural: 'Support Queues',
  icon: 'inbox',
  description: 'Support team queues for case routing and assignment',
  enable: {
    searchable: true,
    trackHistory: true
  },
  fields: {
    // Basic Information
    name: {
      type: 'text',
      label: 'Queue name',
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
    // Queue Type
    queue_type: {
      type: 'select',
      label: 'Queue Type',
      required: true,
      options: [
        { label: '🎯 General Support', value: 'General' },
        { label: '🔧 Technical Support', value: 'Technical' },
        { label: '💳 Billing & Payments', value: 'Billing' },
        { label: '📦 Product Support', value: 'Product' },
        { label: '⭐ VIP Support', value: 'VIP' },
        { label: '🌍 Regional Support', value: 'Regional' },
        { label: '🎓 Training & Onboarding', value: 'Training' },
        { label: '🔄 Escalation', value: 'Escalation' }
      ]
    },
    // Routing Configuration
    routing_method: {
      type: 'select',
      label: 'Routing Method',
      required: true,
      defaultValue: 'RoundRobin',
      options: [
        { label: '🔄 Round Robin', value: 'RoundRobin' },
        { label: '⚖️ Load Balanced', value: 'LoadBalanced' },
        { label: '🎯 Skill Based', value: 'SkillBased' },
        { label: '👤 Manual Assignment', value: 'Manual' },
        { label: '🤖 AI Powered', value: 'AI' }
      ]
    },
    max_cases_per_agent: {
      type: 'number',
      label: 'Max Cases Per Agent',
      precision: 0,
      min: 1,
      defaultValue: 50,
      description: 'Maximum active cases per agent for load balancing'
    },
    // Priority and SLA
    default_priority: {
      type: 'select',
      label: 'Default Priority',
      defaultValue: 'Medium',
      options: [
        { label: 'Critical', value: 'Critical' },
        { label: 'High', value: 'High' },
        { label: 'Medium', value: 'Medium' },
        { label: 'Low', value: 'Low' }
      ]
    },
    sla_template_id: {
      type: 'lookup',
      label: 'SLA Template',
      reference: 'SLATemplate',
      description: 'Default SLA template for cases in this queue'
    },
    // Auto Assignment
    enable_auto_assignment: {
      type: 'checkbox',
      label: 'Enable Auto Assignment',
      defaultValue: true
    },
    assignment_delay_minutes: {
      type: 'number',
      label: 'Assignment Delay (Minutes)',
      precision: 0,
      min: 0,
      defaultValue: 0,
      description: 'Delay before auto-assignment (0 for immediate)'
    },
    // Overflow Management
    enable_overflow: {
      type: 'checkbox',
      label: 'Enable Overflow',
      defaultValue: false
    },
    overflow_queue_id: {
      type: 'lookup',
      label: 'Overflow Queue',
      reference: 'Queue',
      description: 'Queue to route cases when this queue is at capacity'
    },
    overflow_threshold: {
      type: 'number',
      label: 'Overflow Threshold',
      precision: 0,
      min: 1,
      description: 'Number of pending cases that triggers overflow'
    },
    // Business Hours
    business_hours_id: {
      type: 'lookup',
      label: 'Business Hours',
      reference: 'BusinessHours',
      description: 'Operating hours for this queue'
    },
    out_of_hours_behavior: {
      type: 'select',
      label: 'Out of Hours Behavior',
      defaultValue: 'Queue',
      options: [
        { label: 'Queue for Next Business Day', value: 'Queue' },
        { label: 'Route to 24/7 Queue', value: 'Route24x7' },
        { label: 'Auto-Reply Only', value: 'AutoReply' }
      ]
    },
    out_of_hours_queue_id: {
      type: 'lookup',
      label: 'Out of Hours Queue',
      reference: 'Queue',
      description: '24/7 queue for after-hours cases'
    },
    // Email Integration
    email_address: {
      type: 'email',
      label: 'Queue Email',
      description: 'Email address for case submission to this queue'
    },
    email_to_case: {
      type: 'checkbox',
      label: 'Email to Case',
      defaultValue: false
    },
    auto_response_template: {
      type: 'text',
      label: 'Auto Response Template',
      maxLength: 255,
      description: 'Email template for automatic acknowledgment'
    },
    // Statistics
    pending_cases: {
      type: 'number',
      label: 'Pending Cases',
      precision: 0,
      readonly: true,
      description: 'Number of unassigned cases in queue'
    },
    active_cases: {
      type: 'number',
      label: 'Active Cases',
      precision: 0,
      readonly: true,
      description: 'Number of active assigned cases'
    },
    total_members: {
      type: 'number',
      label: 'Total Members',
      precision: 0,
      readonly: true,
      description: 'Number of agents in this queue'
    },
    average_wait_time: {
      type: 'number',
      label: 'Avg Wait Time (Minutes)',
      precision: 2,
      readonly: true,
      description: 'Average time cases wait before assignment'
    },
    average_resolution_time: {
      type: 'number',
      label: 'Avg Resolution Time (Minutes)',
      precision: 2,
      readonly: true,
      description: 'Average time to resolve cases in this queue'
    }
  },
  relationships: [
    {
      name: 'QueueMembers',
      type: 'hasMany',
      object: 'QueueMember',
      foreignKey: 'queue_id',
      label: 'Queue Members'
    },
    {
      name: 'Cases',
      type: 'hasMany',
      object: 'Case',
      foreignKey: 'assigned_to_queue_id',
      label: 'Cases'
    },
    {
      name: 'RoutingRules',
      type: 'hasMany',
      object: 'RoutingRule',
      foreignKey: 'queue_id',
      label: 'Routing Rules'
    }
  ],
  validationRules: [
    {
      name: 'OverflowQueueRequired',
      errorMessage: 'Overflow queue is required when overflow is enabled',
      formula: 'AND(enable_overflow = true, ISBLANK(overflow_queue_id))'
    },
    {
      name: 'OverflowThresholdRequired',
      errorMessage: 'Overflow threshold is required when overflow is enabled',
      formula: 'AND(enable_overflow = true, ISBLANK(overflow_threshold))'
    },
    {
      name: 'NoSelfOverflow',
      errorMessage: 'Queue cannot overflow to itself',
      formula: 'overflow_queue_id = Id'
    },
    {
      name: 'OutOfHoursQueueRequired',
      errorMessage: 'Out of hours queue is required when routing to 24/7 queue',
      formula: 'AND(out_of_hours_behavior = "Route24x7", ISBLANK(out_of_hours_queue_id))'
    },
    {
      name: 'EmailToCaseRequiresEmail',
      errorMessage: 'Email address is required when Email to Case is enabled',
      formula: 'AND(email_to_case = true, ISBLANK(email_address))'
    }
  ],
  listViews: [
    {
      name: 'AllQueues',
      label: 'All Queues',
      filters: [],
      columns: ['name', 'queue_type', 'routing_method', 'pending_cases', 'active_cases', 'total_members', 'is_active'],
      sort: [['name', 'asc']]
    },
    {
      name: 'ActiveQueues',
      label: 'Active Queues',
      filters: [
        ['is_active', '=', true]
      ],
      columns: ['name', 'queue_type', 'pending_cases', 'active_cases', 'average_wait_time', 'average_resolution_time'],
      sort: [['pending_cases', 'desc']]
    },
    {
      name: 'WithPendingCases',
      label: 'With Pending Cases',
      filters: [
        ['pending_cases', '>', 0],
        ['is_active', '=', true]
      ],
      columns: ['name', 'queue_type', 'pending_cases', 'total_members', 'average_wait_time'],
      sort: [['pending_cases', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Queue Information',
        columns: 2,
        fields: ['name', 'description', 'queue_type', 'is_active']
      },
      {
        label: 'Routing Configuration',
        columns: 2,
        fields: ['routing_method', 'max_cases_per_agent', 'enable_auto_assignment', 'assignment_delay_minutes']
      },
      {
        label: 'Priority & SLA',
        columns: 2,
        fields: ['default_priority', 'sla_template_id']
      },
      {
        label: 'Overflow Management',
        columns: 2,
        fields: ['enable_overflow', 'overflow_queue_id', 'overflow_threshold']
      },
      {
        label: 'Business Hours',
        columns: 2,
        fields: ['business_hours_id', 'out_of_hours_behavior', 'out_of_hours_queue_id']
      },
      {
        label: 'Email Integration',
        columns: 2,
        fields: ['email_address', 'email_to_case', 'auto_response_template']
      },
      {
        label: 'Queue Statistics',
        columns: 3,
        fields: ['pending_cases', 'active_cases', 'total_members', 'average_wait_time', 'average_resolution_time']
      }
    ]
  }
};

export default Queue;

import type { ObjectSchema } from '@objectstack/spec/data';

const Queue: ObjectSchema = {
  name: 'queue',
  label: 'Support Queue',
  labelPlural: 'Support Queues',
  icon: 'inbox',
  description: 'Support team queues for case routing and assignment',
  enable: {
    searchEnabled: true,
    trackHistory: true
  },
  fields: {
    // Basic Information
    Name: {
      type: 'text',
      label: 'Queue Name',
      required: true,
      maxLength: 255,
      searchEnabled: true
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
    // Queue Type
    QueueType: {
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
    RoutingMethod: {
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
    MaxCasesPerAgent: {
      type: 'number',
      label: 'Max Cases Per Agent',
      precision: 0,
      min: 1,
      defaultValue: 50,
      description: 'Maximum active cases per agent for load balancing'
    },
    // Priority and SLA
    DefaultPriority: {
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
    SLATemplateId: {
      type: 'lookup',
      label: 'SLA Template',
      reference: 'SLATemplate',
      description: 'Default SLA template for cases in this queue'
    },
    // Auto Assignment
    EnableAutoAssignment: {
      type: 'checkbox',
      label: 'Enable Auto Assignment',
      defaultValue: true
    },
    AssignmentDelayMinutes: {
      type: 'number',
      label: 'Assignment Delay (Minutes)',
      precision: 0,
      min: 0,
      defaultValue: 0,
      description: 'Delay before auto-assignment (0 for immediate)'
    },
    // Overflow Management
    EnableOverflow: {
      type: 'checkbox',
      label: 'Enable Overflow',
      defaultValue: false
    },
    OverflowQueueId: {
      type: 'lookup',
      label: 'Overflow Queue',
      reference: 'Queue',
      description: 'Queue to route cases when this queue is at capacity'
    },
    OverflowThreshold: {
      type: 'number',
      label: 'Overflow Threshold',
      precision: 0,
      min: 1,
      description: 'Number of pending cases that triggers overflow'
    },
    // Business Hours
    BusinessHoursId: {
      type: 'lookup',
      label: 'Business Hours',
      reference: 'BusinessHours',
      description: 'Operating hours for this queue'
    },
    OutOfHoursBehavior: {
      type: 'select',
      label: 'Out of Hours Behavior',
      defaultValue: 'Queue',
      options: [
        { label: 'Queue for Next Business Day', value: 'Queue' },
        { label: 'Route to 24/7 Queue', value: 'Route24x7' },
        { label: 'Auto-Reply Only', value: 'AutoReply' }
      ]
    },
    OutOfHoursQueueId: {
      type: 'lookup',
      label: 'Out of Hours Queue',
      reference: 'Queue',
      description: '24/7 queue for after-hours cases'
    },
    // Email Integration
    EmailAddress: {
      type: 'email',
      label: 'Queue Email',
      description: 'Email address for case submission to this queue'
    },
    EmailToCase: {
      type: 'checkbox',
      label: 'Email to Case',
      defaultValue: false
    },
    AutoResponseTemplate: {
      type: 'text',
      label: 'Auto Response Template',
      maxLength: 255,
      description: 'Email template for automatic acknowledgment'
    },
    // Statistics
    PendingCases: {
      type: 'number',
      label: 'Pending Cases',
      precision: 0,
      readonly: true,
      description: 'Number of unassigned cases in queue'
    },
    ActiveCases: {
      type: 'number',
      label: 'Active Cases',
      precision: 0,
      readonly: true,
      description: 'Number of active assigned cases'
    },
    TotalMembers: {
      type: 'number',
      label: 'Total Members',
      precision: 0,
      readonly: true,
      description: 'Number of agents in this queue'
    },
    AverageWaitTime: {
      type: 'number',
      label: 'Avg Wait Time (Minutes)',
      precision: 2,
      readonly: true,
      description: 'Average time cases wait before assignment'
    },
    AverageResolutionTime: {
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
      foreignKey: 'QueueId',
      label: 'Queue Members'
    },
    {
      name: 'Cases',
      type: 'hasMany',
      object: 'Case',
      foreignKey: 'AssignedToQueueId',
      label: 'Cases'
    },
    {
      name: 'RoutingRules',
      type: 'hasMany',
      object: 'RoutingRule',
      foreignKey: 'QueueId',
      label: 'Routing Rules'
    }
  ],
  validationRules: [
    {
      name: 'OverflowQueueRequired',
      errorMessage: 'Overflow queue is required when overflow is enabled',
      formula: 'AND(EnableOverflow = true, ISBLANK(OverflowQueueId))'
    },
    {
      name: 'OverflowThresholdRequired',
      errorMessage: 'Overflow threshold is required when overflow is enabled',
      formula: 'AND(EnableOverflow = true, ISBLANK(OverflowThreshold))'
    },
    {
      name: 'NoSelfOverflow',
      errorMessage: 'Queue cannot overflow to itself',
      formula: 'OverflowQueueId = Id'
    },
    {
      name: 'OutOfHoursQueueRequired',
      errorMessage: 'Out of hours queue is required when routing to 24/7 queue',
      formula: 'AND(OutOfHoursBehavior = "Route24x7", ISBLANK(OutOfHoursQueueId))'
    },
    {
      name: 'EmailToCaseRequiresEmail',
      errorMessage: 'Email address is required when Email to Case is enabled',
      formula: 'AND(EmailToCase = true, ISBLANK(EmailAddress))'
    }
  ],
  listViews: [
    {
      name: 'AllQueues',
      label: 'All Queues',
      filters: [],
      columns: ['Name', 'QueueType', 'RoutingMethod', 'PendingCases', 'ActiveCases', 'TotalMembers', 'IsActive'],
      sort: [['Name', 'asc']]
    },
    {
      name: 'ActiveQueues',
      label: 'Active Queues',
      filters: [
        ['IsActive', '=', true]
      ],
      columns: ['Name', 'QueueType', 'PendingCases', 'ActiveCases', 'AverageWaitTime', 'AverageResolutionTime'],
      sort: [['PendingCases', 'desc']]
    },
    {
      name: 'WithPendingCases',
      label: 'With Pending Cases',
      filters: [
        ['PendingCases', '>', 0],
        ['IsActive', '=', true]
      ],
      columns: ['Name', 'QueueType', 'PendingCases', 'TotalMembers', 'AverageWaitTime'],
      sort: [['PendingCases', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Queue Information',
        columns: 2,
        fields: ['Name', 'Description', 'QueueType', 'IsActive']
      },
      {
        label: 'Routing Configuration',
        columns: 2,
        fields: ['RoutingMethod', 'MaxCasesPerAgent', 'EnableAutoAssignment', 'AssignmentDelayMinutes']
      },
      {
        label: 'Priority & SLA',
        columns: 2,
        fields: ['DefaultPriority', 'SLATemplateId']
      },
      {
        label: 'Overflow Management',
        columns: 2,
        fields: ['EnableOverflow', 'OverflowQueueId', 'OverflowThreshold']
      },
      {
        label: 'Business Hours',
        columns: 2,
        fields: ['BusinessHoursId', 'OutOfHoursBehavior', 'OutOfHoursQueueId']
      },
      {
        label: 'Email Integration',
        columns: 2,
        fields: ['EmailAddress', 'EmailToCase', 'AutoResponseTemplate']
      },
      {
        label: 'Queue Statistics',
        columns: 3,
        fields: ['PendingCases', 'ActiveCases', 'TotalMembers', 'AverageWaitTime', 'AverageResolutionTime']
      }
    ]
  }
};

export default Queue;


const QueueMember = {
  name: 'queue_member',
  label: 'Queue Member',
  labelPlural: 'Queue Members',
  icon: 'users',
  description: 'Support agents assigned to queues',
  enable: {
    searchable: true,
    trackHistory: true
  },
  fields: {
    // Relationships
    queue_id: {
      type: 'lookup',
      label: 'Queue',
      reference: 'Queue',
      required: true
    },
    user_id: {
      type: 'lookup',
      label: 'Agent',
      reference: 'User',
      required: true
    },
    // Membership status
    is_active: {
      type: 'checkbox',
      label: 'Active',
      defaultValue: true
    },
    is_primary: {
      type: 'checkbox',
      label: 'Primary Queue',
      defaultValue: false,
      description: 'This is the agent\'s primary queue'
    },
    // Availability
    status: {
      type: 'select',
      label: 'status',
      defaultValue: 'Available',
      options: [
        { label: '✅ Available', value: 'Available' },
        { label: '🔴 Busy', value: 'Busy' },
        { label: '⏸️ On Break', value: 'On Break' },
        { label: '🍽️ At Lunch', value: 'At Lunch' },
        { label: '📚 In Training', value: 'In Training' },
        { label: '🏠 Offline', value: 'Offline' }
      ]
    },
    accept_new_cases: {
      type: 'checkbox',
      label: 'Accept New Cases',
      defaultValue: true
    },
    max_cases: {
      type: 'number',
      label: 'Max Active Cases',
      precision: 0,
      min: 1,
      defaultValue: 50,
      description: 'Maximum number of active cases'
    },
    // Assignment Priority
    assignment_priority: {
      type: 'number',
      label: 'Assignment Priority',
      precision: 0,
      min: 1,
      defaultValue: 100,
      description: 'Lower number = higher priority for assignment'
    },
    assignment_weight: {
      type: 'number',
      label: 'Assignment Weight',
      precision: 0,
      min: 1,
      max: 10,
      defaultValue: 5,
      description: 'Weight in load balancing (1-10)'
    },
    // Schedule
    joined_date: {
      type: 'date',
      label: 'Joined Date',
      defaultValue: 'TODAY()'
    },
    left_date: {
      type: 'date',
      label: 'Left Date'
    },
    // Working Hours Override
    has_custom_schedule: {
      type: 'checkbox',
      label: 'Custom Schedule',
      defaultValue: false,
      description: 'Agent has custom working hours'
    },
    custom_schedule_notes: {
      type: 'textarea',
      label: 'Schedule notes',
      maxLength: 1000
    },
    // Performance Statistics
    current_cases: {
      type: 'number',
      label: 'Current Active Cases',
      precision: 0,
      readonly: true
    },
    total_cases_handled: {
      type: 'number',
      label: 'Total Cases Handled',
      precision: 0,
      readonly: true
    },
    avg_response_time: {
      type: 'number',
      label: 'Avg Response Time (Minutes)',
      precision: 2,
      readonly: true
    },
    avg_resolution_time: {
      type: 'number',
      label: 'Avg Resolution Time (Minutes)',
      precision: 2,
      readonly: true
    },
    s_l_a_compliance_rate: {
      type: 'number',
      label: 'SLA Compliance Rate (%)',
      precision: 2,
      readonly: true
    },
    customer_satisfaction_avg: {
      type: 'number',
      label: 'Avg CSAT Score',
      precision: 2,
      readonly: true,
      description: 'Average customer satisfaction (1-5)'
    },
    // Last Assignment
    last_assigned_date: {
      type: 'datetime',
      label: 'Last Assigned',
      readonly: true,
      description: 'Last time a case was assigned to this agent'
    },
    total_assignments: {
      type: 'number',
      label: 'Total Assignments',
      precision: 0,
      readonly: true,
      description: 'Total number of cases assigned'
    },
    // Additional Info
    notes: {
      type: 'textarea',
      label: 'notes',
      maxLength: 2000
    }
  },
  validationRules: [
    {
      name: 'UniqueQueueMember',
      errorMessage: 'This agent is already a member of this queue',
      formula: 'AND(NOT(ISNEW()), EXISTS(SELECT Id FROM QueueMember WHERE queue_id = $queue_id AND user_id = $user_id AND Id != $Id))'
    },
    {
      name: 'LeftDateAfterJoined',
      errorMessage: 'Left date must be after joined date',
      formula: 'AND(NOT(ISBLANK(left_date)), left_date < joined_date)'
    },
    {
      name: 'InactiveIfLeft',
      errorMessage: 'Member must be inactive if they have left the queue',
      formula: 'AND(NOT(ISBLANK(left_date)), is_active = true)'
    },
    {
      name: 'MaxCasesPositive',
      errorMessage: 'Max cases must be greater than 0',
      formula: 'max_cases <= 0'
    }
  ],
  listViews: [
    {
      name: 'AllMembers',
      label: 'All Queue Members',
      filters: [],
      columns: ['queue_id', 'user_id', 'status', 'is_active', 'current_cases', 'max_cases', 'accept_new_cases'],
      sort: [['queue_id', 'asc'], ['user_id', 'asc']]
    },
    {
      name: 'ActiveMembers',
      label: 'Active Members',
      filters: [
        ['is_active', '=', true]
      ],
      columns: ['queue_id', 'user_id', 'status', 'current_cases', 'max_cases', 's_l_a_compliance_rate', 'customer_satisfaction_avg'],
      sort: [['queue_id', 'asc']]
    },
    {
      name: 'AvailableAgents',
      label: 'Available Agents',
      filters: [
        ['is_active', '=', true],
        ['status', '=', 'Available'],
        ['accept_new_cases', '=', true]
      ],
      columns: ['queue_id', 'user_id', 'current_cases', 'max_cases', 'avg_resolution_time', 's_l_a_compliance_rate'],
      sort: [['current_cases', 'asc']]
    },
    {
      name: 'ByQueue',
      label: 'By Queue',
      filters: [],
      columns: ['queue_id', 'user_id', 'status', 'current_cases', 'total_cases_handled', 'customer_satisfaction_avg'],
      sort: [['queue_id', 'asc'], ['customer_satisfaction_avg', 'desc']]
    },
    {
      name: 'TopPerformers',
      label: 'Top Performers',
      filters: [
        ['is_active', '=', true],
        ['total_cases_handled', '>', 10]
      ],
      columns: ['user_id', 'queue_id', 'total_cases_handled', 's_l_a_compliance_rate', 'customer_satisfaction_avg', 'avg_resolution_time'],
      sort: [['customer_satisfaction_avg', 'desc'], ['s_l_a_compliance_rate', 'desc']]
    },
    {
      name: 'AtCapacity',
      label: 'At Capacity',
      filters: [
        ['is_active', '=', true],
        ['current_cases', '>=', 'max_cases']
      ],
      columns: ['queue_id', 'user_id', 'current_cases', 'max_cases', 'status'],
      sort: [['current_cases', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Queue Membership',
        columns: 2,
        fields: ['queue_id', 'user_id', 'is_active', 'is_primary']
      },
      {
        label: 'Availability',
        columns: 2,
        fields: ['status', 'accept_new_cases', 'max_cases', 'current_cases']
      },
      {
        label: 'Assignment Settings',
        columns: 2,
        fields: ['assignment_priority', 'assignment_weight']
      },
      {
        label: 'Schedule',
        columns: 2,
        fields: ['joined_date', 'left_date', 'has_custom_schedule', 'custom_schedule_notes']
      },
      {
        label: 'Performance Metrics',
        columns: 3,
        fields: ['total_cases_handled', 'avg_response_time', 'avg_resolution_time', 's_l_a_compliance_rate', 'customer_satisfaction_avg']
      },
      {
        label: 'Assignment History',
        columns: 2,
        fields: ['last_assigned_date', 'total_assignments']
      },
      {
        label: 'Additional Information',
        columns: 1,
        fields: ['notes']
      }
    ]
  }
};

export default QueueMember;

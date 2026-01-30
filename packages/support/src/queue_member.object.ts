import type { ServiceObject } from '@objectstack/spec/data';

const QueueMember = {
  name: 'queue_member',
  label: 'Queue Member',
  labelPlural: 'Queue Members',
  icon: 'users',
  description: 'Support agents assigned to queues',
  capabilities: {
    searchable: true,
    trackHistory: true
  },
  fields: {
    // Relationships
    QueueId: {
      type: 'lookup',
      label: 'Queue',
      reference: 'Queue',
      required: true
    },
    UserId: {
      type: 'lookup',
      label: 'Agent',
      reference: 'User',
      required: true
    },
    // Membership Status
    IsActive: {
      type: 'checkbox',
      label: 'Active',
      defaultValue: true
    },
    IsPrimary: {
      type: 'checkbox',
      label: 'Primary Queue',
      defaultValue: false,
      description: 'This is the agent\'s primary queue'
    },
    // Availability
    Status: {
      type: 'select',
      label: 'Status',
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
    AcceptNewCases: {
      type: 'checkbox',
      label: 'Accept New Cases',
      defaultValue: true
    },
    MaxCases: {
      type: 'number',
      label: 'Max Active Cases',
      precision: 0,
      min: 1,
      defaultValue: 50,
      description: 'Maximum number of active cases'
    },
    // Assignment Priority
    AssignmentPriority: {
      type: 'number',
      label: 'Assignment Priority',
      precision: 0,
      min: 1,
      defaultValue: 100,
      description: 'Lower number = higher priority for assignment'
    },
    AssignmentWeight: {
      type: 'number',
      label: 'Assignment Weight',
      precision: 0,
      min: 1,
      max: 10,
      defaultValue: 5,
      description: 'Weight in load balancing (1-10)'
    },
    // Schedule
    JoinedDate: {
      type: 'date',
      label: 'Joined Date',
      defaultValue: 'TODAY()'
    },
    LeftDate: {
      type: 'date',
      label: 'Left Date'
    },
    // Working Hours Override
    HasCustomSchedule: {
      type: 'checkbox',
      label: 'Custom Schedule',
      defaultValue: false,
      description: 'Agent has custom working hours'
    },
    CustomScheduleNotes: {
      type: 'textarea',
      label: 'Schedule Notes',
      maxLength: 1000
    },
    // Performance Statistics
    CurrentCases: {
      type: 'number',
      label: 'Current Active Cases',
      precision: 0,
      readonly: true
    },
    TotalCasesHandled: {
      type: 'number',
      label: 'Total Cases Handled',
      precision: 0,
      readonly: true
    },
    AvgResponseTime: {
      type: 'number',
      label: 'Avg Response Time (Minutes)',
      precision: 2,
      readonly: true
    },
    AvgResolutionTime: {
      type: 'number',
      label: 'Avg Resolution Time (Minutes)',
      precision: 2,
      readonly: true
    },
    SLAComplianceRate: {
      type: 'number',
      label: 'SLA Compliance Rate (%)',
      precision: 2,
      readonly: true
    },
    CustomerSatisfactionAvg: {
      type: 'number',
      label: 'Avg CSAT Score',
      precision: 2,
      readonly: true,
      description: 'Average customer satisfaction (1-5)'
    },
    // Last Assignment
    LastAssignedDate: {
      type: 'datetime',
      label: 'Last Assigned',
      readonly: true,
      description: 'Last time a case was assigned to this agent'
    },
    TotalAssignments: {
      type: 'number',
      label: 'Total Assignments',
      precision: 0,
      readonly: true,
      description: 'Total number of cases assigned'
    },
    // Additional Info
    Notes: {
      type: 'textarea',
      label: 'Notes',
      maxLength: 2000
    }
  },
  validationRules: [
    {
      name: 'UniqueQueueMember',
      errorMessage: 'This agent is already a member of this queue',
      formula: 'NOT(ISNEW())'
    },
    {
      name: 'LeftDateAfterJoined',
      errorMessage: 'Left date must be after joined date',
      formula: 'AND(NOT(ISBLANK(LeftDate)), LeftDate < JoinedDate)'
    },
    {
      name: 'InactiveIfLeft',
      errorMessage: 'Member must be inactive if they have left the queue',
      formula: 'AND(NOT(ISBLANK(LeftDate)), IsActive = true)'
    },
    {
      name: 'MaxCasesPositive',
      errorMessage: 'Max cases must be greater than 0',
      formula: 'MaxCases <= 0'
    }
  ],
  listViews: [
    {
      name: 'AllMembers',
      label: 'All Queue Members',
      filters: [],
      columns: ['QueueId', 'UserId', 'Status', 'IsActive', 'CurrentCases', 'MaxCases', 'AcceptNewCases'],
      sort: [['QueueId', 'asc'], ['UserId', 'asc']]
    },
    {
      name: 'ActiveMembers',
      label: 'Active Members',
      filters: [
        ['IsActive', '=', true]
      ],
      columns: ['QueueId', 'UserId', 'Status', 'CurrentCases', 'MaxCases', 'SLAComplianceRate', 'CustomerSatisfactionAvg'],
      sort: [['QueueId', 'asc']]
    },
    {
      name: 'AvailableAgents',
      label: 'Available Agents',
      filters: [
        ['IsActive', '=', true],
        ['Status', '=', 'Available'],
        ['AcceptNewCases', '=', true]
      ],
      columns: ['QueueId', 'UserId', 'CurrentCases', 'MaxCases', 'AvgResolutionTime', 'SLAComplianceRate'],
      sort: [['CurrentCases', 'asc']]
    },
    {
      name: 'ByQueue',
      label: 'By Queue',
      filters: [],
      columns: ['QueueId', 'UserId', 'Status', 'CurrentCases', 'TotalCasesHandled', 'CustomerSatisfactionAvg'],
      sort: [['QueueId', 'asc'], ['CustomerSatisfactionAvg', 'desc']]
    },
    {
      name: 'TopPerformers',
      label: 'Top Performers',
      filters: [
        ['IsActive', '=', true],
        ['TotalCasesHandled', '>', 10]
      ],
      columns: ['UserId', 'QueueId', 'TotalCasesHandled', 'SLAComplianceRate', 'CustomerSatisfactionAvg', 'AvgResolutionTime'],
      sort: [['CustomerSatisfactionAvg', 'desc'], ['SLAComplianceRate', 'desc']]
    },
    {
      name: 'AtCapacity',
      label: 'At Capacity',
      filters: [
        ['IsActive', '=', true],
        ['CurrentCases', '>=', 'MaxCases']
      ],
      columns: ['QueueId', 'UserId', 'CurrentCases', 'MaxCases', 'Status'],
      sort: [['CurrentCases', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Queue Membership',
        columns: 2,
        fields: ['QueueId', 'UserId', 'IsActive', 'IsPrimary']
      },
      {
        label: 'Availability',
        columns: 2,
        fields: ['Status', 'AcceptNewCases', 'MaxCases', 'CurrentCases']
      },
      {
        label: 'Assignment Settings',
        columns: 2,
        fields: ['AssignmentPriority', 'AssignmentWeight']
      },
      {
        label: 'Schedule',
        columns: 2,
        fields: ['JoinedDate', 'LeftDate', 'HasCustomSchedule', 'CustomScheduleNotes']
      },
      {
        label: 'Performance Metrics',
        columns: 3,
        fields: ['TotalCasesHandled', 'AvgResponseTime', 'AvgResolutionTime', 'SLAComplianceRate', 'CustomerSatisfactionAvg']
      },
      {
        label: 'Assignment History',
        columns: 2,
        fields: ['LastAssignedDate', 'TotalAssignments']
      },
      {
        label: 'Additional Information',
        columns: 1,
        fields: ['Notes']
      }
    ]
  }
};

export default QueueMember;

import type { ServiceObject } from '@objectstack/spec/data';

const SLAMilestone = {
  name: 'sla_milestone',
  label: 'SLA Milestone',
  labelPlural: 'SLA Milestones',
  icon: 'flag-checkered',
  description: 'SLA milestone tracking for case lifecycle events',
  capabilities: {
    searchable: true,
    trackHistory: true
  },
  fields: {
    // Relationships
    CaseId: {
      type: 'lookup',
      label: 'Case',
      reference: 'Case',
      required: true
    },
    SLATemplateId: {
      type: 'lookup',
      label: 'SLA Template',
      reference: 'SLATemplate',
      required: true
    },
    // Milestone Information
    MilestoneType: {
      type: 'select',
      label: 'Milestone Type',
      required: true,
      options: [
        { label: '🎯 First Response', value: 'FirstResponse' },
        { label: '🔄 Next Response', value: 'NextResponse' },
        { label: '✅ Resolution', value: 'Resolution' },
        { label: '🔒 Closure', value: 'Closure' }
      ]
    },
    Name: {
      type: 'text',
      label: 'Milestone Name',
      required: true,
      maxLength: 255
    },
    Description: {
      type: 'text',
      label: 'Description',
      maxLength: 500
    },
    // Timing
    TargetDateTime: {
      type: 'datetime',
      label: 'Target Date/Time',
      required: true,
      description: 'When this milestone should be completed'
    },
    ActualDateTime: {
      type: 'datetime',
      label: 'Actual Date/Time',
      readonly: true,
      description: 'When this milestone was actually completed'
    },
    StartDateTime: {
      type: 'datetime',
      label: 'Start Date/Time',
      readonly: true,
      description: 'When tracking started for this milestone'
    },
    // Duration (in minutes)
    TargetDurationMinutes: {
      type: 'number',
      label: 'Target Duration (Minutes)',
      precision: 0,
      readonly: true
    },
    ActualDurationMinutes: {
      type: 'number',
      label: 'Actual Duration (Minutes)',
      precision: 0,
      readonly: true
    },
    RemainingMinutes: {
      type: 'number',
      label: 'Remaining (Minutes)',
      precision: 0,
      readonly: true
    },
    // Status
    Status: {
      type: 'select',
      label: 'Status',
      required: true,
      defaultValue: 'InProgress',
      options: [
        { label: '⏳ In Progress', value: 'InProgress' },
        { label: '✅ Completed', value: 'Completed' },
        { label: '❌ Violated', value: 'Violated' },
        { label: '⏸️ Paused', value: 'Paused' },
        { label: '🔄 Reset', value: 'Reset' }
      ]
    },
    IsViolated: {
      type: 'checkbox',
      label: 'SLA Violated',
      readonly: true,
      defaultValue: false
    },
    ViolationMinutes: {
      type: 'number',
      label: 'Violation (Minutes)',
      precision: 0,
      readonly: true,
      description: 'Minutes past target if violated'
    },
    // Warning
    WarningThresholdDateTime: {
      type: 'datetime',
      label: 'Warning Threshold',
      readonly: true,
      description: 'When warning should be triggered'
    },
    IsWarning: {
      type: 'checkbox',
      label: 'Warning',
      readonly: true,
      defaultValue: false,
      description: 'Past warning threshold'
    },
    WarningNotificationSent: {
      type: 'checkbox',
      label: 'Warning Sent',
      readonly: true,
      defaultValue: false
    },
    // Escalation
    EscalationThresholdDateTime: {
      type: 'datetime',
      label: 'Escalation Threshold',
      readonly: true
    },
    ShouldEscalate: {
      type: 'checkbox',
      label: 'Should Escalate',
      readonly: true,
      defaultValue: false
    },
    EscalationTriggered: {
      type: 'checkbox',
      label: 'Escalation Triggered',
      readonly: true,
      defaultValue: false
    },
    EscalationDate: {
      type: 'datetime',
      label: 'Escalation Date',
      readonly: true
    },
    // Business Hours Tracking
    BusinessHoursId: {
      type: 'lookup',
      label: 'Business Hours',
      reference: 'BusinessHours',
      readonly: true
    },
    BusinessMinutesElapsed: {
      type: 'number',
      label: 'Business Minutes Elapsed',
      precision: 0,
      readonly: true,
      description: 'Minutes elapsed during business hours only'
    },
    // Pause Tracking
    PausedDateTime: {
      type: 'datetime',
      label: 'Paused Date/Time',
      readonly: true
    },
    PausedByUserId: {
      type: 'lookup',
      label: 'Paused By',
      reference: 'User',
      readonly: true
    },
    PauseReason: {
      type: 'text',
      label: 'Pause Reason',
      maxLength: 500,
      readonly: true
    },
    TotalPausedMinutes: {
      type: 'number',
      label: 'Total Paused (Minutes)',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    // Completion
    CompletedByUserId: {
      type: 'lookup',
      label: 'Completed By',
      reference: 'User',
      readonly: true
    },
    CompletionNotes: {
      type: 'textarea',
      label: 'Completion Notes',
      maxLength: 2000,
      readonly: true
    },
    // Metrics
    CompliancePercentage: {
      type: 'number',
      label: 'Compliance %',
      precision: 2,
      readonly: true,
      description: 'Percentage of target time used'
    }
  },
  validationRules: [
    {
      name: 'ActualAfterStart',
      errorMessage: 'Actual date/time must be after start date/time',
      formula: 'AND(NOT(ISBLANK(ActualDateTime)), NOT(ISBLANK(StartDateTime)), ActualDateTime < StartDateTime)'
    },
    {
      name: 'CompletedRequiresActual',
      errorMessage: 'Actual date/time is required when status is Completed',
      formula: 'AND(Status = "Completed", ISBLANK(ActualDateTime))'
    }
  ],
  listViews: [
    {
      name: 'AllMilestones',
      label: 'All Milestones',
      filters: [],
      columns: ['CaseId', 'MilestoneType', 'TargetDateTime', 'Status', 'IsViolated', 'RemainingMinutes'],
      sort: [['TargetDateTime', 'asc']]
    },
    {
      name: 'InProgress',
      label: 'In Progress',
      filters: [
        ['Status', '=', 'InProgress']
      ],
      columns: ['CaseId', 'MilestoneType', 'TargetDateTime', 'RemainingMinutes', 'IsWarning'],
      sort: [['RemainingMinutes', 'asc']]
    },
    {
      name: 'AtRisk',
      label: 'At Risk',
      filters: [
        ['Status', '=', 'InProgress'],
        ['IsWarning', '=', true]
      ],
      columns: ['CaseId', 'MilestoneType', 'TargetDateTime', 'RemainingMinutes', 'WarningNotificationSent'],
      sort: [['TargetDateTime', 'asc']]
    },
    {
      name: 'Violated',
      label: 'Violated',
      filters: [
        ['IsViolated', '=', true]
      ],
      columns: ['CaseId', 'MilestoneType', 'TargetDateTime', 'ActualDateTime', 'ViolationMinutes'],
      sort: [['ViolationMinutes', 'desc']]
    },
    {
      name: 'Completed',
      label: 'Completed',
      filters: [
        ['Status', '=', 'Completed']
      ],
      columns: ['CaseId', 'MilestoneType', 'ActualDateTime', 'CompliancePercentage', 'IsViolated'],
      sort: [['ActualDateTime', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Milestone Information',
        columns: 2,
        fields: ['CaseId', 'SLATemplateId', 'MilestoneType', 'Name', 'Description', 'Status']
      },
      {
        label: 'Timing',
        columns: 3,
        fields: ['StartDateTime', 'TargetDateTime', 'ActualDateTime']
      },
      {
        label: 'Duration',
        columns: 3,
        fields: ['TargetDurationMinutes', 'ActualDurationMinutes', 'RemainingMinutes']
      },
      {
        label: 'SLA Violation',
        columns: 3,
        fields: ['IsViolated', 'ViolationMinutes', 'CompliancePercentage']
      },
      {
        label: 'Warning',
        columns: 3,
        fields: ['WarningThresholdDateTime', 'IsWarning', 'WarningNotificationSent']
      },
      {
        label: 'Escalation',
        columns: 2,
        fields: ['EscalationThresholdDateTime', 'ShouldEscalate', 'EscalationTriggered', 'EscalationDate']
      },
      {
        label: 'Business Hours',
        columns: 2,
        fields: ['BusinessHoursId', 'BusinessMinutesElapsed']
      },
      {
        label: 'Pause Tracking',
        columns: 2,
        fields: ['PausedDateTime', 'PausedByUserId', 'PauseReason', 'TotalPausedMinutes']
      },
      {
        label: 'Completion',
        columns: 2,
        fields: ['CompletedByUserId', 'CompletionNotes']
      }
    ]
  }
};

export default SLAMilestone;

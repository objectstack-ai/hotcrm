
const SLAMilestone = {
  name: 'sla_milestone',
  label: 'SLA Milestone',
  labelPlural: 'SLA Milestones',
  icon: 'flag-checkered',
  description: 'SLA milestone tracking for case lifecycle events',
  enable: {
    searchable: true,
    trackHistory: true
  },
  fields: {
    // Relationships
    case_id: {
      type: 'lookup',
      label: 'Case',
      reference: 'case',
      required: true
    },
    sla_template_id: {
      type: 'lookup',
      label: 'SLA Template',
      reference: 'SLATemplate',
      required: true
    },
    // Milestone Information
    milestone_type: {
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
    name: {
      type: 'text',
      label: 'Milestone name',
      required: true,
      maxLength: 255
    },
    description: {
      type: 'text',
      label: 'description',
      maxLength: 500
    },
    // Timing
    target_date_time: {
      type: 'datetime',
      label: 'Target Date/Time',
      required: true,
      description: 'When this milestone should be completed'
    },
    actual_date_time: {
      type: 'datetime',
      label: 'Actual Date/Time',
      readonly: true,
      description: 'When this milestone was actually completed'
    },
    start_date_time: {
      type: 'datetime',
      label: 'Start Date/Time',
      readonly: true,
      description: 'When tracking started for this milestone'
    },
    // Duration (in minutes)
    target_duration_minutes: {
      type: 'number',
      label: 'Target Duration (Minutes)',
      precision: 0,
      readonly: true
    },
    actual_duration_minutes: {
      type: 'number',
      label: 'Actual Duration (Minutes)',
      precision: 0,
      readonly: true
    },
    remaining_minutes: {
      type: 'number',
      label: 'Remaining (Minutes)',
      precision: 0,
      readonly: true
    },
    // status
    status: {
      type: 'select',
      label: 'status',
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
    is_violated: {
      type: 'checkbox',
      label: 'SLA Violated',
      readonly: true,
      defaultValue: false
    },
    violation_minutes: {
      type: 'number',
      label: 'Violation (Minutes)',
      precision: 0,
      readonly: true,
      description: 'Minutes past target if violated'
    },
    // Warning
    warning_threshold_date_time: {
      type: 'datetime',
      label: 'Warning Threshold',
      readonly: true,
      description: 'When warning should be triggered'
    },
    is_warning: {
      type: 'checkbox',
      label: 'Warning',
      readonly: true,
      defaultValue: false,
      description: 'Past warning threshold'
    },
    warning_notification_sent: {
      type: 'checkbox',
      label: 'Warning Sent',
      readonly: true,
      defaultValue: false
    },
    // Escalation
    escalation_threshold_date_time: {
      type: 'datetime',
      label: 'Escalation Threshold',
      readonly: true
    },
    should_escalate: {
      type: 'checkbox',
      label: 'Should Escalate',
      readonly: true,
      defaultValue: false
    },
    escalation_triggered: {
      type: 'checkbox',
      label: 'Escalation Triggered',
      readonly: true,
      defaultValue: false
    },
    escalation_date: {
      type: 'datetime',
      label: 'Escalation Date',
      readonly: true
    },
    // Business Hours Tracking
    business_hours_id: {
      type: 'lookup',
      label: 'Business Hours',
      reference: 'BusinessHours',
      readonly: true
    },
    business_minutes_elapsed: {
      type: 'number',
      label: 'Business Minutes Elapsed',
      precision: 0,
      readonly: true,
      description: 'Minutes elapsed during business hours only'
    },
    // Pause Tracking
    paused_date_time: {
      type: 'datetime',
      label: 'Paused Date/Time',
      readonly: true
    },
    paused_by_user_id: {
      type: 'lookup',
      label: 'Paused By',
      reference: 'User',
      readonly: true
    },
    pause_reason: {
      type: 'text',
      label: 'Pause Reason',
      maxLength: 500,
      readonly: true
    },
    total_paused_minutes: {
      type: 'number',
      label: 'Total Paused (Minutes)',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    // Completion
    completed_by_user_id: {
      type: 'lookup',
      label: 'Completed By',
      reference: 'User',
      readonly: true
    },
    completion_notes: {
      type: 'textarea',
      label: 'Completion Notes',
      maxLength: 2000,
      readonly: true
    },
    // Metrics
    compliance_percentage: {
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
      formula: 'AND(NOT(ISBLANK(actual_date_time)), NOT(ISBLANK(start_date_time)), actual_date_time < start_date_time)'
    },
    {
      name: 'CompletedRequiresActual',
      errorMessage: 'Actual date/time is required when status is Completed',
      formula: 'AND(status = "Completed", ISBLANK(actual_date_time))'
    }
  ],
  listViews: [
    {
      name: 'AllMilestones',
      label: 'All Milestones',
      filters: [],
      columns: ['case_id', 'milestone_type', 'target_date_time', 'status', 'is_violated', 'remaining_minutes'],
      sort: [['target_date_time', 'asc']]
    },
    {
      name: 'InProgress',
      label: 'In Progress',
      filters: [
        ['status', '=', 'InProgress']
      ],
      columns: ['case_id', 'milestone_type', 'target_date_time', 'remaining_minutes', 'is_warning'],
      sort: [['remaining_minutes', 'asc']]
    },
    {
      name: 'AtRisk',
      label: 'At Risk',
      filters: [
        ['status', '=', 'InProgress'],
        ['is_warning', '=', true]
      ],
      columns: ['case_id', 'milestone_type', 'target_date_time', 'remaining_minutes', 'warning_notification_sent'],
      sort: [['target_date_time', 'asc']]
    },
    {
      name: 'Violated',
      label: 'Violated',
      filters: [
        ['is_violated', '=', true]
      ],
      columns: ['case_id', 'milestone_type', 'target_date_time', 'actual_date_time', 'violation_minutes'],
      sort: [['violation_minutes', 'desc']]
    },
    {
      name: 'Completed',
      label: 'Completed',
      filters: [
        ['status', '=', 'Completed']
      ],
      columns: ['case_id', 'milestone_type', 'actual_date_time', 'compliance_percentage', 'is_violated'],
      sort: [['actual_date_time', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Milestone Information',
        columns: 2,
        fields: ['case_id', 'sla_template_id', 'milestone_type', 'name', 'description', 'status']
      },
      {
        label: 'Timing',
        columns: 3,
        fields: ['start_date_time', 'target_date_time', 'actual_date_time']
      },
      {
        label: 'Duration',
        columns: 3,
        fields: ['target_duration_minutes', 'actual_duration_minutes', 'remaining_minutes']
      },
      {
        label: 'SLA Violation',
        columns: 3,
        fields: ['is_violated', 'violation_minutes', 'compliance_percentage']
      },
      {
        label: 'Warning',
        columns: 3,
        fields: ['warning_threshold_date_time', 'is_warning', 'warning_notification_sent']
      },
      {
        label: 'Escalation',
        columns: 2,
        fields: ['escalation_threshold_date_time', 'should_escalate', 'escalation_triggered', 'escalation_date']
      },
      {
        label: 'Business Hours',
        columns: 2,
        fields: ['business_hours_id', 'business_minutes_elapsed']
      },
      {
        label: 'Pause Tracking',
        columns: 2,
        fields: ['paused_date_time', 'paused_by_user_id', 'pause_reason', 'total_paused_minutes']
      },
      {
        label: 'Completion',
        columns: 2,
        fields: ['completed_by_user_id', 'completion_notes']
      }
    ]
  }
};

export default SLAMilestone;

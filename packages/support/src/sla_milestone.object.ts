import { ObjectSchema, Field } from '@objectstack/spec/data';

export const SLAMilestone = ObjectSchema.create({
  name: 'sla_milestone',
  label: 'SLA Milestone',
  pluralLabel: 'SLA Milestones',
  icon: 'flag-checkered',
  description: 'SLA milestone tracking for case lifecycle events',

  fields: {
    case_id: Field.lookup('case', {
      label: 'Case',
      required: true
    }),
    sla_template_id: Field.lookup('SLATemplate', {
      label: 'SLA Template',
      required: true
    }),
    milestone_type: Field.select({
      label: 'Milestone Type',
      required: true,
      options: [
        {
          "label": "🎯 First Response",
          "value": "FirstResponse"
        },
        {
          "label": "🔄 Next Response",
          "value": "NextResponse"
        },
        {
          "label": "✅ Resolution",
          "value": "Resolution"
        },
        {
          "label": "🔒 Closure",
          "value": "Closure"
        }
      ]
    }),
    name: Field.text({
      label: 'Milestone name',
      required: true,
      maxLength: 255
    }),
    description: Field.text({
      label: 'description',
      maxLength: 500
    }),
    target_date_time: Field.datetime({
      label: 'Target Date/Time',
      description: 'When this milestone should be completed',
      required: true
    }),
    actual_date_time: Field.datetime({
      label: 'Actual Date/Time',
      description: 'When this milestone was actually completed',
      readonly: true
    }),
    start_date_time: Field.datetime({
      label: 'Start Date/Time',
      description: 'When tracking started for this milestone',
      readonly: true
    }),
    target_duration_minutes: Field.number({
      label: 'Target Duration (Minutes)',
      readonly: true,
      precision: 0
    }),
    actual_duration_minutes: Field.number({
      label: 'Actual Duration (Minutes)',
      readonly: true,
      precision: 0
    }),
    remaining_minutes: Field.number({
      label: 'Remaining (Minutes)',
      readonly: true,
      precision: 0
    }),
    status: Field.select({
      label: 'status',
      required: true,
      defaultValue: 'InProgress',
      options: [
        {
          "label": "⏳ In Progress",
          "value": "InProgress"
        },
        {
          "label": "✅ Completed",
          "value": "Completed"
        },
        {
          "label": "❌ Violated",
          "value": "Violated"
        },
        {
          "label": "⏸️ Paused",
          "value": "Paused"
        },
        {
          "label": "🔄 Reset",
          "value": "Reset"
        }
      ]
    }),
    is_violated: Field.boolean({
      label: 'SLA Violated',
      defaultValue: false,
      readonly: true
    }),
    violation_minutes: Field.number({
      label: 'Violation (Minutes)',
      description: 'Minutes past target if violated',
      readonly: true,
      precision: 0
    }),
    warning_threshold_date_time: Field.datetime({
      label: 'Warning Threshold',
      description: 'When warning should be triggered',
      readonly: true
    }),
    is_warning: Field.boolean({
      label: 'Warning',
      description: 'Past warning threshold',
      defaultValue: false,
      readonly: true
    }),
    warning_notification_sent: Field.boolean({
      label: 'Warning Sent',
      defaultValue: false,
      readonly: true
    }),
    escalation_threshold_date_time: Field.datetime({
      label: 'Escalation Threshold',
      readonly: true
    }),
    should_escalate: Field.boolean({
      label: 'Should Escalate',
      defaultValue: false,
      readonly: true
    }),
    escalation_triggered: Field.boolean({
      label: 'Escalation Triggered',
      defaultValue: false,
      readonly: true
    }),
    escalation_date: Field.datetime({
      label: 'Escalation Date',
      readonly: true
    }),
    business_hours_id: Field.lookup('BusinessHours', {
      label: 'Business Hours',
      readonly: true
    }),
    business_minutes_elapsed: Field.number({
      label: 'Business Minutes Elapsed',
      description: 'Minutes elapsed during business hours only',
      readonly: true,
      precision: 0
    }),
    paused_date_time: Field.datetime({
      label: 'Paused Date/Time',
      readonly: true
    }),
    paused_by_user_id: Field.lookup('users', {
      label: 'Paused By',
      readonly: true
    }),
    pause_reason: Field.text({
      label: 'Pause Reason',
      readonly: true,
      maxLength: 500
    }),
    total_paused_minutes: Field.number({
      label: 'Total Paused (Minutes)',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    completed_by_user_id: Field.lookup('users', {
      label: 'Completed By',
      readonly: true
    }),
    completion_notes: Field.textarea({
      label: 'Completion Notes',
      readonly: true,
      maxLength: 2000
    }),
    compliance_percentage: Field.number({
      label: 'Compliance %',
      description: 'Percentage of target time used',
      readonly: true,
      precision: 2
    })
  },

  enable: {
    searchable: true,
    trackHistory: true
  },
});
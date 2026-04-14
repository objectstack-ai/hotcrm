import { ObjectSchema, Field } from '@objectstack/spec/data';

export const EscalationRule = ObjectSchema.create({
  name: 'escalation_rule',
  label: 'Escalation Rule',
  pluralLabel: 'Escalation Rules',
  icon: 'arrow-up',
  description: 'Rules for automatic case escalation based on SLA violations or conditions',

  fields: {
    name: Field.text({
      label: 'Rule Name',
      required: true,
      maxLength: 255
    }),
    description: Field.textarea({
      label: 'Description',
      maxLength: 2000
    }),
    is_active: Field.boolean({
      label: 'Active',
      defaultValue: true
    }),
    trigger_type: Field.select({
      label: 'Trigger Type',
      required: true,
      options: [
        {
          "label": "SLA Violation",
          "value": "slaviolation"
        },
        {
          "label": "Response Time Exceeded",
          "value": "responsetime"
        },
        {
          "label": "Resolution Time Exceeded",
          "value": "resolutiontime"
        },
        {
          "label": "No Activity",
          "value": "noactivity"
        },
        {
          "label": "Customer Sentiment",
          "value": "sentiment"
        },
        {
          "label": "Manual Trigger",
          "value": "manual"
        }
      ]
    }),
    threshold_minutes: Field.number({
      label: 'Threshold (Minutes)',
      description: 'Time threshold for triggering escalation',
      min: 1,
      precision: 0
    }),
    escalation_level: Field.number({
      label: 'Escalation Level',
      description: 'Level of escalation (1-5)',
      required: true,
      defaultValue: 1,
      min: 1,
      max: 5,
      precision: 0
    }),
    escalate_to_type: Field.select({
      label: 'Escalate To',
      required: true,
      options: [
        {
          "label": "User",
          "value": "user"
        },
        {
          "label": "Queue",
          "value": "queue"
        },
        {
          "label": "Role",
          "value": "role"
        },
        {
          "label": "Manager",
          "value": "manager"
        }
      ]
    }),
    escalate_to_user_id: Field.lookup('users', {
      label: 'Escalate to User',
      description: 'Specific user to escalate to'
    }),
    escalate_to_queue_id: Field.lookup('queue', {
      label: 'Escalate to Queue',
      description: 'Queue to escalate to'
    }),
    escalate_to_role_id: Field.lookup('role', {
      label: 'Escalate to Role',
      description: 'Role to escalate to (any user with this role)'
    }),
    notify_original_owner: Field.boolean({
      label: 'Notify Original Owner',
      defaultValue: true
    }),
    notify_escalation_target: Field.boolean({
      label: 'Notify Escalation Target',
      defaultValue: true
    }),
    notify_customer: Field.boolean({
      label: 'Notify Customer',
      defaultValue: false
    }),
    email_template_id: Field.lookup('email_template', {
      label: 'Email Template',
      description: 'Email template for escalation notification'
    }),
    update_priority: Field.boolean({
      label: 'Update Priority',
      defaultValue: false
    }),
    new_priority: Field.select({
      label: 'New Priority',
      options: [
        {
          "label": "Critical",
          "value": "critical"
        },
        {
          "label": "High",
          "value": "high"
        },
        {
          "label": "Medium",
          "value": "medium"
        },
        {
          "label": "Low",
          "value": "low"
        }
      ]
    }),
    update_status: Field.boolean({
      label: 'Update Status',
      defaultValue: false
    }),
    new_status: Field.select({
      label: 'New Status',
      options: [
        {
          "label": "New",
          "value": "new"
        },
        {
          "label": "Open",
          "value": "open"
        },
        {
          "label": "In Progress",
          "value": "in_progress"
        },
        {
          "label": "Escalated",
          "value": "escalated"
        },
        {
          "label": "Waiting on Customer",
          "value": "waiting_on_customer"
        }
      ]
    }),
    applicable_case_types: Field.select({ label: 'Applicable Case Types', multiple: true, options: [] }),
    applicable_priorities: Field.select({ label: 'Applicable Priorities', multiple: true, options: [] }),
    times_triggered: Field.number({
      label: 'Times Triggered',
      description: 'Number of times this rule has triggered',
      readonly: true,
      precision: 0
    }),
    last_triggered_date: Field.datetime({
      label: 'Last Triggered',
      readonly: true
    })
  },

  enable: {
    searchable: true,
    trackHistory: true
  },
});
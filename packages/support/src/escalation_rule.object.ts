import { ObjectSchema, Field } from '@objectstack/spec/data';

export const EscalationRule = ObjectSchema.create({
  name: 'escalation_rule',
  label: 'Escalation Rule',
  pluralLabel: 'Escalation Rules',
  icon: 'arrow-up',
  description: 'Rules for automatic case escalation based on SLA violations or conditions',

  fields: {
    name: Field.text({
      label: 'Rule name',
      required: true,
      maxLength: 255
    }),
    description: Field.textarea({
      label: 'description',
      maxLength: 2000
    }),
    is_active: Field.checkbox({
      label: 'Active',
      defaultValue: true
    }),
    trigger_type: Field.select({
      label: 'Trigger Type',
      required: true,
      options: [
        {
          "label": "SLA Violation",
          "value": "SLAViolation"
        },
        {
          "label": "Response Time Exceeded",
          "value": "ResponseTime"
        },
        {
          "label": "Resolution Time Exceeded",
          "value": "ResolutionTime"
        },
        {
          "label": "No Activity",
          "value": "NoActivity"
        },
        {
          "label": "Customer Sentiment",
          "value": "Sentiment"
        },
        {
          "label": "Manual Trigger",
          "value": "Manual"
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
          "value": "User"
        },
        {
          "label": "Queue",
          "value": "Queue"
        },
        {
          "label": "Role",
          "value": "Role"
        },
        {
          "label": "Manager",
          "value": "Manager"
        }
      ]
    }),
    escalate_to_user_id: Field.lookup('users', {
      label: 'Escalate to User',
      description: 'Specific user to escalate to'
    }),
    escalate_to_queue_id: Field.lookup('Queue', {
      label: 'Escalate to Queue',
      description: 'Queue to escalate to'
    }),
    escalate_to_role_id: Field.lookup('Role', {
      label: 'Escalate to Role',
      description: 'Role to escalate to (any user with this role)'
    }),
    notify_original_owner: Field.checkbox({
      label: 'Notify Original Owner',
      defaultValue: true
    }),
    notify_escalation_target: Field.checkbox({
      label: 'Notify Escalation Target',
      defaultValue: true
    }),
    notify_customer: Field.checkbox({
      label: 'Notify Customer',
      defaultValue: false
    }),
    email_template_id: Field.lookup('EmailTemplate', {
      label: 'Email Template',
      description: 'Email template for escalation notification'
    }),
    update_priority: Field.checkbox({
      label: 'Update Priority',
      defaultValue: false
    }),
    new_priority: Field.select({
      label: 'New Priority',
      options: [
        {
          "label": "Critical",
          "value": "Critical"
        },
        {
          "label": "High",
          "value": "High"
        },
        {
          "label": "Medium",
          "value": "Medium"
        },
        {
          "label": "Low",
          "value": "Low"
        }
      ]
    }),
    update_status: Field.checkbox({
      label: 'Update Status',
      defaultValue: false
    }),
    new_status: Field.select({
      label: 'New Status',
      options: [
        {
          "label": "New",
          "value": "New"
        },
        {
          "label": "Open",
          "value": "Open"
        },
        {
          "label": "In Progress",
          "value": "In Progress"
        },
        {
          "label": "Escalated",
          "value": "Escalated"
        },
        {
          "label": "Waiting on Customer",
          "value": "Waiting on Customer"
        }
      ]
    }),
    applicable_case_types: /* TODO: Unknown type 'multiselect' */ null,
    applicable_priorities: /* TODO: Unknown type 'multiselect' */ null,
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
    searchEnabled: true,
    trackHistory: true
  },
});
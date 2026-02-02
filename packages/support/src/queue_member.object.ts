import { ObjectSchema, Field } from '@objectstack/spec/data';

export const QueueMember = ObjectSchema.create({
  name: 'queue_member',
  label: 'Queue Member',
  pluralLabel: 'Queue Members',
  icon: 'users',
  description: 'Support agents assigned to queues',

  fields: {
    queue_id: Field.lookup('Queue', {
      label: 'Queue',
      required: true
    }),
    user_id: Field.lookup('users', {
      label: 'Agent',
      required: true
    }),
    is_active: Field.boolean({
      label: 'Active',
      defaultValue: true
    }),
    is_primary: Field.boolean({
      label: 'Primary Queue',
      description: 'This is the agent\'s primary queue',
      defaultValue: false
    }),
    status: Field.select({
      label: 'status',
      defaultValue: 'Available',
      options: [
        {
          "label": "✅ Available",
          "value": "Available"
        },
        {
          "label": "🔴 Busy",
          "value": "Busy"
        },
        {
          "label": "⏸️ On Break",
          "value": "On Break"
        },
        {
          "label": "🍽️ At Lunch",
          "value": "At Lunch"
        },
        {
          "label": "📚 In Training",
          "value": "In Training"
        },
        {
          "label": "🏠 Offline",
          "value": "Offline"
        }
      ]
    }),
    accept_new_cases: Field.boolean({
      label: 'Accept New Cases',
      defaultValue: true
    }),
    max_cases: Field.number({
      label: 'Max Active Cases',
      description: 'Maximum number of active cases',
      defaultValue: 50,
      min: 1,
      precision: 0
    }),
    assignment_priority: Field.number({
      label: 'Assignment Priority',
      description: 'Lower number = higher priority for assignment',
      defaultValue: 100,
      min: 1,
      precision: 0
    }),
    assignment_weight: Field.number({
      label: 'Assignment Weight',
      description: 'Weight in load balancing (1-10)',
      defaultValue: 5,
      min: 1,
      max: 10,
      precision: 0
    }),
    joined_date: Field.date({
      label: 'Joined Date',
      defaultValue: 'TODAY()'
    }),
    left_date: Field.date({ label: 'Left Date' }),
    has_custom_schedule: Field.boolean({
      label: 'Custom Schedule',
      description: 'Agent has custom working hours',
      defaultValue: false
    }),
    custom_schedule_notes: Field.textarea({
      label: 'Schedule notes',
      maxLength: 1000
    }),
    current_cases: Field.number({
      label: 'Current Active Cases',
      readonly: true,
      precision: 0
    }),
    total_cases_handled: Field.number({
      label: 'Total Cases Handled',
      readonly: true,
      precision: 0
    }),
    avg_response_time: Field.number({
      label: 'Avg Response Time (Minutes)',
      readonly: true,
      precision: 2
    }),
    avg_resolution_time: Field.number({
      label: 'Avg Resolution Time (Minutes)',
      readonly: true,
      precision: 2
    }),
    sla_compliance_rate: Field.number({
      label: 'SLA Compliance Rate (%)',
      readonly: true,
      precision: 2
    }),
    customer_satisfaction_avg: Field.number({
      label: 'Avg CSAT Score',
      description: 'Average customer satisfaction (1-5)',
      readonly: true,
      precision: 2
    }),
    last_assigned_date: Field.datetime({
      label: 'Last Assigned',
      description: 'Last time a case was assigned to this agent',
      readonly: true
    }),
    total_assignments: Field.number({
      label: 'Total Assignments',
      description: 'Total number of cases assigned',
      readonly: true,
      precision: 0
    }),
    notes: Field.textarea({
      label: 'notes',
      maxLength: 2000
    })
  },

  enable: {
    searchable: true,
    trackHistory: true
  },
});
import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Queue = ObjectSchema.create({
  name: 'queue',
  label: 'Support Queue',
  pluralLabel: 'Support Queues',
  icon: 'inbox',
  description: 'Support team queues for case routing and assignment',

  fields: {
    name: Field.text({
      label: 'Queue name',
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
    queue_type: Field.select({
      label: 'Queue Type',
      required: true,
      options: [
        {
          "label": "🎯 General Support",
          "value": "General"
        },
        {
          "label": "🔧 Technical Support",
          "value": "Technical"
        },
        {
          "label": "💳 Billing & Payments",
          "value": "Billing"
        },
        {
          "label": "📦 Product Support",
          "value": "Product"
        },
        {
          "label": "⭐ VIP Support",
          "value": "VIP"
        },
        {
          "label": "🌍 Regional Support",
          "value": "Regional"
        },
        {
          "label": "🎓 Training & Onboarding",
          "value": "Training"
        },
        {
          "label": "🔄 Escalation",
          "value": "Escalation"
        }
      ]
    }),
    routing_method: Field.select({
      label: 'Routing Method',
      required: true,
      defaultValue: 'RoundRobin',
      options: [
        {
          "label": "🔄 Round Robin",
          "value": "RoundRobin"
        },
        {
          "label": "⚖️ Load Balanced",
          "value": "LoadBalanced"
        },
        {
          "label": "🎯 Skill Based",
          "value": "SkillBased"
        },
        {
          "label": "👤 Manual Assignment",
          "value": "Manual"
        },
        {
          "label": "🤖 AI Powered",
          "value": "AI"
        }
      ]
    }),
    max_cases_per_agent: Field.number({
      label: 'Max Cases Per Agent',
      description: 'Maximum active cases per agent for load balancing',
      defaultValue: 50,
      min: 1,
      precision: 0
    }),
    default_priority: Field.select({
      label: 'Default Priority',
      defaultValue: 'Medium',
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
    sla_template_id: Field.lookup('SLATemplate', {
      label: 'SLA Template',
      description: 'Default SLA template for cases in this queue'
    }),
    enable_auto_assignment: Field.checkbox({
      label: 'Enable Auto Assignment',
      defaultValue: true
    }),
    assignment_delay_minutes: Field.number({
      label: 'Assignment Delay (Minutes)',
      description: 'Delay before auto-assignment (0 for immediate)',
      defaultValue: 0,
      min: 0,
      precision: 0
    }),
    enable_overflow: Field.checkbox({
      label: 'Enable Overflow',
      defaultValue: false
    }),
    overflow_queue_id: Field.lookup('Queue', {
      label: 'Overflow Queue',
      description: 'Queue to route cases when this queue is at capacity'
    }),
    overflow_threshold: Field.number({
      label: 'Overflow Threshold',
      description: 'Number of pending cases that triggers overflow',
      min: 1,
      precision: 0
    }),
    business_hours_id: Field.lookup('BusinessHours', {
      label: 'Business Hours',
      description: 'Operating hours for this queue'
    }),
    out_of_hours_behavior: Field.select({
      label: 'Out of Hours Behavior',
      defaultValue: 'Queue',
      options: [
        {
          "label": "Queue for Next Business Day",
          "value": "Queue"
        },
        {
          "label": "Route to 24/7 Queue",
          "value": "Route24x7"
        },
        {
          "label": "Auto-Reply Only",
          "value": "AutoReply"
        }
      ]
    }),
    out_of_hours_queue_id: Field.lookup('Queue', {
      label: 'Out of Hours Queue',
      description: '24/7 queue for after-hours cases'
    }),
    email_address: Field.email({
      label: 'Queue Email',
      description: 'Email address for case submission to this queue'
    }),
    email_to_case: Field.checkbox({
      label: 'Email to Case',
      defaultValue: false
    }),
    auto_response_template: Field.text({
      label: 'Auto Response Template',
      description: 'Email template for automatic acknowledgment',
      maxLength: 255
    }),
    pending_cases: Field.number({
      label: 'Pending Cases',
      description: 'Number of unassigned cases in queue',
      readonly: true,
      precision: 0
    }),
    active_cases: Field.number({
      label: 'Active Cases',
      description: 'Number of active assigned cases',
      readonly: true,
      precision: 0
    }),
    total_members: Field.number({
      label: 'Total Members',
      description: 'Number of agents in this queue',
      readonly: true,
      precision: 0
    }),
    average_wait_time: Field.number({
      label: 'Avg Wait Time (Minutes)',
      description: 'Average time cases wait before assignment',
      readonly: true,
      precision: 2
    }),
    average_resolution_time: Field.number({
      label: 'Avg Resolution Time (Minutes)',
      description: 'Average time to resolve cases in this queue',
      readonly: true,
      precision: 2
    })
  },

  enable: {
    searchEnabled: true,
    trackHistory: true
  },
});
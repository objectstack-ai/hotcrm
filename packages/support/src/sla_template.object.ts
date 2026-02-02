import { ObjectSchema, Field } from '@objectstack/spec/data';

export const SLATemplate = ObjectSchema.create({
  name: 'sla_template',
  label: 'SLA Template',
  pluralLabel: 'SLA Templates',
  icon: 'clock',
  description: 'Service Level Agreement templates defining response and resolution time targets',

  fields: {
    name: Field.text({
      label: 'Template name',
      required: true,
      maxLength: 255
    }),
    description: Field.textarea({
      label: 'description',
      maxLength: 2000
    }),
    is_active: Field.boolean({
      label: 'Active',
      defaultValue: true
    }),
    sla_level: Field.select({
      label: 'SLA Level',
      required: true,
      options: [
        {
          "label": "🏆 Platinum",
          "value": "Platinum"
        },
        {
          "label": "🥇 Gold",
          "value": "Gold"
        },
        {
          "label": "🥈 Silver",
          "value": "Silver"
        },
        {
          "label": "🥉 Bronze",
          "value": "Bronze"
        },
        {
          "label": "📋 Standard",
          "value": "Standard"
        }
      ]
    }),
    applicable_case_types: Field.select({ label: 'Applicable Case Types', multiple: true, options: [] }),
    applicable_priorities: Field.select({ label: 'Applicable Priorities', multiple: true, options: [] }),
    first_response_time_minutes: Field.number({
      label: 'First Response Time (Minutes)',
      description: 'Time to first agent response',
      required: true,
      min: 1,
      precision: 0
    }),
    next_response_time_minutes: Field.number({
      label: 'Next Response Time (Minutes)',
      description: 'Time for subsequent responses',
      min: 1,
      precision: 0
    }),
    resolution_time_minutes: Field.number({
      label: 'Resolution Time (Minutes)',
      description: 'Time to resolve the case',
      required: true,
      min: 1,
      precision: 0
    }),
    business_hours_id: Field.lookup('BusinessHours', {
      label: 'Business Hours',
      description: 'Working hours calendar for SLA calculation',
      required: true
    }),
    warning_threshold_percent: Field.number({
      label: 'Warning Threshold (%)',
      description: 'Percentage of SLA time when warning is triggered',
      defaultValue: 80,
      min: 1,
      max: 100,
      precision: 0
    }),
    enable_auto_escalation: Field.boolean({
      label: 'Enable Auto Escalation',
      defaultValue: false
    }),
    escalation_threshold_percent: Field.number({
      label: 'Escalation Threshold (%)',
      description: 'Percentage of SLA time when case is escalated',
      defaultValue: 90,
      min: 1,
      max: 100,
      precision: 0
    }),
    escalation_rule_id: Field.lookup('EscalationRule', {
      label: 'Escalation Rule',
      description: 'Rule to use for escalation'
    }),
    cases_using: Field.number({
      label: 'Active Cases',
      description: 'Number of active cases using this template',
      readonly: true,
      precision: 0
    }),
    average_compliance_rate: Field.number({
      label: 'Compliance Rate (%)',
      description: 'Percentage of cases meeting SLA targets',
      readonly: true,
      precision: 2
    })
  },

  enable: {
    searchable: true,
    trackHistory: true
  },
});
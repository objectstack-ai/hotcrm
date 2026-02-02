import { ObjectSchema, Field } from '@objectstack/spec/data';

export const SLAPolicy = ObjectSchema.create({
  name: 'sla_policy',
  label: 'SLA Policy',
  pluralLabel: 'SLA Policies',
  icon: 'shield-check',
  description: 'Comprehensive SLA policy management with multi-tier support and advanced configuration',

  fields: {
    policy_name: Field.text({
      label: 'Policy Name',
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
    effective_date: Field.date({
      label: 'Effective Date',
      description: 'When this policy takes effect',
      required: true
    }),
    expiration_date: Field.date({
      label: 'Expiration Date',
      description: 'When this policy expires (optional)'
    }),
    tier: Field.select({
      label: 'Service tier',
      required: true,
      options: [
        {
          "label": "🏆 Platinum - Premium 24/7",
          "value": "Platinum"
        },
        {
          "label": "🥇 Gold - Business Critical",
          "value": "Gold"
        },
        {
          "label": "🥈 Silver - Standard Support",
          "value": "Silver"
        },
        {
          "label": "🥉 Bronze - Basic Support",
          "value": "Bronze"
        },
        {
          "label": "📋 Standard - Community",
          "value": "Standard"
        }
      ]
    }),
    priority: Field.number({
      label: 'Policy priority',
      description: 'Lower number = higher priority when multiple policies match',
      required: true,
      defaultValue: 100,
      min: 1,
      precision: 0
    }),
    coverage_type: Field.select({
      label: 'Coverage Type',
      required: true,
      defaultValue: 'BusinessHours',
      options: [
        {
          "label": "🌐 24/7 Support",
          "value": "24x7"
        },
        {
          "label": "💼 Business Hours",
          "value": "BusinessHours"
        },
        {
          "label": "🌙 Extended Hours",
          "value": "Extended"
        },
        {
          "label": "🎯 Custom Schedule",
          "value": "Custom"
        }
      ]
    }),
    business_hours_id: Field.lookup('BusinessHours', {
      label: 'Business Hours',
      description: 'Business hours calendar for SLA calculation'
    }),
    applies_to: Field.select({
      label: 'Applies To',
      required: true,
      defaultValue: 'All',
      options: [
        {
          "label": "All Accounts",
          "value": "All"
        },
        {
          "label": "Specific Accounts",
          "value": "Accounts"
        },
        {
          "label": "Account tier",
          "value": "tier"
        },
        {
          "label": "Product Category",
          "value": "Product"
        },
        {
          "label": "Geographic Region",
          "value": "Region"
        }
      ]
    }),
    account_ids: Field.text({
      label: 'Account IDs',
      description: 'Comma-separated account IDs (when Applies To = Accounts)',
      maxLength: 2000
    }),
    account_tier: /* TODO: Unknown type 'multiselect' */ null,
    applicable_case_types: /* TODO: Unknown type 'multiselect' */ null,
    applicable_priorities: /* TODO: Unknown type 'multiselect' */ null,
    enable_first_response: Field.boolean({
      label: 'Track First Response',
      defaultValue: true
    }),
    first_response_minutes: Field.number({
      label: 'First Response (Minutes)',
      description: 'Target time for first agent response',
      min: 1,
      precision: 0
    }),
    first_response_warning_percent: Field.number({
      label: 'First Response Warning (%)',
      description: 'Percentage threshold for warning',
      defaultValue: 75,
      min: 1,
      max: 100,
      precision: 0
    }),
    enable_next_response: Field.boolean({
      label: 'Track Next Response',
      defaultValue: true
    }),
    next_response_minutes: Field.number({
      label: 'Next Response (Minutes)',
      description: 'Target time for subsequent responses',
      min: 1,
      precision: 0
    }),
    next_response_warning_percent: Field.number({
      label: 'Next Response Warning (%)',
      defaultValue: 75,
      min: 1,
      max: 100,
      precision: 0
    }),
    enable_resolution: Field.boolean({
      label: 'Track Resolution',
      defaultValue: true
    }),
    resolution_minutes: Field.number({
      label: 'Resolution Time (Minutes)',
      description: 'Target time to resolve case',
      min: 1,
      precision: 0
    }),
    resolution_warning_percent: Field.number({
      label: 'Resolution Warning (%)',
      defaultValue: 80,
      min: 1,
      max: 100,
      precision: 0
    }),
    enable_closure: Field.boolean({
      label: 'Track Closure',
      defaultValue: false
    }),
    closure_minutes: Field.number({
      label: 'Closure Time (Minutes)',
      description: 'Target time to close case after resolution',
      min: 1,
      precision: 0
    }),
    enable_auto_escalation: Field.boolean({
      label: 'Auto Escalation',
      defaultValue: true
    }),
    escalation_level1_percent: Field.number({
      label: 'Level 1 Escalation (%)',
      description: 'SLA percentage for first escalation',
      defaultValue: 85,
      min: 1,
      max: 100,
      precision: 0
    }),
    escalation_level1_rule_id: Field.lookup('EscalationRule', {
      label: 'Level 1 Rule',
      description: 'Escalation rule for level 1'
    }),
    escalation_level2_percent: Field.number({
      label: 'Level 2 Escalation (%)',
      defaultValue: 95,
      min: 1,
      max: 100,
      precision: 0
    }),
    escalation_level2_rule_id: Field.lookup('EscalationRule', { label: 'Level 2 Rule' }),
    escalation_level3_percent: Field.number({
      label: 'Level 3 Escalation (%)',
      defaultValue: 100,
      min: 1,
      max: 100,
      precision: 0
    }),
    escalation_level3_rule_id: Field.lookup('EscalationRule', { label: 'Level 3 Rule' }),
    notify_on_warning: Field.boolean({
      label: 'Notify on Warning',
      defaultValue: true
    }),
    notify_on_violation: Field.boolean({
      label: 'Notify on Violation',
      defaultValue: true
    }),
    notify_on_escalation: Field.boolean({
      label: 'Notify on Escalation',
      defaultValue: true
    }),
    warning_email_template_id: Field.lookup('EmailTemplate', { label: 'Warning Email Template' }),
    violation_email_template_id: Field.lookup('EmailTemplate', { label: 'Violation Email Template' }),
    allow_sla_pause: Field.boolean({
      label: 'Allow SLA Pause',
      description: 'Allow pausing SLA timer',
      defaultValue: true
    }),
    auto_pause_on_customer_wait: Field.boolean({
      label: 'Pause on Customer Wait',
      description: 'Auto-pause when waiting on customer',
      defaultValue: true
    }),
    auto_pause_on_hold: Field.boolean({
      label: 'Pause on Hold',
      description: 'Auto-pause when case is on hold',
      defaultValue: false
    }),
    target_compliance_rate: Field.number({
      label: 'Target Compliance (%)',
      description: 'Target SLA compliance rate',
      defaultValue: 95,
      min: 0,
      max: 100,
      precision: 2
    }),
    minimum_compliance_rate: Field.number({
      label: 'Minimum Compliance (%)',
      description: 'Minimum acceptable compliance rate',
      defaultValue: 85,
      min: 0,
      max: 100,
      precision: 2
    }),
    active_cases: Field.number({
      label: 'Active Cases',
      description: 'Cases currently using this policy',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    total_cases_processed: Field.number({
      label: 'Total Cases Processed',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    current_compliance_rate: Field.number({
      label: 'Current Compliance (%)',
      description: 'Current SLA compliance rate',
      readonly: true,
      precision: 2
    }),
    average_response_time: Field.number({
      label: 'Avg Response (Minutes)',
      readonly: true,
      precision: 0
    }),
    average_resolution_time: Field.number({
      label: 'Avg Resolution (Minutes)',
      readonly: true,
      precision: 0
    }),
    violation_count: Field.number({
      label: 'Violations',
      description: 'Total SLA violations',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    last_violation_date: Field.datetime({
      label: 'Last Violation',
      readonly: true
    }),
    version: Field.text({
      label: 'version',
      description: 'Policy version number',
      readonly: true,
      maxLength: 50
    }),
    previous_version_id: Field.lookup('SLAPolicy', {
      label: 'Previous version',
      description: 'Previous version of this policy',
      readonly: true
    }),
    is_latest_version: Field.boolean({
      label: 'Latest version',
      defaultValue: true,
      readonly: true
    })
  },

  enable: {
    searchEnabled: true,
    trackHistory: true
  },
});
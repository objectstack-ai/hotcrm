
const SLATemplate = {
  name: 'sla_template',
  label: 'SLA Template',
  labelPlural: 'SLA Templates',
  icon: 'clock',
  description: 'Service Level Agreement templates defining response and resolution time targets',
  enable: {
    searchable: true,
    trackHistory: true
  },
  fields: {
    // Basic Information
    name: {
      type: 'text',
      label: 'Template name',
      required: true,
      maxLength: 255,
      searchable: true
    },
    description: {
      type: 'textarea',
      label: 'description',
      maxLength: 2000
    },
    is_active: {
      type: 'checkbox',
      label: 'Active',
      defaultValue: true
    },
    // SLA Level
    s_l_a_level: {
      type: 'select',
      label: 'SLA Level',
      required: true,
      options: [
        { label: '🏆 Platinum', value: 'Platinum' },
        { label: '🥇 Gold', value: 'Gold' },
        { label: '🥈 Silver', value: 'Silver' },
        { label: '🥉 Bronze', value: 'Bronze' },
        { label: '📋 Standard', value: 'Standard' }
      ]
    },
    // Case Type Filters
    applicable_case_types: {
      type: 'multiselect',
      label: 'Applicable Case Types',
      options: [
        { label: 'Problem', value: 'Problem' },
        { label: 'Question', value: 'Question' },
        { label: 'Incident', value: 'Incident' },
        { label: 'Feature Request', value: 'Feature Request' },
        { label: 'Training', value: 'Training' },
        { label: 'Maintenance', value: 'Maintenance' },
        { label: 'Other', value: 'Other' }
      ]
    },
    applicable_priorities: {
      type: 'multiselect',
      label: 'Applicable Priorities',
      options: [
        { label: 'Critical', value: 'Critical' },
        { label: 'High', value: 'High' },
        { label: 'Medium', value: 'Medium' },
        { label: 'Low', value: 'Low' }
      ]
    },
    // Response Time SLA (in minutes)
    first_response_time_minutes: {
      type: 'number',
      label: 'First Response Time (Minutes)',
      required: true,
      precision: 0,
      min: 1,
      description: 'Time to first agent response'
    },
    next_response_time_minutes: {
      type: 'number',
      label: 'Next Response Time (Minutes)',
      precision: 0,
      min: 1,
      description: 'Time for subsequent responses'
    },
    // Resolution Time SLA (in minutes)
    resolution_time_minutes: {
      type: 'number',
      label: 'Resolution Time (Minutes)',
      required: true,
      precision: 0,
      min: 1,
      description: 'Time to resolve the case'
    },
    // Business Hours
    business_hours_id: {
      type: 'lookup',
      label: 'Business Hours',
      reference: 'BusinessHours',
      required: true,
      description: 'Working hours calendar for SLA calculation'
    },
    // Warning Thresholds (percentage)
    warning_threshold_percent: {
      type: 'number',
      label: 'Warning Threshold (%)',
      precision: 0,
      min: 1,
      max: 100,
      defaultValue: 80,
      description: 'Percentage of SLA time when warning is triggered'
    },
    // Escalation
    enable_auto_escalation: {
      type: 'checkbox',
      label: 'Enable Auto Escalation',
      defaultValue: false
    },
    escalation_threshold_percent: {
      type: 'number',
      label: 'Escalation Threshold (%)',
      precision: 0,
      min: 1,
      max: 100,
      defaultValue: 90,
      description: 'Percentage of SLA time when case is escalated'
    },
    escalation_rule_id: {
      type: 'lookup',
      label: 'Escalation Rule',
      reference: 'EscalationRule',
      description: 'Rule to use for escalation'
    },
    // Statistics
    cases_using: {
      type: 'number',
      label: 'Active Cases',
      precision: 0,
      readonly: true,
      description: 'Number of active cases using this template'
    },
    average_compliance_rate: {
      type: 'number',
      label: 'Compliance Rate (%)',
      precision: 2,
      readonly: true,
      description: 'Percentage of cases meeting SLA targets'
    }
  },
  validationRules: [
    {
      name: 'ResponseTimeLessThanResolution',
      errorMessage: 'First response time must be less than resolution time',
      formula: 'first_response_time_minutes >= resolution_time_minutes'
    },
    {
      name: 'EscalationRuleRequired',
      errorMessage: 'Escalation rule is required when auto escalation is enabled',
      formula: 'AND(enable_auto_escalation = true, ISBLANK(escalation_rule_id))'
    },
    {
      name: 'WarningBeforeEscalation',
      errorMessage: 'Warning threshold must be less than escalation threshold',
      formula: 'warning_threshold_percent >= escalation_threshold_percent'
    }
  ],
  listViews: [
    {
      name: 'AllTemplates',
      label: 'All SLA Templates',
      filters: [],
      columns: ['name', 's_l_a_level', 'first_response_time_minutes', 'resolution_time_minutes', 'is_active', 'cases_using'],
      sort: [['s_l_a_level', 'asc']]
    },
    {
      name: 'ActiveTemplates',
      label: 'Active Templates',
      filters: [
        ['is_active', '=', true]
      ],
      columns: ['name', 's_l_a_level', 'first_response_time_minutes', 'resolution_time_minutes', 'average_compliance_rate'],
      sort: [['s_l_a_level', 'asc']]
    },
    {
      name: 'ByLevel',
      label: 'By SLA Level',
      filters: [],
      columns: ['name', 's_l_a_level', 'first_response_time_minutes', 'resolution_time_minutes', 'business_hours_id', 'is_active'],
      sort: [['s_l_a_level', 'asc'], ['name', 'asc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Template Information',
        columns: 2,
        fields: ['name', 'description', 's_l_a_level', 'is_active']
      },
      {
        label: 'Applicable To',
        columns: 2,
        fields: ['applicable_case_types', 'applicable_priorities']
      },
      {
        label: 'SLA Targets',
        columns: 2,
        fields: ['first_response_time_minutes', 'next_response_time_minutes', 'resolution_time_minutes', 'business_hours_id']
      },
      {
        label: 'Thresholds & Escalation',
        columns: 2,
        fields: ['warning_threshold_percent', 'enable_auto_escalation', 'escalation_threshold_percent', 'escalation_rule_id']
      },
      {
        label: 'Performance',
        columns: 2,
        fields: ['cases_using', 'average_compliance_rate']
      }
    ]
  }
};

export default SLATemplate;

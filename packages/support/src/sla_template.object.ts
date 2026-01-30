import type { ServiceObject } from '@objectstack/spec/data';

const SLATemplate = {
  name: 'sla_template',
  label: 'SLA Template',
  labelPlural: 'SLA Templates',
  icon: 'clock',
  description: 'Service Level Agreement templates defining response and resolution time targets',
  capabilities: {
    searchable: true,
    trackHistory: true
  },
  fields: {
    // Basic Information
    Name: {
      type: 'text',
      label: 'Template Name',
      required: true,
      maxLength: 255,
      searchable: true
    },
    Description: {
      type: 'textarea',
      label: 'Description',
      maxLength: 2000
    },
    IsActive: {
      type: 'checkbox',
      label: 'Active',
      defaultValue: true
    },
    // SLA Level
    SLALevel: {
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
    ApplicableCaseTypes: {
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
    ApplicablePriorities: {
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
    FirstResponseTimeMinutes: {
      type: 'number',
      label: 'First Response Time (Minutes)',
      required: true,
      precision: 0,
      min: 1,
      description: 'Time to first agent response'
    },
    NextResponseTimeMinutes: {
      type: 'number',
      label: 'Next Response Time (Minutes)',
      precision: 0,
      min: 1,
      description: 'Time for subsequent responses'
    },
    // Resolution Time SLA (in minutes)
    ResolutionTimeMinutes: {
      type: 'number',
      label: 'Resolution Time (Minutes)',
      required: true,
      precision: 0,
      min: 1,
      description: 'Time to resolve the case'
    },
    // Business Hours
    BusinessHoursId: {
      type: 'lookup',
      label: 'Business Hours',
      reference: 'BusinessHours',
      required: true,
      description: 'Working hours calendar for SLA calculation'
    },
    // Warning Thresholds (percentage)
    WarningThresholdPercent: {
      type: 'number',
      label: 'Warning Threshold (%)',
      precision: 0,
      min: 1,
      max: 100,
      defaultValue: 80,
      description: 'Percentage of SLA time when warning is triggered'
    },
    // Escalation
    EnableAutoEscalation: {
      type: 'checkbox',
      label: 'Enable Auto Escalation',
      defaultValue: false
    },
    EscalationThresholdPercent: {
      type: 'number',
      label: 'Escalation Threshold (%)',
      precision: 0,
      min: 1,
      max: 100,
      defaultValue: 90,
      description: 'Percentage of SLA time when case is escalated'
    },
    EscalationRuleId: {
      type: 'lookup',
      label: 'Escalation Rule',
      reference: 'EscalationRule',
      description: 'Rule to use for escalation'
    },
    // Statistics
    CasesUsing: {
      type: 'number',
      label: 'Active Cases',
      precision: 0,
      readonly: true,
      description: 'Number of active cases using this template'
    },
    AverageComplianceRate: {
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
      formula: 'FirstResponseTimeMinutes >= ResolutionTimeMinutes'
    },
    {
      name: 'EscalationRuleRequired',
      errorMessage: 'Escalation rule is required when auto escalation is enabled',
      formula: 'AND(EnableAutoEscalation = true, ISBLANK(EscalationRuleId))'
    },
    {
      name: 'WarningBeforeEscalation',
      errorMessage: 'Warning threshold must be less than escalation threshold',
      formula: 'WarningThresholdPercent >= EscalationThresholdPercent'
    }
  ],
  listViews: [
    {
      name: 'AllTemplates',
      label: 'All SLA Templates',
      filters: [],
      columns: ['Name', 'SLALevel', 'FirstResponseTimeMinutes', 'ResolutionTimeMinutes', 'IsActive', 'CasesUsing'],
      sort: [['SLALevel', 'asc']]
    },
    {
      name: 'ActiveTemplates',
      label: 'Active Templates',
      filters: [
        ['IsActive', '=', true]
      ],
      columns: ['Name', 'SLALevel', 'FirstResponseTimeMinutes', 'ResolutionTimeMinutes', 'AverageComplianceRate'],
      sort: [['SLALevel', 'asc']]
    },
    {
      name: 'ByLevel',
      label: 'By SLA Level',
      filters: [],
      columns: ['Name', 'SLALevel', 'FirstResponseTimeMinutes', 'ResolutionTimeMinutes', 'BusinessHoursId', 'IsActive'],
      sort: [['SLALevel', 'asc'], ['Name', 'asc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Template Information',
        columns: 2,
        fields: ['Name', 'Description', 'SLALevel', 'IsActive']
      },
      {
        label: 'Applicable To',
        columns: 2,
        fields: ['ApplicableCaseTypes', 'ApplicablePriorities']
      },
      {
        label: 'SLA Targets',
        columns: 2,
        fields: ['FirstResponseTimeMinutes', 'NextResponseTimeMinutes', 'ResolutionTimeMinutes', 'BusinessHoursId']
      },
      {
        label: 'Thresholds & Escalation',
        columns: 2,
        fields: ['WarningThresholdPercent', 'EnableAutoEscalation', 'EscalationThresholdPercent', 'EscalationRuleId']
      },
      {
        label: 'Performance',
        columns: 2,
        fields: ['CasesUsing', 'AverageComplianceRate']
      }
    ]
  }
};

export default SLATemplate;

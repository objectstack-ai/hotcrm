import type { ObjectSchema } from '@objectstack/spec/data';

const SLAPolicy: ObjectSchema = {
  name: 'sla_policy',
  label: 'SLA Policy',
  labelPlural: 'SLA Policies',
  icon: 'shield-check',
  description: 'Comprehensive SLA policy management with multi-tier support and advanced configuration',
  enable: {
    searchEnabled: true,
    trackHistory: true
  },
  fields: {
    // Basic Information
    PolicyName: {
      type: 'text',
      label: 'Policy Name',
      required: true,
      maxLength: 255,
      searchEnabled: true
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
    EffectiveDate: {
      type: 'date',
      label: 'Effective Date',
      required: true,
      description: 'When this policy takes effect'
    },
    ExpirationDate: {
      type: 'date',
      label: 'Expiration Date',
      description: 'When this policy expires (optional)'
    },
    // Policy Tier
    Tier: {
      type: 'select',
      label: 'Service Tier',
      required: true,
      options: [
        { label: '🏆 Platinum - Premium 24/7', value: 'Platinum' },
        { label: '🥇 Gold - Business Critical', value: 'Gold' },
        { label: '🥈 Silver - Standard Support', value: 'Silver' },
        { label: '🥉 Bronze - Basic Support', value: 'Bronze' },
        { label: '📋 Standard - Community', value: 'Standard' }
      ]
    },
    Priority: {
      type: 'number',
      label: 'Policy Priority',
      required: true,
      precision: 0,
      min: 1,
      defaultValue: 100,
      description: 'Lower number = higher priority when multiple policies match'
    },
    // Coverage
    CoverageType: {
      type: 'select',
      label: 'Coverage Type',
      required: true,
      defaultValue: 'BusinessHours',
      options: [
        { label: '🌐 24/7 Support', value: '24x7' },
        { label: '💼 Business Hours', value: 'BusinessHours' },
        { label: '🌙 Extended Hours', value: 'Extended' },
        { label: '🎯 Custom Schedule', value: 'Custom' }
      ]
    },
    BusinessHoursId: {
      type: 'lookup',
      label: 'Business Hours',
      reference: 'BusinessHours',
      description: 'Business hours calendar for SLA calculation'
    },
    // Applicability Filters
    AppliesTo: {
      type: 'select',
      label: 'Applies To',
      required: true,
      defaultValue: 'All',
      options: [
        { label: 'All Accounts', value: 'All' },
        { label: 'Specific Accounts', value: 'Accounts' },
        { label: 'Account Tier', value: 'Tier' },
        { label: 'Product Category', value: 'Product' },
        { label: 'Geographic Region', value: 'Region' }
      ]
    },
    AccountIds: {
      type: 'text',
      label: 'Account IDs',
      maxLength: 2000,
      description: 'Comma-separated account IDs (when Applies To = Accounts)'
    },
    AccountTier: {
      type: 'multiselect',
      label: 'Account Tiers',
      options: [
        { label: 'Enterprise', value: 'Enterprise' },
        { label: 'Corporate', value: 'Corporate' },
        { label: 'SMB', value: 'SMB' },
        { label: 'Startup', value: 'Startup' }
      ]
    },
    ApplicableCaseTypes: {
      type: 'multiselect',
      label: 'Case Types',
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
      label: 'Priorities',
      options: [
        { label: 'Critical', value: 'Critical' },
        { label: 'High', value: 'High' },
        { label: 'Medium', value: 'Medium' },
        { label: 'Low', value: 'Low' }
      ]
    },
    // SLA Milestones Configuration
    // First Response
    EnableFirstResponse: {
      type: 'checkbox',
      label: 'Track First Response',
      defaultValue: true
    },
    FirstResponseMinutes: {
      type: 'number',
      label: 'First Response (Minutes)',
      precision: 0,
      min: 1,
      description: 'Target time for first agent response'
    },
    FirstResponseWarningPercent: {
      type: 'number',
      label: 'First Response Warning (%)',
      precision: 0,
      min: 1,
      max: 100,
      defaultValue: 75,
      description: 'Percentage threshold for warning'
    },
    // Next Response
    EnableNextResponse: {
      type: 'checkbox',
      label: 'Track Next Response',
      defaultValue: true
    },
    NextResponseMinutes: {
      type: 'number',
      label: 'Next Response (Minutes)',
      precision: 0,
      min: 1,
      description: 'Target time for subsequent responses'
    },
    NextResponseWarningPercent: {
      type: 'number',
      label: 'Next Response Warning (%)',
      precision: 0,
      min: 1,
      max: 100,
      defaultValue: 75
    },
    // Resolution
    EnableResolution: {
      type: 'checkbox',
      label: 'Track Resolution',
      defaultValue: true
    },
    ResolutionMinutes: {
      type: 'number',
      label: 'Resolution Time (Minutes)',
      precision: 0,
      min: 1,
      description: 'Target time to resolve case'
    },
    ResolutionWarningPercent: {
      type: 'number',
      label: 'Resolution Warning (%)',
      precision: 0,
      min: 1,
      max: 100,
      defaultValue: 80
    },
    // Closure
    EnableClosure: {
      type: 'checkbox',
      label: 'Track Closure',
      defaultValue: false
    },
    ClosureMinutes: {
      type: 'number',
      label: 'Closure Time (Minutes)',
      precision: 0,
      min: 1,
      description: 'Target time to close case after resolution'
    },
    // Escalation Rules
    EnableAutoEscalation: {
      type: 'checkbox',
      label: 'Auto Escalation',
      defaultValue: true
    },
    EscalationLevel1Percent: {
      type: 'number',
      label: 'Level 1 Escalation (%)',
      precision: 0,
      min: 1,
      max: 100,
      defaultValue: 85,
      description: 'SLA percentage for first escalation'
    },
    EscalationLevel1RuleId: {
      type: 'lookup',
      label: 'Level 1 Rule',
      reference: 'EscalationRule',
      description: 'Escalation rule for level 1'
    },
    EscalationLevel2Percent: {
      type: 'number',
      label: 'Level 2 Escalation (%)',
      precision: 0,
      min: 1,
      max: 100,
      defaultValue: 95
    },
    EscalationLevel2RuleId: {
      type: 'lookup',
      label: 'Level 2 Rule',
      reference: 'EscalationRule'
    },
    EscalationLevel3Percent: {
      type: 'number',
      label: 'Level 3 Escalation (%)',
      precision: 0,
      min: 1,
      max: 100,
      defaultValue: 100
    },
    EscalationLevel3RuleId: {
      type: 'lookup',
      label: 'Level 3 Rule',
      reference: 'EscalationRule'
    },
    // Notifications
    NotifyOnWarning: {
      type: 'checkbox',
      label: 'Notify on Warning',
      defaultValue: true
    },
    NotifyOnViolation: {
      type: 'checkbox',
      label: 'Notify on Violation',
      defaultValue: true
    },
    NotifyOnEscalation: {
      type: 'checkbox',
      label: 'Notify on Escalation',
      defaultValue: true
    },
    WarningEmailTemplateId: {
      type: 'lookup',
      label: 'Warning Email Template',
      reference: 'EmailTemplate'
    },
    ViolationEmailTemplateId: {
      type: 'lookup',
      label: 'Violation Email Template',
      reference: 'EmailTemplate'
    },
    // Pause Rules
    AllowSLAPause: {
      type: 'checkbox',
      label: 'Allow SLA Pause',
      defaultValue: true,
      description: 'Allow pausing SLA timer'
    },
    AutoPauseOnCustomerWait: {
      type: 'checkbox',
      label: 'Pause on Customer Wait',
      defaultValue: true,
      description: 'Auto-pause when waiting on customer'
    },
    AutoPauseOnHold: {
      type: 'checkbox',
      label: 'Pause on Hold',
      defaultValue: false,
      description: 'Auto-pause when case is on hold'
    },
    // Performance Targets
    TargetComplianceRate: {
      type: 'number',
      label: 'Target Compliance (%)',
      precision: 2,
      min: 0,
      max: 100,
      defaultValue: 95,
      description: 'Target SLA compliance rate'
    },
    MinimumComplianceRate: {
      type: 'number',
      label: 'Minimum Compliance (%)',
      precision: 2,
      min: 0,
      max: 100,
      defaultValue: 85,
      description: 'Minimum acceptable compliance rate'
    },
    // Statistics & Metrics
    ActiveCases: {
      type: 'number',
      label: 'Active Cases',
      precision: 0,
      readonly: true,
      defaultValue: 0,
      description: 'Cases currently using this policy'
    },
    TotalCasesProcessed: {
      type: 'number',
      label: 'Total Cases Processed',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    CurrentComplianceRate: {
      type: 'number',
      label: 'Current Compliance (%)',
      precision: 2,
      readonly: true,
      description: 'Current SLA compliance rate'
    },
    AverageResponseTime: {
      type: 'number',
      label: 'Avg Response (Minutes)',
      precision: 0,
      readonly: true
    },
    AverageResolutionTime: {
      type: 'number',
      label: 'Avg Resolution (Minutes)',
      precision: 0,
      readonly: true
    },
    ViolationCount: {
      type: 'number',
      label: 'Violations',
      precision: 0,
      readonly: true,
      defaultValue: 0,
      description: 'Total SLA violations'
    },
    LastViolationDate: {
      type: 'datetime',
      label: 'Last Violation',
      readonly: true
    },
    // Version Control
    Version: {
      type: 'text',
      label: 'Version',
      maxLength: 50,
      readonly: true,
      description: 'Policy version number'
    },
    PreviousVersionId: {
      type: 'lookup',
      label: 'Previous Version',
      reference: 'SLAPolicy',
      readonly: true,
      description: 'Previous version of this policy'
    },
    IsLatestVersion: {
      type: 'checkbox',
      label: 'Latest Version',
      readonly: true,
      defaultValue: true
    }
  },
  validationRules: [
    {
      name: 'EffectiveBeforeExpiration',
      errorMessage: 'Effective date must be before expiration date',
      formula: 'AND(NOT(ISBLANK(ExpirationDate)), EffectiveDate >= ExpirationDate)'
    },
    {
      name: 'FirstResponseRequired',
      errorMessage: 'First response time is required when tracking is enabled',
      formula: 'AND(EnableFirstResponse = true, ISBLANK(FirstResponseMinutes))'
    },
    {
      name: 'NextResponseRequired',
      errorMessage: 'Next response time is required when tracking is enabled',
      formula: 'AND(EnableNextResponse = true, ISBLANK(NextResponseMinutes))'
    },
    {
      name: 'ResolutionRequired',
      errorMessage: 'Resolution time is required when tracking is enabled',
      formula: 'AND(EnableResolution = true, ISBLANK(ResolutionMinutes))'
    },
    {
      name: 'ClosureRequired',
      errorMessage: 'Closure time is required when tracking is enabled',
      formula: 'AND(EnableClosure = true, ISBLANK(ClosureMinutes))'
    },
    {
      name: 'ResponseBeforeResolution',
      errorMessage: 'First response time must be less than resolution time',
      formula: 'AND(EnableFirstResponse = true, EnableResolution = true, FirstResponseMinutes >= ResolutionMinutes)'
    },
    {
      name: 'BusinessHoursRequired',
      errorMessage: 'Business hours is required for business hours coverage',
      formula: 'AND(CoverageType = "BusinessHours", ISBLANK(BusinessHoursId))'
    },
    {
      name: 'AccountIdsRequired',
      errorMessage: 'Account IDs required when applies to specific accounts',
      formula: 'AND(AppliesTo = "Accounts", ISBLANK(AccountIds))'
    },
    {
      name: 'EscalationRulesRequired',
      errorMessage: 'Escalation rules required when auto escalation is enabled',
      formula: 'AND(EnableAutoEscalation = true, ISBLANK(EscalationLevel1RuleId))'
    },
    {
      name: 'MinLessThanTarget',
      errorMessage: 'Minimum compliance rate must be less than target',
      formula: 'MinimumComplianceRate >= TargetComplianceRate'
    },
    {
      name: 'AtLeastOneMilestone',
      errorMessage: 'At least one SLA milestone must be enabled',
      formula: 'AND(EnableFirstResponse = false, EnableNextResponse = false, EnableResolution = false, EnableClosure = false)'
    }
  ],
  listViews: [
    {
      name: 'AllPolicies',
      label: 'All Policies',
      filters: [],
      columns: ['PolicyName', 'Tier', 'Priority', 'IsActive', 'ActiveCases', 'CurrentComplianceRate'],
      sort: [['Priority', 'asc']]
    },
    {
      name: 'ActivePolicies',
      label: 'Active Policies',
      filters: [
        ['IsActive', '=', true],
        ['IsLatestVersion', '=', true]
      ],
      columns: ['PolicyName', 'Tier', 'EffectiveDate', 'ActiveCases', 'CurrentComplianceRate', 'ViolationCount'],
      sort: [['Priority', 'asc']]
    },
    {
      name: 'ByTier',
      label: 'By Service Tier',
      filters: [
        ['IsActive', '=', true]
      ],
      columns: ['PolicyName', 'Tier', 'FirstResponseMinutes', 'ResolutionMinutes', 'CurrentComplianceRate'],
      sort: [['Tier', 'asc'], ['Priority', 'asc']]
    },
    {
      name: 'LowCompliance',
      label: 'Low Compliance',
      filters: [
        ['IsActive', '=', true],
        ['CurrentComplianceRate', '<', 90]
      ],
      columns: ['PolicyName', 'Tier', 'CurrentComplianceRate', 'TargetComplianceRate', 'ViolationCount', 'ActiveCases'],
      sort: [['CurrentComplianceRate', 'asc']]
    },
    {
      name: 'RecentViolations',
      label: 'Recent Violations',
      filters: [
        ['ViolationCount', '>', 0]
      ],
      columns: ['PolicyName', 'Tier', 'ViolationCount', 'LastViolationDate', 'CurrentComplianceRate'],
      sort: [['LastViolationDate', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Policy Information',
        columns: 2,
        fields: ['PolicyName', 'Description', 'Tier', 'Priority', 'IsActive']
      },
      {
        label: 'Effective Period',
        columns: 2,
        fields: ['EffectiveDate', 'ExpirationDate', 'Version', 'IsLatestVersion']
      },
      {
        label: 'Coverage',
        columns: 2,
        fields: ['CoverageType', 'BusinessHoursId']
      },
      {
        label: 'Applicability',
        columns: 2,
        fields: ['AppliesTo', 'AccountIds', 'AccountTier', 'ApplicableCaseTypes', 'ApplicablePriorities']
      },
      {
        label: 'First Response SLA',
        columns: 3,
        fields: ['EnableFirstResponse', 'FirstResponseMinutes', 'FirstResponseWarningPercent']
      },
      {
        label: 'Next Response SLA',
        columns: 3,
        fields: ['EnableNextResponse', 'NextResponseMinutes', 'NextResponseWarningPercent']
      },
      {
        label: 'Resolution SLA',
        columns: 3,
        fields: ['EnableResolution', 'ResolutionMinutes', 'ResolutionWarningPercent']
      },
      {
        label: 'Closure SLA',
        columns: 3,
        fields: ['EnableClosure', 'ClosureMinutes']
      },
      {
        label: 'Auto Escalation',
        columns: 2,
        fields: ['EnableAutoEscalation', 'EscalationLevel1Percent', 'EscalationLevel1RuleId', 'EscalationLevel2Percent', 'EscalationLevel2RuleId', 'EscalationLevel3Percent', 'EscalationLevel3RuleId']
      },
      {
        label: 'Notifications',
        columns: 2,
        fields: ['NotifyOnWarning', 'NotifyOnViolation', 'NotifyOnEscalation', 'WarningEmailTemplateId', 'ViolationEmailTemplateId']
      },
      {
        label: 'Pause Rules',
        columns: 2,
        fields: ['AllowSLAPause', 'AutoPauseOnCustomerWait', 'AutoPauseOnHold']
      },
      {
        label: 'Performance Targets',
        columns: 2,
        fields: ['TargetComplianceRate', 'MinimumComplianceRate']
      },
      {
        label: 'Current Performance',
        columns: 3,
        fields: ['ActiveCases', 'CurrentComplianceRate', 'ViolationCount']
      },
      {
        label: 'Statistics',
        columns: 3,
        fields: ['TotalCasesProcessed', 'AverageResponseTime', 'AverageResolutionTime', 'LastViolationDate']
      }
    ]
  }
};

export default SLAPolicy;

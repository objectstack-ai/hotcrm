
const SLAPolicy = {
  name: 'sla_policy',
  label: 'SLA Policy',
  labelPlural: 'SLA Policies',
  icon: 'shield-check',
  description: 'Comprehensive SLA policy management with multi-tier support and advanced configuration',
  enable: {
    searchable: true,
    trackHistory: true
  },
  fields: {
    // Basic Information
    policy_name: {
      type: 'text',
      label: 'Policy Name',
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
    effective_date: {
      type: 'date',
      label: 'Effective Date',
      required: true,
      description: 'When this policy takes effect'
    },
    expiration_date: {
      type: 'date',
      label: 'Expiration Date',
      description: 'When this policy expires (optional)'
    },
    // Policy tier
    tier: {
      type: 'select',
      label: 'Service tier',
      required: true,
      options: [
        { label: '🏆 Platinum - Premium 24/7', value: 'Platinum' },
        { label: '🥇 Gold - Business Critical', value: 'Gold' },
        { label: '🥈 Silver - Standard Support', value: 'Silver' },
        { label: '🥉 Bronze - Basic Support', value: 'Bronze' },
        { label: '📋 Standard - Community', value: 'Standard' }
      ]
    },
    priority: {
      type: 'number',
      label: 'Policy priority',
      required: true,
      precision: 0,
      min: 1,
      defaultValue: 100,
      description: 'Lower number = higher priority when multiple policies match'
    },
    // Coverage
    coverage_type: {
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
    business_hours_id: {
      type: 'lookup',
      label: 'Business Hours',
      reference: 'BusinessHours',
      description: 'Business hours calendar for SLA calculation'
    },
    // Applicability Filters
    applies_to: {
      type: 'select',
      label: 'Applies To',
      required: true,
      defaultValue: 'All',
      options: [
        { label: 'All Accounts', value: 'All' },
        { label: 'Specific Accounts', value: 'Accounts' },
        { label: 'Account tier', value: 'tier' },
        { label: 'Product Category', value: 'Product' },
        { label: 'Geographic Region', value: 'Region' }
      ]
    },
    account_ids: {
      type: 'text',
      label: 'Account IDs',
      maxLength: 2000,
      description: 'Comma-separated account IDs (when Applies To = Accounts)'
    },
    account_tier: {
      type: 'multiselect',
      label: 'Account Tiers',
      options: [
        { label: 'Enterprise', value: 'Enterprise' },
        { label: 'Corporate', value: 'Corporate' },
        { label: 'SMB', value: 'SMB' },
        { label: 'Startup', value: 'Startup' }
      ]
    },
    applicable_case_types: {
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
    applicable_priorities: {
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
    enable_first_response: {
      type: 'checkbox',
      label: 'Track First Response',
      defaultValue: true
    },
    first_response_minutes: {
      type: 'number',
      label: 'First Response (Minutes)',
      precision: 0,
      min: 1,
      description: 'Target time for first agent response'
    },
    first_response_warning_percent: {
      type: 'number',
      label: 'First Response Warning (%)',
      precision: 0,
      min: 1,
      max: 100,
      defaultValue: 75,
      description: 'Percentage threshold for warning'
    },
    // Next Response
    enable_next_response: {
      type: 'checkbox',
      label: 'Track Next Response',
      defaultValue: true
    },
    next_response_minutes: {
      type: 'number',
      label: 'Next Response (Minutes)',
      precision: 0,
      min: 1,
      description: 'Target time for subsequent responses'
    },
    next_response_warning_percent: {
      type: 'number',
      label: 'Next Response Warning (%)',
      precision: 0,
      min: 1,
      max: 100,
      defaultValue: 75
    },
    // Resolution
    enable_resolution: {
      type: 'checkbox',
      label: 'Track Resolution',
      defaultValue: true
    },
    resolution_minutes: {
      type: 'number',
      label: 'Resolution Time (Minutes)',
      precision: 0,
      min: 1,
      description: 'Target time to resolve case'
    },
    resolution_warning_percent: {
      type: 'number',
      label: 'Resolution Warning (%)',
      precision: 0,
      min: 1,
      max: 100,
      defaultValue: 80
    },
    // Closure
    enable_closure: {
      type: 'checkbox',
      label: 'Track Closure',
      defaultValue: false
    },
    closure_minutes: {
      type: 'number',
      label: 'Closure Time (Minutes)',
      precision: 0,
      min: 1,
      description: 'Target time to close case after resolution'
    },
    // Escalation Rules
    enable_auto_escalation: {
      type: 'checkbox',
      label: 'Auto Escalation',
      defaultValue: true
    },
    escalation_level1_percent: {
      type: 'number',
      label: 'Level 1 Escalation (%)',
      precision: 0,
      min: 1,
      max: 100,
      defaultValue: 85,
      description: 'SLA percentage for first escalation'
    },
    escalation_level1_rule_id: {
      type: 'lookup',
      label: 'Level 1 Rule',
      reference: 'EscalationRule',
      description: 'Escalation rule for level 1'
    },
    escalation_level2_percent: {
      type: 'number',
      label: 'Level 2 Escalation (%)',
      precision: 0,
      min: 1,
      max: 100,
      defaultValue: 95
    },
    escalation_level2_rule_id: {
      type: 'lookup',
      label: 'Level 2 Rule',
      reference: 'EscalationRule'
    },
    escalation_level3_percent: {
      type: 'number',
      label: 'Level 3 Escalation (%)',
      precision: 0,
      min: 1,
      max: 100,
      defaultValue: 100
    },
    escalation_level3_rule_id: {
      type: 'lookup',
      label: 'Level 3 Rule',
      reference: 'EscalationRule'
    },
    // Notifications
    notify_on_warning: {
      type: 'checkbox',
      label: 'Notify on Warning',
      defaultValue: true
    },
    notify_on_violation: {
      type: 'checkbox',
      label: 'Notify on Violation',
      defaultValue: true
    },
    notify_on_escalation: {
      type: 'checkbox',
      label: 'Notify on Escalation',
      defaultValue: true
    },
    warning_email_template_id: {
      type: 'lookup',
      label: 'Warning Email Template',
      reference: 'EmailTemplate'
    },
    violation_email_template_id: {
      type: 'lookup',
      label: 'Violation Email Template',
      reference: 'EmailTemplate'
    },
    // Pause Rules
    allow_s_l_a_pause: {
      type: 'checkbox',
      label: 'Allow SLA Pause',
      defaultValue: true,
      description: 'Allow pausing SLA timer'
    },
    auto_pause_on_customer_wait: {
      type: 'checkbox',
      label: 'Pause on Customer Wait',
      defaultValue: true,
      description: 'Auto-pause when waiting on customer'
    },
    auto_pause_on_hold: {
      type: 'checkbox',
      label: 'Pause on Hold',
      defaultValue: false,
      description: 'Auto-pause when case is on hold'
    },
    // Performance Targets
    target_compliance_rate: {
      type: 'number',
      label: 'Target Compliance (%)',
      precision: 2,
      min: 0,
      max: 100,
      defaultValue: 95,
      description: 'Target SLA compliance rate'
    },
    minimum_compliance_rate: {
      type: 'number',
      label: 'Minimum Compliance (%)',
      precision: 2,
      min: 0,
      max: 100,
      defaultValue: 85,
      description: 'Minimum acceptable compliance rate'
    },
    // Statistics & Metrics
    active_cases: {
      type: 'number',
      label: 'Active Cases',
      precision: 0,
      readonly: true,
      defaultValue: 0,
      description: 'Cases currently using this policy'
    },
    total_cases_processed: {
      type: 'number',
      label: 'Total Cases Processed',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    current_compliance_rate: {
      type: 'number',
      label: 'Current Compliance (%)',
      precision: 2,
      readonly: true,
      description: 'Current SLA compliance rate'
    },
    average_response_time: {
      type: 'number',
      label: 'Avg Response (Minutes)',
      precision: 0,
      readonly: true
    },
    average_resolution_time: {
      type: 'number',
      label: 'Avg Resolution (Minutes)',
      precision: 0,
      readonly: true
    },
    violation_count: {
      type: 'number',
      label: 'Violations',
      precision: 0,
      readonly: true,
      defaultValue: 0,
      description: 'Total SLA violations'
    },
    last_violation_date: {
      type: 'datetime',
      label: 'Last Violation',
      readonly: true
    },
    // version Control
    version: {
      type: 'text',
      label: 'version',
      maxLength: 50,
      readonly: true,
      description: 'Policy version number'
    },
    previous_version_id: {
      type: 'lookup',
      label: 'Previous version',
      reference: 'SLAPolicy',
      readonly: true,
      description: 'Previous version of this policy'
    },
    is_latest_version: {
      type: 'checkbox',
      label: 'Latest version',
      readonly: true,
      defaultValue: true
    }
  },
  validationRules: [
    {
      name: 'EffectiveBeforeExpiration',
      errorMessage: 'Effective date must be before expiration date',
      formula: 'AND(NOT(ISBLANK(expiration_date)), effective_date >= expiration_date)'
    },
    {
      name: 'FirstResponseRequired',
      errorMessage: 'First response time is required when tracking is enabled',
      formula: 'AND(enable_first_response = true, ISBLANK(first_response_minutes))'
    },
    {
      name: 'NextResponseRequired',
      errorMessage: 'Next response time is required when tracking is enabled',
      formula: 'AND(enable_next_response = true, ISBLANK(next_response_minutes))'
    },
    {
      name: 'ResolutionRequired',
      errorMessage: 'Resolution time is required when tracking is enabled',
      formula: 'AND(enable_resolution = true, ISBLANK(resolution_minutes))'
    },
    {
      name: 'ClosureRequired',
      errorMessage: 'Closure time is required when tracking is enabled',
      formula: 'AND(enable_closure = true, ISBLANK(closure_minutes))'
    },
    {
      name: 'ResponseBeforeResolution',
      errorMessage: 'First response time must be less than resolution time',
      formula: 'AND(enable_first_response = true, enable_resolution = true, first_response_minutes >= resolution_minutes)'
    },
    {
      name: 'BusinessHoursRequired',
      errorMessage: 'Business hours is required for business hours coverage',
      formula: 'AND(coverage_type = "BusinessHours", ISBLANK(business_hours_id))'
    },
    {
      name: 'AccountIdsRequired',
      errorMessage: 'Account IDs required when applies to specific accounts',
      formula: 'AND(applies_to = "Accounts", ISBLANK(account_ids))'
    },
    {
      name: 'EscalationRulesRequired',
      errorMessage: 'Escalation rules required when auto escalation is enabled',
      formula: 'AND(enable_auto_escalation = true, ISBLANK(escalation_level1_rule_id))'
    },
    {
      name: 'MinLessThanTarget',
      errorMessage: 'Minimum compliance rate must be less than target',
      formula: 'minimum_compliance_rate >= target_compliance_rate'
    },
    {
      name: 'AtLeastOneMilestone',
      errorMessage: 'At least one SLA milestone must be enabled',
      formula: 'AND(enable_first_response = false, enable_next_response = false, enable_resolution = false, enable_closure = false)'
    }
  ],
  listViews: [
    {
      name: 'AllPolicies',
      label: 'All Policies',
      filters: [],
      columns: ['policy_name', 'tier', 'priority', 'is_active', 'active_cases', 'current_compliance_rate'],
      sort: [['priority', 'asc']]
    },
    {
      name: 'ActivePolicies',
      label: 'Active Policies',
      filters: [
        ['is_active', '=', true],
        ['is_latest_version', '=', true]
      ],
      columns: ['policy_name', 'tier', 'effective_date', 'active_cases', 'current_compliance_rate', 'violation_count'],
      sort: [['priority', 'asc']]
    },
    {
      name: 'ByTier',
      label: 'By Service tier',
      filters: [
        ['is_active', '=', true]
      ],
      columns: ['policy_name', 'tier', 'first_response_minutes', 'resolution_minutes', 'current_compliance_rate'],
      sort: [['tier', 'asc'], ['priority', 'asc']]
    },
    {
      name: 'LowCompliance',
      label: 'Low Compliance',
      filters: [
        ['is_active', '=', true],
        ['current_compliance_rate', '<', 90]
      ],
      columns: ['policy_name', 'tier', 'current_compliance_rate', 'target_compliance_rate', 'violation_count', 'active_cases'],
      sort: [['current_compliance_rate', 'asc']]
    },
    {
      name: 'RecentViolations',
      label: 'Recent Violations',
      filters: [
        ['violation_count', '>', 0]
      ],
      columns: ['policy_name', 'tier', 'violation_count', 'last_violation_date', 'current_compliance_rate'],
      sort: [['last_violation_date', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Policy Information',
        columns: 2,
        fields: ['policy_name', 'description', 'tier', 'priority', 'is_active']
      },
      {
        label: 'Effective Period',
        columns: 2,
        fields: ['effective_date', 'expiration_date', 'version', 'is_latest_version']
      },
      {
        label: 'Coverage',
        columns: 2,
        fields: ['coverage_type', 'business_hours_id']
      },
      {
        label: 'Applicability',
        columns: 2,
        fields: ['applies_to', 'account_ids', 'account_tier', 'applicable_case_types', 'applicable_priorities']
      },
      {
        label: 'First Response SLA',
        columns: 3,
        fields: ['enable_first_response', 'first_response_minutes', 'first_response_warning_percent']
      },
      {
        label: 'Next Response SLA',
        columns: 3,
        fields: ['enable_next_response', 'next_response_minutes', 'next_response_warning_percent']
      },
      {
        label: 'Resolution SLA',
        columns: 3,
        fields: ['enable_resolution', 'resolution_minutes', 'resolution_warning_percent']
      },
      {
        label: 'Closure SLA',
        columns: 3,
        fields: ['enable_closure', 'closure_minutes']
      },
      {
        label: 'Auto Escalation',
        columns: 2,
        fields: ['enable_auto_escalation', 'escalation_level1_percent', 'escalation_level1_rule_id', 'escalation_level2_percent', 'escalation_level2_rule_id', 'escalation_level3_percent', 'escalation_level3_rule_id']
      },
      {
        label: 'Notifications',
        columns: 2,
        fields: ['notify_on_warning', 'notify_on_violation', 'notify_on_escalation', 'warning_email_template_id', 'violation_email_template_id']
      },
      {
        label: 'Pause Rules',
        columns: 2,
        fields: ['allow_s_l_a_pause', 'auto_pause_on_customer_wait', 'auto_pause_on_hold']
      },
      {
        label: 'Performance Targets',
        columns: 2,
        fields: ['target_compliance_rate', 'minimum_compliance_rate']
      },
      {
        label: 'Current Performance',
        columns: 3,
        fields: ['active_cases', 'current_compliance_rate', 'violation_count']
      },
      {
        label: 'Statistics',
        columns: 3,
        fields: ['total_cases_processed', 'average_response_time', 'average_resolution_time', 'last_violation_date']
      }
    ]
  }
};

export default SLAPolicy;

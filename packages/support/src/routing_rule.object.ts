import type { ObjectSchema } from '@objectstack/spec/data';

const RoutingRule: ObjectSchema = {
  name: 'routing_rule',
  label: 'Routing Rule',
  labelPlural: 'Routing Rules',
  icon: 'route',
  description: 'Intelligent case routing rules for automatic assignment',
  enable: {
    searchEnabled: true,
    trackHistory: true
  },
  fields: {
    // Basic Information
    Name: {
      type: 'text',
      label: 'Rule Name',
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
    Priority: {
      type: 'number',
      label: 'Rule Priority',
      required: true,
      precision: 0,
      min: 1,
      defaultValue: 100,
      description: 'Lower number = higher priority (rules evaluated in priority order)'
    },
    // Target Queue
    QueueId: {
      type: 'lookup',
      label: 'Target Queue',
      reference: 'Queue',
      required: true,
      description: 'Queue to route cases to'
    },
    // Matching Criteria
    MatchCriteria: {
      type: 'select',
      label: 'Match Criteria',
      required: true,
      defaultValue: 'All',
      options: [
        { label: 'Match All Conditions (AND)', value: 'All' },
        { label: 'Match Any Condition (OR)', value: 'Any' }
      ]
    },
    // Origin Filters
    MatchOrigins: {
      type: 'multiselect',
      label: 'Match Origins',
      options: [
        { label: 'Email', value: 'Email' },
        { label: 'Web', value: 'Web' },
        { label: 'Phone', value: 'Phone' },
        { label: 'WeChat', value: 'WeChat' },
        { label: 'Chat Bot', value: 'Chat Bot' },
        { label: 'Mobile App', value: 'Mobile App' },
        { label: 'Walk-in', value: 'Walk-in' },
        { label: 'Other', value: 'Other' }
      ]
    },
    // Case Type Filters
    MatchCaseTypes: {
      type: 'multiselect',
      label: 'Match Case Types',
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
    // Priority Filters
    MatchPriorities: {
      type: 'multiselect',
      label: 'Match Priorities',
      options: [
        { label: 'Critical', value: 'Critical' },
        { label: 'High', value: 'High' },
        { label: 'Medium', value: 'Medium' },
        { label: 'Low', value: 'Low' }
      ]
    },
    // Product/Category Filters
    MatchProductIds: {
      type: 'text',
      label: 'Match Products',
      maxLength: 500,
      description: 'Comma-separated product IDs'
    },
    MatchCategories: {
      type: 'multiselect',
      label: 'Match Categories',
      options: [
        { label: 'Technical', value: 'Technical' },
        { label: 'Product', value: 'Product' },
        { label: 'Billing', value: 'Billing' },
        { label: 'Feature', value: 'Feature' },
        { label: 'Complaint', value: 'Complaint' },
        { label: 'Other', value: 'Other' }
      ]
    },
    // Customer Filters
    VIPCustomersOnly: {
      type: 'checkbox',
      label: 'VIP Customers Only',
      defaultValue: false,
      description: 'Route only VIP customer cases'
    },
    MatchAccountIds: {
      type: 'text',
      label: 'Match Accounts',
      maxLength: 1000,
      description: 'Comma-separated account IDs for specific accounts'
    },
    // Geographic Filters
    MatchRegions: {
      type: 'multiselect',
      label: 'Match Regions',
      options: [
        { label: 'North America', value: 'NA' },
        { label: 'Latin America', value: 'LATAM' },
        { label: 'Europe', value: 'EMEA' },
        { label: 'Asia Pacific', value: 'APAC' },
        { label: 'China', value: 'CN' },
        { label: 'Japan', value: 'JP' }
      ]
    },
    MatchCountries: {
      type: 'text',
      label: 'Match Countries',
      maxLength: 500,
      description: 'Comma-separated country codes (e.g., US, CN, UK)'
    },
    // AI-Based Routing
    UseAIClassification: {
      type: 'checkbox',
      label: 'Use AI Classification',
      defaultValue: false,
      description: 'Use AI to classify and route cases'
    },
    AIConfidenceThreshold: {
      type: 'number',
      label: 'AI Confidence Threshold (%)',
      precision: 0,
      min: 0,
      max: 100,
      defaultValue: 80,
      description: 'Minimum AI confidence score to apply this rule'
    },
    // Keyword Matching
    MatchKeywords: {
      type: 'text',
      label: 'Match Keywords',
      maxLength: 1000,
      description: 'Comma-separated keywords in subject/description'
    },
    KeywordMatchType: {
      type: 'select',
      label: 'Keyword Match Type',
      defaultValue: 'Any',
      options: [
        { label: 'Match Any Keyword', value: 'Any' },
        { label: 'Match All Keywords', value: 'All' },
        { label: 'Exact Phrase', value: 'Exact' }
      ]
    },
    // Time-Based Routing
    EnableTimeBasedRouting: {
      type: 'checkbox',
      label: 'Enable Time-Based Routing',
      defaultValue: false
    },
    BusinessHoursId: {
      type: 'lookup',
      label: 'Business Hours',
      reference: 'BusinessHours',
      description: 'Apply rule only during these business hours'
    },
    // Statistics
    CasesRouted: {
      type: 'number',
      label: 'Cases Routed',
      precision: 0,
      readonly: true,
      description: 'Total cases routed by this rule'
    },
    LastMatchDate: {
      type: 'datetime',
      label: 'Last Match',
      readonly: true
    },
    SuccessRate: {
      type: 'number',
      label: 'Success Rate (%)',
      precision: 2,
      readonly: true,
      description: 'Percentage of routed cases resolved within SLA'
    }
  },
  validationRules: [
    {
      name: 'AIThresholdRequired',
      errorMessage: 'AI confidence threshold is required when using AI classification',
      formula: 'AND(UseAIClassification = true, ISBLANK(AIConfidenceThreshold))'
    },
    {
      name: 'BusinessHoursRequired',
      errorMessage: 'Business hours is required when time-based routing is enabled',
      formula: 'AND(EnableTimeBasedRouting = true, ISBLANK(BusinessHoursId))'
    },
    {
      name: 'AtLeastOneCriteria',
      errorMessage: 'At least one matching criteria must be specified',
      formula: 'AND(ISBLANK(MatchOrigins), ISBLANK(MatchCaseTypes), ISBLANK(MatchPriorities), ISBLANK(MatchProductIds), ISBLANK(MatchCategories), ISBLANK(MatchAccountIds), ISBLANK(MatchRegions), ISBLANK(MatchCountries), ISBLANK(MatchKeywords), VIPCustomersOnly = false, UseAIClassification = false)'
    }
  ],
  listViews: [
    {
      name: 'AllRules',
      label: 'All Routing Rules',
      filters: [],
      columns: ['Name', 'Priority', 'QueueId', 'IsActive', 'CasesRouted', 'SuccessRate'],
      sort: [['Priority', 'asc']]
    },
    {
      name: 'ActiveRules',
      label: 'Active Rules',
      filters: [
        ['IsActive', '=', true]
      ],
      columns: ['Name', 'Priority', 'QueueId', 'CasesRouted', 'LastMatchDate', 'SuccessRate'],
      sort: [['Priority', 'asc']]
    },
    {
      name: 'ByQueue',
      label: 'By Queue',
      filters: [],
      columns: ['Name', 'QueueId', 'Priority', 'CasesRouted', 'IsActive'],
      sort: [['QueueId', 'asc'], ['Priority', 'asc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Rule Information',
        columns: 2,
        fields: ['Name', 'Description', 'Priority', 'IsActive']
      },
      {
        label: 'Target & Criteria',
        columns: 2,
        fields: ['QueueId', 'MatchCriteria']
      },
      {
        label: 'Case Matching',
        columns: 2,
        fields: ['MatchOrigins', 'MatchCaseTypes', 'MatchPriorities', 'MatchCategories']
      },
      {
        label: 'Product & Customer',
        columns: 2,
        fields: ['MatchProductIds', 'VIPCustomersOnly', 'MatchAccountIds']
      },
      {
        label: 'Geographic Routing',
        columns: 2,
        fields: ['MatchRegions', 'MatchCountries']
      },
      {
        label: 'AI & Keyword Matching',
        columns: 2,
        fields: ['UseAIClassification', 'AIConfidenceThreshold', 'MatchKeywords', 'KeywordMatchType']
      },
      {
        label: 'Time-Based Routing',
        columns: 2,
        fields: ['EnableTimeBasedRouting', 'BusinessHoursId']
      },
      {
        label: 'Performance',
        columns: 3,
        fields: ['CasesRouted', 'LastMatchDate', 'SuccessRate']
      }
    ]
  }
};

export default RoutingRule;

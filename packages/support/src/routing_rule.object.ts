
const RoutingRule = {
  name: 'routing_rule',
  label: 'Routing Rule',
  labelPlural: 'Routing Rules',
  icon: 'route',
  description: 'Intelligent case routing rules for automatic assignment',
  enable: {
    searchable: true,
    trackHistory: true
  },
  fields: {
    // Basic Information
    name: {
      type: 'text',
      label: 'Rule name',
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
    priority: {
      type: 'number',
      label: 'Rule priority',
      required: true,
      precision: 0,
      min: 1,
      defaultValue: 100,
      description: 'Lower number = higher priority (rules evaluated in priority order)'
    },
    // Target Queue
    queue_id: {
      type: 'lookup',
      label: 'Target Queue',
      reference: 'Queue',
      required: true,
      description: 'Queue to route cases to'
    },
    // Matching Criteria
    match_criteria: {
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
    match_origins: {
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
    match_case_types: {
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
    // priority Filters
    match_priorities: {
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
    match_product_ids: {
      type: 'text',
      label: 'Match Products',
      maxLength: 500,
      description: 'Comma-separated product IDs'
    },
    match_categories: {
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
    v_i_p_customers_only: {
      type: 'checkbox',
      label: 'VIP Customers Only',
      defaultValue: false,
      description: 'Route only VIP customer cases'
    },
    match_account_ids: {
      type: 'text',
      label: 'Match Accounts',
      maxLength: 1000,
      description: 'Comma-separated account IDs for specific accounts'
    },
    // Geographic Filters
    match_regions: {
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
    match_countries: {
      type: 'text',
      label: 'Match Countries',
      maxLength: 500,
      description: 'Comma-separated country codes (e.g., US, CN, UK)'
    },
    // AI-Based Routing
    use_a_i_classification: {
      type: 'checkbox',
      label: 'Use AI Classification',
      defaultValue: false,
      description: 'Use AI to classify and route cases'
    },
    ai_confidence_threshold: {
      type: 'number',
      label: 'AI Confidence Threshold (%)',
      precision: 0,
      min: 0,
      max: 100,
      defaultValue: 80,
      description: 'Minimum AI confidence score to apply this rule'
    },
    // Keyword Matching
    match_keywords: {
      type: 'text',
      label: 'Match Keywords',
      maxLength: 1000,
      description: 'Comma-separated keywords in subject/description'
    },
    keyword_match_type: {
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
    enable_time_based_routing: {
      type: 'checkbox',
      label: 'Enable Time-Based Routing',
      defaultValue: false
    },
    business_hours_id: {
      type: 'lookup',
      label: 'Business Hours',
      reference: 'BusinessHours',
      description: 'Apply rule only during these business hours'
    },
    // Statistics
    cases_routed: {
      type: 'number',
      label: 'Cases Routed',
      precision: 0,
      readonly: true,
      description: 'Total cases routed by this rule'
    },
    last_match_date: {
      type: 'datetime',
      label: 'Last Match',
      readonly: true
    },
    success_rate: {
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
      formula: 'AND(use_a_i_classification = true, ISBLANK(ai_confidence_threshold))'
    },
    {
      name: 'BusinessHoursRequired',
      errorMessage: 'Business hours is required when time-based routing is enabled',
      formula: 'AND(enable_time_based_routing = true, ISBLANK(business_hours_id))'
    },
    {
      name: 'AtLeastOneCriteria',
      errorMessage: 'At least one matching criteria must be specified',
      formula: 'AND(ISBLANK(match_origins), ISBLANK(match_case_types), ISBLANK(match_priorities), ISBLANK(match_product_ids), ISBLANK(match_categories), ISBLANK(match_account_ids), ISBLANK(match_regions), ISBLANK(match_countries), ISBLANK(match_keywords), v_i_p_customers_only = false, use_a_i_classification = false)'
    }
  ],
  listViews: [
    {
      name: 'AllRules',
      label: 'All Routing Rules',
      filters: [],
      columns: ['name', 'priority', 'queue_id', 'is_active', 'cases_routed', 'success_rate'],
      sort: [['priority', 'asc']]
    },
    {
      name: 'ActiveRules',
      label: 'Active Rules',
      filters: [
        ['is_active', '=', true]
      ],
      columns: ['name', 'priority', 'queue_id', 'cases_routed', 'last_match_date', 'success_rate'],
      sort: [['priority', 'asc']]
    },
    {
      name: 'ByQueue',
      label: 'By Queue',
      filters: [],
      columns: ['name', 'queue_id', 'priority', 'cases_routed', 'is_active'],
      sort: [['queue_id', 'asc'], ['priority', 'asc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Rule Information',
        columns: 2,
        fields: ['name', 'description', 'priority', 'is_active']
      },
      {
        label: 'Target & Criteria',
        columns: 2,
        fields: ['queue_id', 'match_criteria']
      },
      {
        label: 'Case Matching',
        columns: 2,
        fields: ['match_origins', 'match_case_types', 'match_priorities', 'match_categories']
      },
      {
        label: 'Product & Customer',
        columns: 2,
        fields: ['match_product_ids', 'v_i_p_customers_only', 'match_account_ids']
      },
      {
        label: 'Geographic Routing',
        columns: 2,
        fields: ['match_regions', 'match_countries']
      },
      {
        label: 'AI & Keyword Matching',
        columns: 2,
        fields: ['use_a_i_classification', 'ai_confidence_threshold', 'match_keywords', 'keyword_match_type']
      },
      {
        label: 'Time-Based Routing',
        columns: 2,
        fields: ['enable_time_based_routing', 'business_hours_id']
      },
      {
        label: 'Performance',
        columns: 3,
        fields: ['cases_routed', 'last_match_date', 'success_rate']
      }
    ]
  }
};

export default RoutingRule;

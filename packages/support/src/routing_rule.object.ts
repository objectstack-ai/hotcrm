import { ObjectSchema, Field } from '@objectstack/spec/data';

export const RoutingRule = ObjectSchema.create({
  name: 'routing_rule',
  label: 'Routing Rule',
  pluralLabel: 'Routing Rules',
  icon: 'route',
  description: 'Intelligent case routing rules for automatic assignment',

  fields: {
    name: Field.text({
      label: 'Rule name',
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
    priority: Field.number({
      label: 'Rule priority',
      description: 'Lower number = higher priority (rules evaluated in priority order)',
      required: true,
      defaultValue: 100,
      min: 1,
      precision: 0
    }),
    queue_id: Field.lookup('Queue', {
      label: 'Target Queue',
      description: 'Queue to route cases to',
      required: true
    }),
    match_criteria: Field.select({
      label: 'Match Criteria',
      required: true,
      defaultValue: 'All',
      options: [
        {
          "label": "Match All Conditions (AND)",
          "value": "All"
        },
        {
          "label": "Match Any Condition (OR)",
          "value": "Any"
        }
      ]
    }),
    match_origins: Field.select({ label: 'Match Origins', multiple: true, options: [] }),
    match_case_types: Field.select({ label: 'Match Case Types', multiple: true, options: [] }),
    match_priorities: Field.select({ label: 'Match Priorities', multiple: true, options: [] }),
    match_product_ids: Field.text({
      label: 'Match Products',
      description: 'Comma-separated product IDs',
      maxLength: 500
    }),
    match_categories: Field.select({ label: 'Match Categories', multiple: true, options: [] }),
    vip_customers_only: Field.boolean({
      label: 'VIP Customers Only',
      description: 'Route only VIP customer cases',
      defaultValue: false
    }),
    match_account_ids: Field.text({
      label: 'Match Accounts',
      description: 'Comma-separated account IDs for specific accounts',
      maxLength: 1000
    }),
    match_regions: Field.select({ label: 'Match Regions', multiple: true, options: [] }),
    match_countries: Field.text({
      label: 'Match Countries',
      description: 'Comma-separated country codes (e.g., US, CN, UK)',
      maxLength: 500
    }),
    use_ai_classification: Field.boolean({
      label: 'Use AI Classification',
      description: 'Use AI to classify and route cases',
      defaultValue: false
    }),
    ai_confidence_threshold: Field.number({
      label: 'AI Confidence Threshold (%)',
      description: 'Minimum AI confidence score to apply this rule',
      defaultValue: 80,
      min: 0,
      max: 100,
      precision: 0
    }),
    match_keywords: Field.text({
      label: 'Match Keywords',
      description: 'Comma-separated keywords in subject/description',
      maxLength: 1000
    }),
    keyword_match_type: Field.select({
      label: 'Keyword Match Type',
      defaultValue: 'Any',
      options: [
        {
          "label": "Match Any Keyword",
          "value": "Any"
        },
        {
          "label": "Match All Keywords",
          "value": "All"
        },
        {
          "label": "Exact Phrase",
          "value": "Exact"
        }
      ]
    }),
    enable_time_based_routing: Field.boolean({
      label: 'Enable Time-Based Routing',
      defaultValue: false
    }),
    business_hours_id: Field.lookup('BusinessHours', {
      label: 'Business Hours',
      description: 'Apply rule only during these business hours'
    }),
    cases_routed: Field.number({
      label: 'Cases Routed',
      description: 'Total cases routed by this rule',
      readonly: true,
      precision: 0
    }),
    last_match_date: Field.datetime({
      label: 'Last Match',
      readonly: true
    }),
    success_rate: Field.number({
      label: 'Success Rate (%)',
      description: 'Percentage of routed cases resolved within SLA',
      readonly: true,
      precision: 2
    })
  },

  enable: {
    searchable: true,
    trackHistory: true
  },
});
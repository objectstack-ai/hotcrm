
const PriceRule = {
  name: 'price_rule',
  label: 'Price Rule',
  labelPlural: 'Price Rules',
  icon: 'calculator',
  description: 'Pricing rules for tiered pricing, volume discounts, contract-based pricing, and promotional pricing',
  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: false
  },
  fields: {
    // Basic Information
    name: {
      type: 'text',
      label: 'Rule name',
      required: true,
      searchable: true,
      maxLength: 255
    },
    rule_code: {
      type: 'text',
      label: 'Rule Code',
      unique: true,
      searchable: true,
      maxLength: 50,
      description: 'Unique identifier for the pricing rule'
    },
    description: {
      type: 'textarea',
      label: 'description',
      maxLength: 2000
    },
    status: {
      type: 'select',
      label: 'status',
      required: true,
      defaultValue: 'Active',
      options: [
        { label: '✅ Active', value: 'Active' },
        { label: '📝 Draft', value: 'Draft' },
        { label: '🚫 Inactive', value: 'Inactive' },
        { label: '⏰ Scheduled', value: 'Scheduled' },
        { label: '⌛ Expired', value: 'Expired' }
      ]
    },
    // Rule Type
    rule_type: {
      type: 'select',
      label: 'Rule Type',
      required: true,
      options: [
        { label: 'Tiered Pricing', value: 'Tiered' },
        { label: 'Volume Discount', value: 'VolumeDiscount' },
        { label: 'Contract Pricing', value: 'ContractBased' },
        { label: 'Customer Specific', value: 'CustomerSpecific' },
        { label: 'Promotional Pricing', value: 'Promotional' },
        { label: 'Competitive Pricing', value: 'Competitive' },
        { label: 'Bundle Discount', value: 'BundleDiscount' }
      ]
    },
    // priority
    priority: {
      type: 'number',
      label: 'priority',
      precision: 0,
      required: true,
      defaultValue: 100,
      description: 'Rule execution priority (lower number = higher priority)'
    },
    // Applicability
    applies_to: {
      type: 'select',
      label: 'Applies To',
      required: true,
      options: [
        { label: 'All Products', value: 'AllProducts' },
        { label: 'Specific Product', value: 'SpecificProduct' },
        { label: 'Product Category', value: 'product_category' },
        { label: 'Product Family', value: 'product_family' },
        { label: 'Product Bundle', value: 'ProductBundle' }
      ]
    },
    product_id: {
      type: 'lookup',
      label: 'Product',
      reference: 'Product',
      description: 'Specific product this rule applies to'
    },
    product_category: {
      type: 'text',
      label: 'Product Category',
      maxLength: 100,
      description: 'Product category this rule applies to'
    },
    product_family: {
      type: 'text',
      label: 'Product Family',
      maxLength: 100,
      description: 'Product family this rule applies to'
    },
    product_bundle_id: {
      type: 'lookup',
      label: 'Product Bundle',
      reference: 'ProductBundle',
      description: 'Product bundle this rule applies to'
    },
    // Customer Scope
    customer_scope: {
      type: 'select',
      label: 'Customer Scope',
      required: true,
      defaultValue: 'AllCustomers',
      options: [
        { label: 'All Customers', value: 'AllCustomers' },
        { label: 'Specific Account', value: 'SpecificAccount' },
        { label: 'Account Type', value: 'account_type' },
        { label: 'industry', value: 'industry' },
        { label: 'Customer Segment', value: 'customer_segment' }
      ]
    },
    account_id: {
      type: 'lookup',
      label: 'Account',
      reference: 'Account',
      description: 'Specific account this rule applies to'
    },
    account_type: {
      type: 'text',
      label: 'Account Type',
      maxLength: 100,
      description: 'Account type this rule applies to'
    },
    industry: {
      type: 'text',
      label: 'industry',
      maxLength: 100,
      description: 'industry this rule applies to'
    },
    customer_segment: {
      type: 'text',
      label: 'Customer Segment',
      maxLength: 100,
      description: 'Customer segment this rule applies to'
    },
    // Date Range
    start_date: {
      type: 'date',
      label: 'Start Date',
      required: true,
      description: 'Date when rule becomes active'
    },
    end_date: {
      type: 'date',
      label: 'End Date',
      description: 'Date when rule expires'
    },
    // Pricing Configuration
    discount_type: {
      type: 'select',
      label: 'Discount Type',
      options: [
        { label: 'Percentage', value: 'Percentage' },
        { label: 'Fixed Amount', value: 'FixedAmount' },
        { label: 'New Price', value: 'new_price' }
      ]
    },
    discount_percent: {
      type: 'percent',
      label: 'Discount %',
      description: 'Discount percentage'
    },
    discount_amount: {
      type: 'currency',
      label: 'Discount Amount',
      precision: 2,
      description: 'Fixed discount amount'
    },
    new_price: {
      type: 'currency',
      label: 'New Price',
      precision: 2,
      description: 'Overridden price'
    },
    // Volume Tiers
    use_tiered_pricing: {
      type: 'checkbox',
      label: 'Use Tiered Pricing',
      defaultValue: false,
      description: 'Enable quantity-based tiered pricing'
    },
    minimum_quantity: {
      type: 'number',
      label: 'Minimum Quantity',
      precision: 0,
      description: 'Minimum quantity required for rule to apply'
    },
    maximum_quantity: {
      type: 'number',
      label: 'Maximum Quantity',
      precision: 0,
      description: 'Maximum quantity for rule applicability'
    },
    // Contract-Based Pricing
    contract_id: {
      type: 'lookup',
      label: 'Contract',
      reference: 'Contract',
      description: 'Contract this pricing rule is associated with'
    },
    require_contract: {
      type: 'checkbox',
      label: 'Require Contract',
      defaultValue: false,
      description: 'Rule only applies if customer has an active contract'
    },
    // Promotional
    promotion_code: {
      type: 'text',
      label: 'Promotion Code',
      maxLength: 50,
      description: 'Promotion code for customer entry'
    },
    is_public: {
      type: 'checkbox',
      label: 'Public Promotion',
      defaultValue: false,
      description: 'Publicly advertised promotion'
    },
    usage_limit: {
      type: 'number',
      label: 'Usage Limit',
      precision: 0,
      description: 'Maximum number of times rule can be used'
    },
    usage_count: {
      type: 'number',
      label: 'Usage Count',
      precision: 0,
      readonly: true,
      defaultValue: 0,
      description: 'Current usage count'
    },
    // Stackability
    allow_stacking: {
      type: 'checkbox',
      label: 'Allow Stacking',
      defaultValue: false,
      description: 'Allow combining with other pricing rules'
    },
    exclusion_rules: {
      type: 'textarea',
      label: 'Exclusion Rules',
      maxLength: 2000,
      description: 'Rules that cannot be combined with this rule (comma-separated rule codes)'
    },
    // Competitive Pricing
    competitor_price: {
      type: 'currency',
      label: 'Competitor Price',
      precision: 2,
      description: 'Competitor reference price'
    },
    competitor_name: {
      type: 'text',
      label: 'Competitor name',
      maxLength: 255,
      description: 'Competitor being matched or beaten'
    },
    price_match_strategy: {
      type: 'select',
      label: 'Price Match Strategy',
      options: [
        { label: 'Match Competitor', value: 'Match' },
        { label: 'Beat by %', value: 'beat_by_percent' },
        { label: 'Beat by Amount', value: 'beat_by_amount' }
      ]
    },
    beat_by_percent: {
      type: 'percent',
      label: 'Beat By %',
      description: 'Percentage to beat competitor price by'
    },
    beat_by_amount: {
      type: 'currency',
      label: 'Beat By Amount',
      precision: 2,
      description: 'Amount to beat competitor price by'
    },
    // Approval
    requires_approval: {
      type: 'checkbox',
      label: 'Requires Approval',
      defaultValue: false,
      description: 'Rule requires approval before activation'
    },
    approval_status: {
      type: 'select',
      label: 'Approval status',
      readonly: true,
      defaultValue: 'Not Required',
      options: [
        { label: 'Not Required', value: 'Not Required' },
        { label: 'Pending', value: 'Pending' },
        { label: 'Approved', value: 'Approved' },
        { label: 'Rejected', value: 'Rejected' }
      ]
    },
    approved_by_id: {
      type: 'lookup',
      label: 'Approved By',
      reference: 'User',
      readonly: true
    },
    approved_date: {
      type: 'datetime',
      label: 'Approved Date',
      readonly: true
    },
    // AI Enhancement
    ai_optimal_discount_percent: {
      type: 'percent',
      label: 'AI Optimal Discount',
      readonly: true,
      description: 'AI-recommended optimal discount percentage'
    },
    ai_expected_impact: {
      type: 'textarea',
      label: 'AI Expected Impact',
      readonly: true,
      maxLength: 2000,
      description: 'AI analysis of expected revenue and margin impact'
    },
    ai_competitive_analysis: {
      type: 'textarea',
      label: 'AI Competitive Analysis',
      readonly: true,
      maxLength: 2000,
      description: 'AI-powered competitive pricing insights'
    }
  },
  relationships: [
    {
      name: 'PriceTiers',
      type: 'hasMany',
      object: 'PriceTier',
      foreignKey: 'price_rule_id',
      label: 'Price Tiers'
    },
    {
      name: 'AppliedQuotes',
      type: 'hasMany',
      object: 'Quote',
      foreignKey: 'price_rule_id',
      label: 'Applied Quotes'
    }
  ],
  listViews: [
    {
      name: 'AllRules',
      label: 'All Price Rules',
      filters: [],
      columns: ['name', 'rule_code', 'rule_type', 'status', 'priority', 'start_date', 'end_date'],
      sort: [['priority', 'asc']]
    },
    {
      name: 'ActiveRules',
      label: 'Active Rules',
      filters: [['status', '=', 'Active']],
      columns: ['name', 'rule_type', 'applies_to', 'customer_scope', 'priority', 'end_date'],
      sort: [['priority', 'asc']]
    },
    {
      name: 'PromotionalRules',
      label: 'Promotional',
      filters: [['rule_type', '=', 'Promotional']],
      columns: ['name', 'promotion_code', 'discount_percent', 'start_date', 'end_date', 'usage_count', 'usage_limit'],
      sort: [['start_date', 'desc']]
    },
    {
      name: 'ContractPricing',
      label: 'Contract Pricing',
      filters: [['rule_type', '=', 'ContractBased']],
      columns: ['name', 'contract_id', 'account_id', 'discount_percent', 'start_date', 'end_date'],
      sort: [['start_date', 'desc']]
    },
    {
      name: 'VolumeDiscounts',
      label: 'Volume Discounts',
      filters: [['rule_type', '=', 'VolumeDiscount']],
      columns: ['name', 'product_id', 'minimum_quantity', 'discount_percent', 'status'],
      sort: [['minimum_quantity', 'asc']]
    },
    {
      name: 'ExpiringRules',
      label: 'Expiring Soon',
      filters: [
        ['status', '=', 'Active'],
        ['end_date', 'next_n_days', 30]
      ],
      columns: ['name', 'rule_type', 'end_date', 'usage_count', 'usage_limit'],
      sort: [['end_date', 'asc']]
    },
    {
      name: 'PendingApproval',
      label: 'Pending Approval',
      filters: [['approval_status', '=', 'Pending']],
      columns: ['name', 'rule_type', 'discount_percent', 'requires_approval', 'CreatedDate'],
      sort: [['CreatedDate', 'asc']]
    }
  ],
  validationRules: [
    {
      name: 'EndDateAfterStartDate',
      errorMessage: 'End date must be after start date',
      formula: 'AND(NOT(ISBLANK(start_date)), NOT(ISBLANK(end_date)), end_date <= start_date)'
    },
    {
      name: 'DiscountTypeRequired',
      errorMessage: 'Discount type is required',
      formula: 'AND(rule_type IN ("VolumeDiscount", "Promotional", "CustomerSpecific"), ISBLANK(discount_type))'
    },
    {
      name: 'DiscountPercentValid',
      errorMessage: 'Discount percentage must be between 0% and 100%',
      formula: 'AND(discount_type = "Percentage", OR(discount_percent < 0, discount_percent > 1))'
    },
    {
      name: 'DiscountAmountRequired',
      errorMessage: 'Discount amount is required when discount type is Fixed Amount',
      formula: 'AND(discount_type = "FixedAmount", ISBLANK(discount_amount))'
    },
    {
      name: 'NewPriceRequired',
      errorMessage: 'New price is required when discount type is New Price',
      formula: 'AND(discount_type = "new_price", ISBLANK(new_price))'
    },
    {
      name: 'ProductRequired',
      errorMessage: 'Product is required when applies to specific product',
      formula: 'AND(applies_to = "SpecificProduct", ISBLANK(product_id))'
    },
    {
      name: 'AccountRequired',
      errorMessage: 'Account is required when customer scope is specific account',
      formula: 'AND(customer_scope = "SpecificAccount", ISBLANK(account_id))'
    },
    {
      name: 'ContractRequired',
      errorMessage: 'Contract is required when rule type is contract-based',
      formula: 'AND(rule_type = "ContractBased", ISBLANK(contract_id))'
    },
    {
      name: 'PromotionCodeRequired',
      errorMessage: 'Promotion code is required for promotional rules',
      formula: 'AND(rule_type = "Promotional", ISBLANK(promotion_code))'
    },
    {
      name: 'MinMaxQuantityValid',
      errorMessage: 'Maximum quantity must be greater than minimum quantity',
      formula: 'AND(NOT(ISBLANK(minimum_quantity)), NOT(ISBLANK(maximum_quantity)), maximum_quantity < minimum_quantity)'
    },
    {
      name: 'CompetitorPriceRequired',
      errorMessage: 'Competitor price is required for competitive pricing rules',
      formula: 'AND(rule_type = "Competitive", ISBLANK(competitor_price))'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Rule Information',
        columns: 2,
        fields: ['name', 'rule_code', 'status', 'rule_type', 'priority', 'description']
      },
      {
        label: 'Applicability',
        columns: 2,
        fields: ['applies_to', 'product_id', 'product_category', 'product_family', 'product_bundle_id']
      },
      {
        label: 'Customer Scope',
        columns: 2,
        fields: ['customer_scope', 'account_id', 'account_type', 'industry', 'customer_segment']
      },
      {
        label: 'Date Range',
        columns: 2,
        fields: ['start_date', 'end_date']
      },
      {
        label: 'Pricing Configuration',
        columns: 2,
        fields: ['discount_type', 'discount_percent', 'discount_amount', 'new_price']
      },
      {
        label: 'Volume & Tiered Pricing',
        columns: 2,
        fields: ['use_tiered_pricing', 'minimum_quantity', 'maximum_quantity']
      },
      {
        label: 'Contract-Based Pricing',
        columns: 2,
        fields: ['contract_id', 'require_contract']
      },
      {
        label: 'Promotional Settings',
        columns: 2,
        fields: ['promotion_code', 'is_public', 'usage_limit', 'usage_count']
      },
      {
        label: 'Stackability',
        columns: 2,
        fields: ['allow_stacking', 'exclusion_rules']
      },
      {
        label: 'Competitive Pricing',
        columns: 2,
        fields: ['competitor_name', 'competitor_price', 'price_match_strategy', 'beat_by_percent', 'beat_by_amount']
      },
      {
        label: 'Approval',
        columns: 2,
        fields: ['requires_approval', 'approval_status', 'approved_by_id', 'approved_date']
      },
      {
        label: 'AI Insights',
        columns: 1,
        fields: ['ai_optimal_discount_percent', 'ai_expected_impact', 'ai_competitive_analysis']
      }
    ]
  }
};

export default PriceRule;

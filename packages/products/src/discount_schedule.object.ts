
const DiscountSchedule = {
  name: 'discount_schedule',
  label: 'Discount Schedule',
  labelPlural: 'Discount Schedules',
  icon: 'percent',
  description: 'Discount schedules with date ranges, approval workflows, and margin protection',
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
      label: 'Schedule name',
      required: true,
      searchable: true,
      maxLength: 255
    },
    schedule_code: {
      type: 'text',
      label: 'Schedule Code',
      unique: true,
      searchable: true,
      maxLength: 50,
      description: 'Unique identifier for the discount schedule'
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
    // Schedule Type
    schedule_type: {
      type: 'select',
      label: 'Schedule Type',
      required: true,
      options: [
        { label: 'Seasonal Discount', value: 'Seasonal' },
        { label: 'Promotional Campaign', value: 'Promotional' },
        { label: 'Clearance Sale', value: 'Clearance' },
        { label: 'Early Bird Discount', value: 'EarlyBird' },
        { label: 'End of Quarter', value: 'EndOfQuarter' },
        { label: 'Volume-Based', value: 'VolumeBased' },
        { label: 'Loyalty Program', value: 'LoyaltyProgram' },
        { label: 'New Customer', value: 'NewCustomer' }
      ]
    },
    // Date Range
    start_date: {
      type: 'datetime',
      label: 'Start Date',
      required: true,
      description: 'When discount becomes effective'
    },
    end_date: {
      type: 'datetime',
      label: 'End Date',
      required: true,
      description: 'When discount expires'
    },
    is_recurring: {
      type: 'checkbox',
      label: 'Recurring',
      defaultValue: false,
      description: 'Schedule repeats annually'
    },
    recurrence_pattern: {
      type: 'text',
      label: 'Recurrence Pattern',
      maxLength: 100,
      description: 'e.g., "Every January 1-31", "Q4 Every Year"'
    },
    // Discount Configuration
    discount_type: {
      type: 'select',
      label: 'Discount Type',
      required: true,
      options: [
        { label: 'Percentage', value: 'Percentage' },
        { label: 'Fixed Amount', value: 'FixedAmount' },
        { label: 'Tiered', value: 'Tiered' }
      ]
    },
    default_discount_percent: {
      type: 'percent',
      label: 'Default Discount %',
      description: 'Default discount percentage'
    },
    default_discount_amount: {
      type: 'currency',
      label: 'Default Discount Amount',
      precision: 2,
      description: 'Default fixed discount amount'
    },
    minimum_discount_percent: {
      type: 'percent',
      label: 'Minimum Discount %',
      description: 'Minimum allowed discount percentage'
    },
    maximum_discount_percent: {
      type: 'percent',
      label: 'Maximum Discount %',
      description: 'Maximum allowed discount percentage'
    },
    // Applicability
    applies_to: {
      type: 'select',
      label: 'Applies To',
      required: true,
      options: [
        { label: 'All Products', value: 'AllProducts' },
        { label: 'Product Category', value: 'product_category' },
        { label: 'Product Family', value: 'product_family' },
        { label: 'Specific Products', value: 'SpecificProducts' },
        { label: 'Product Bundles', value: 'ProductBundles' }
      ]
    },
    product_category: {
      type: 'text',
      label: 'Product Category',
      maxLength: 100
    },
    product_family: {
      type: 'text',
      label: 'Product Family',
      maxLength: 100
    },
    included_products: {
      type: 'textarea',
      label: 'Included Products',
      maxLength: 2000,
      description: 'Comma-separated list of product codes'
    },
    excluded_products: {
      type: 'textarea',
      label: 'Excluded Products',
      maxLength: 2000,
      description: 'Comma-separated list of excluded product codes'
    },
    // Customer Scope
    customer_scope: {
      type: 'select',
      label: 'Customer Scope',
      required: true,
      defaultValue: 'AllCustomers',
      options: [
        { label: 'All Customers', value: 'AllCustomers' },
        { label: 'New Customers', value: 'NewCustomers' },
        { label: 'Existing Customers', value: 'ExistingCustomers' },
        { label: 'VIP Customers', value: 'VIPCustomers' },
        { label: 'Specific Accounts', value: 'SpecificAccounts' },
        { label: 'Customer Segment', value: 'customer_segment' },
        { label: 'industry', value: 'industry' }
      ]
    },
    customer_segment: {
      type: 'text',
      label: 'Customer Segment',
      maxLength: 100
    },
    industry: {
      type: 'text',
      label: 'industry',
      maxLength: 100
    },
    included_accounts: {
      type: 'textarea',
      label: 'Included Accounts',
      maxLength: 2000,
      description: 'Comma-separated list of account IDs'
    },
    // Approval Requirements
    requires_approval: {
      type: 'checkbox',
      label: 'Requires Approval',
      defaultValue: false,
      description: 'Discounts from this schedule require approval'
    },
    approval_level: {
      type: 'number',
      label: 'Approval Level',
      precision: 0,
      description: 'Required approval level (1-5)'
    },
    auto_approve_threshold: {
      type: 'percent',
      label: 'Auto-Approve Threshold',
      description: 'Discount % below which auto-approval applies'
    },
    approval_matrix_id: {
      type: 'lookup',
      label: 'Approval Matrix',
      reference: 'ApprovalMatrix',
      description: 'Custom approval matrix for this schedule'
    },
    // Margin Protection
    enforce_margin_rules: {
      type: 'checkbox',
      label: 'Enforce Margin Rules',
      defaultValue: true,
      description: 'Enforce minimum margin requirements'
    },
    minimum_margin_percent: {
      type: 'percent',
      label: 'Minimum Margin %',
      description: 'Minimum acceptable profit margin percentage'
    },
    minimum_margin_amount: {
      type: 'currency',
      label: 'Minimum Margin Amount',
      precision: 2,
      description: 'Minimum acceptable profit margin amount'
    },
    alert_below_margin: {
      type: 'checkbox',
      label: 'Alert Below Margin',
      defaultValue: true,
      description: 'Alert when margin falls below threshold'
    },
    block_below_margin: {
      type: 'checkbox',
      label: 'Block Below Margin',
      defaultValue: false,
      description: 'Prevent quotes below minimum margin'
    },
    // Usage Limits
    usage_limit_type: {
      type: 'select',
      label: 'Usage Limit Type',
      options: [
        { label: 'Unlimited', value: 'Unlimited' },
        { label: 'Total Uses', value: 'TotalUses' },
        { label: 'Per Customer', value: 'PerCustomer' },
        { label: 'Per Product', value: 'PerProduct' }
      ],
      defaultValue: 'Unlimited'
    },
    max_total_uses: {
      type: 'number',
      label: 'Max Total Uses',
      precision: 0,
      description: 'Maximum total number of times schedule can be used'
    },
    max_uses_per_customer: {
      type: 'number',
      label: 'Max Uses Per Customer',
      precision: 0,
      description: 'Maximum uses per customer'
    },
    max_uses_per_product: {
      type: 'number',
      label: 'Max Uses Per Product',
      precision: 0,
      description: 'Maximum uses per product'
    },
    current_usage_count: {
      type: 'number',
      label: 'Current Usage Count',
      precision: 0,
      readonly: true,
      defaultValue: 0,
      description: 'Current number of uses'
    },
    // Financial Constraints
    minimum_order_value: {
      type: 'currency',
      label: 'Minimum Order Value',
      precision: 2,
      description: 'Minimum order value required to apply discount'
    },
    maximum_order_value: {
      type: 'currency',
      label: 'Maximum Order Value',
      precision: 2,
      description: 'Maximum order value for discount applicability'
    },
    minimum_quantity: {
      type: 'number',
      label: 'Minimum Quantity',
      precision: 0,
      description: 'Minimum product quantity required'
    },
    // Combination Rules
    allow_combine_with_other: {
      type: 'checkbox',
      label: 'Allow Combine with Other Discounts',
      defaultValue: false,
      description: 'Can be combined with other discount schedules'
    },
    priority: {
      type: 'number',
      label: 'priority',
      precision: 0,
      defaultValue: 100,
      description: 'priority when multiple schedules apply (lower = higher priority)'
    },
    exclusive_with: {
      type: 'textarea',
      label: 'Exclusive With',
      maxLength: 2000,
      description: 'Comma-separated list of schedule codes that cannot be combined'
    },
    // Analytics & Reporting
    target_revenue: {
      type: 'currency',
      label: 'Target Revenue',
      precision: 2,
      description: 'Revenue target for this promotion'
    },
    actual_revenue: {
      type: 'currency',
      label: 'Actual Revenue',
      precision: 2,
      readonly: true,
      description: 'Actual revenue generated'
    },
    target_uses: {
      type: 'number',
      label: 'Target Uses',
      precision: 0,
      description: 'Target number of uses'
    },
    conversion_rate: {
      type: 'percent',
      label: 'Conversion Rate',
      readonly: true,
      description: 'Quote to deal conversion rate'
    },
    average_discount_given: {
      type: 'percent',
      label: 'Average Discount Given',
      readonly: true,
      description: 'Average discount percentage given'
    },
    total_discount_amount: {
      type: 'currency',
      label: 'Total Discount Amount',
      precision: 2,
      readonly: true,
      description: 'Total discount amount given'
    },
    // AI Enhancement
    ai_optimal_discount_percent: {
      type: 'percent',
      label: 'AI Optimal Discount',
      readonly: true,
      description: 'AI-recommended optimal discount percentage'
    },
    ai_expected_r_o_i: {
      type: 'percent',
      label: 'AI Expected ROI',
      readonly: true,
      description: 'AI-predicted return on investment'
    },
    ai_recommended_duration: {
      type: 'number',
      label: 'AI Recommended Duration (Days)',
      precision: 0,
      readonly: true,
      description: 'AI-suggested optimal campaign duration'
    },
    ai_performance_analysis: {
      type: 'textarea',
      label: 'AI Performance Analysis',
      readonly: true,
      maxLength: 2000,
      description: 'AI analysis of schedule performance'
    }
  },
  relationships: [
    {
      name: 'DiscountTiers',
      type: 'hasMany',
      object: 'DiscountTier',
      foreignKey: 'discount_schedule_id',
      label: 'Discount Tiers'
    },
    {
      name: 'AppliedQuotes',
      type: 'hasMany',
      object: 'Quote',
      foreignKey: 'discount_schedule_id',
      label: 'Applied Quotes'
    }
  ],
  listViews: [
    {
      name: 'AllSchedules',
      label: 'All Schedules',
      filters: [],
      columns: ['name', 'schedule_code', 'schedule_type', 'status', 'start_date', 'end_date'],
      sort: [['start_date', 'desc']]
    },
    {
      name: 'ActiveSchedules',
      label: 'Active Schedules',
      filters: [['status', '=', 'Active']],
      columns: ['name', 'schedule_type', 'default_discount_percent', 'start_date', 'end_date', 'current_usage_count'],
      sort: [['priority', 'asc']]
    },
    {
      name: 'CurrentPromotions',
      label: 'Current Promotions',
      filters: [
        ['status', '=', 'Active'],
        ['start_date', '<=', '$today'],
        ['end_date', '>=', '$today']
      ],
      columns: ['name', 'schedule_type', 'default_discount_percent', 'end_date', 'current_usage_count', 'max_total_uses'],
      sort: [['end_date', 'asc']]
    },
    {
      name: 'UpcomingSchedules',
      label: 'Upcoming',
      filters: [
        ['status', 'in', ['Active', 'Scheduled']],
        ['start_date', '>', '$today']
      ],
      columns: ['name', 'schedule_type', 'default_discount_percent', 'start_date', 'end_date'],
      sort: [['start_date', 'asc']]
    },
    {
      name: 'ExpiringSchedules',
      label: 'Expiring Soon',
      filters: [
        ['status', '=', 'Active'],
        ['end_date', 'next_n_days', 7]
      ],
      columns: ['name', 'schedule_type', 'end_date', 'current_usage_count', 'actual_revenue', 'target_revenue'],
      sort: [['end_date', 'asc']]
    },
    {
      name: 'HighPerformance',
      label: 'High Performance',
      filters: [
        ['status', '=', 'Active'],
        ['conversion_rate', '>', 0.5]
      ],
      columns: ['name', 'conversion_rate', 'actual_revenue', 'average_discount_given', 'current_usage_count'],
      sort: [['conversion_rate', 'desc']]
    },
    {
      name: 'RequiringApproval',
      label: 'Requiring Approval',
      filters: [
        ['status', '=', 'Active'],
        ['requires_approval', '=', true]
      ],
      columns: ['name', 'maximum_discount_percent', 'approval_level', 'current_usage_count'],
      sort: [['approval_level', 'desc']]
    },
    {
      name: 'RecurringSchedules',
      label: 'Recurring',
      filters: [['is_recurring', '=', true]],
      columns: ['name', 'schedule_type', 'recurrence_pattern', 'default_discount_percent', 'status'],
      sort: [['name', 'asc']]
    }
  ],
  validationRules: [
    {
      name: 'EndDateAfterStartDate',
      errorMessage: 'End date must be after start date',
      formula: 'end_date <= start_date'
    },
    {
      name: 'DiscountTypeConfiguration',
      errorMessage: 'Default discount percent or amount must be specified based on discount type',
      formula: 'AND(discount_type = "Percentage", ISBLANK(default_discount_percent))'
    },
    {
      name: 'MinMaxDiscountValid',
      errorMessage: 'Maximum discount must be greater than minimum discount',
      formula: 'AND(NOT(ISBLANK(minimum_discount_percent)), NOT(ISBLANK(maximum_discount_percent)), maximum_discount_percent < minimum_discount_percent)'
    },
    {
      name: 'DiscountPercentValid',
      errorMessage: 'Discount percentages must be between 0% and 100%',
      formula: 'OR(default_discount_percent > 1, minimum_discount_percent > 1, maximum_discount_percent > 1, default_discount_percent < 0, minimum_discount_percent < 0, maximum_discount_percent < 0)'
    },
    {
      name: 'MinMaxOrderValueValid',
      errorMessage: 'Maximum order value must be greater than minimum order value',
      formula: 'AND(NOT(ISBLANK(minimum_order_value)), NOT(ISBLANK(maximum_order_value)), maximum_order_value < minimum_order_value)'
    },
    {
      name: 'ApprovalLevelValid',
      errorMessage: 'Approval level must be between 1 and 5',
      formula: 'AND(requires_approval = true, NOT(ISBLANK(approval_level)), OR(approval_level < 1, approval_level > 5))'
    },
    {
      name: 'RecurrencePatternRequired',
      errorMessage: 'Recurrence pattern is required for recurring schedules',
      formula: 'AND(is_recurring = true, ISBLANK(recurrence_pattern))'
    },
    {
      name: 'ProductCategoryRequired',
      errorMessage: 'Product category is required when applies to is Product Category',
      formula: 'AND(applies_to = "product_category", ISBLANK(product_category))'
    },
    {
      name: 'MarginPercentValid',
      errorMessage: 'Minimum margin percentage must be between 0% and 100%',
      formula: 'AND(NOT(ISBLANK(minimum_margin_percent)), OR(minimum_margin_percent < 0, minimum_margin_percent > 1))'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Schedule Information',
        columns: 2,
        fields: ['name', 'schedule_code', 'status', 'schedule_type', 'priority', 'description']
      },
      {
        label: 'Date Range',
        columns: 2,
        fields: ['start_date', 'end_date', 'is_recurring', 'recurrence_pattern']
      },
      {
        label: 'Discount Configuration',
        columns: 2,
        fields: ['discount_type', 'default_discount_percent', 'default_discount_amount', 'minimum_discount_percent', 'maximum_discount_percent']
      },
      {
        label: 'Applicability',
        columns: 2,
        fields: ['applies_to', 'product_category', 'product_family', 'included_products', 'excluded_products']
      },
      {
        label: 'Customer Scope',
        columns: 2,
        fields: ['customer_scope', 'customer_segment', 'industry', 'included_accounts']
      },
      {
        label: 'Approval Requirements',
        columns: 2,
        fields: ['requires_approval', 'approval_level', 'auto_approve_threshold', 'approval_matrix_id']
      },
      {
        label: 'Margin Protection',
        columns: 2,
        fields: ['enforce_margin_rules', 'minimum_margin_percent', 'minimum_margin_amount', 'alert_below_margin', 'block_below_margin']
      },
      {
        label: 'Usage Limits',
        columns: 2,
        fields: ['usage_limit_type', 'max_total_uses', 'max_uses_per_customer', 'max_uses_per_product', 'current_usage_count']
      },
      {
        label: 'Financial Constraints',
        columns: 2,
        fields: ['minimum_order_value', 'maximum_order_value', 'minimum_quantity']
      },
      {
        label: 'Combination Rules',
        columns: 2,
        fields: ['allow_combine_with_other', 'exclusive_with']
      },
      {
        label: 'Analytics & Targets',
        columns: 2,
        fields: ['target_revenue', 'actual_revenue', 'target_uses', 'conversion_rate', 'average_discount_given', 'total_discount_amount']
      },
      {
        label: 'AI Insights',
        columns: 1,
        fields: ['ai_optimal_discount_percent', 'ai_expected_r_o_i', 'ai_recommended_duration', 'ai_performance_analysis']
      }
    ]
  }
};

export default DiscountSchedule;

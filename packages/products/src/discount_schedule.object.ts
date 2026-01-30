import type { ServiceObject } from '@objectstack/spec/data';

const DiscountSchedule = {
  name: 'discount_schedule',
  label: 'Discount Schedule',
  labelPlural: 'Discount Schedules',
  icon: 'percent',
  description: 'Discount schedules with date ranges, approval workflows, and margin protection',
  capabilities: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: false
  },
  fields: {
    // Basic Information
    Name: {
      type: 'text',
      label: 'Schedule Name',
      required: true,
      searchable: true,
      maxLength: 255
    },
    ScheduleCode: {
      type: 'text',
      label: 'Schedule Code',
      unique: true,
      searchable: true,
      maxLength: 50,
      description: 'Unique identifier for the discount schedule'
    },
    Description: {
      type: 'textarea',
      label: 'Description',
      maxLength: 2000
    },
    Status: {
      type: 'select',
      label: 'Status',
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
    ScheduleType: {
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
    StartDate: {
      type: 'datetime',
      label: 'Start Date',
      required: true,
      description: 'When discount becomes effective'
    },
    EndDate: {
      type: 'datetime',
      label: 'End Date',
      required: true,
      description: 'When discount expires'
    },
    IsRecurring: {
      type: 'checkbox',
      label: 'Recurring',
      defaultValue: false,
      description: 'Schedule repeats annually'
    },
    RecurrencePattern: {
      type: 'text',
      label: 'Recurrence Pattern',
      maxLength: 100,
      description: 'e.g., "Every January 1-31", "Q4 Every Year"'
    },
    // Discount Configuration
    DiscountType: {
      type: 'select',
      label: 'Discount Type',
      required: true,
      options: [
        { label: 'Percentage', value: 'Percentage' },
        { label: 'Fixed Amount', value: 'FixedAmount' },
        { label: 'Tiered', value: 'Tiered' }
      ]
    },
    DefaultDiscountPercent: {
      type: 'percent',
      label: 'Default Discount %',
      description: 'Default discount percentage'
    },
    DefaultDiscountAmount: {
      type: 'currency',
      label: 'Default Discount Amount',
      precision: 2,
      description: 'Default fixed discount amount'
    },
    MinimumDiscountPercent: {
      type: 'percent',
      label: 'Minimum Discount %',
      description: 'Minimum allowed discount percentage'
    },
    MaximumDiscountPercent: {
      type: 'percent',
      label: 'Maximum Discount %',
      description: 'Maximum allowed discount percentage'
    },
    // Applicability
    AppliesTo: {
      type: 'select',
      label: 'Applies To',
      required: true,
      options: [
        { label: 'All Products', value: 'AllProducts' },
        { label: 'Product Category', value: 'ProductCategory' },
        { label: 'Product Family', value: 'ProductFamily' },
        { label: 'Specific Products', value: 'SpecificProducts' },
        { label: 'Product Bundles', value: 'ProductBundles' }
      ]
    },
    ProductCategory: {
      type: 'text',
      label: 'Product Category',
      maxLength: 100
    },
    ProductFamily: {
      type: 'text',
      label: 'Product Family',
      maxLength: 100
    },
    IncludedProducts: {
      type: 'textarea',
      label: 'Included Products',
      maxLength: 2000,
      description: 'Comma-separated list of product codes'
    },
    ExcludedProducts: {
      type: 'textarea',
      label: 'Excluded Products',
      maxLength: 2000,
      description: 'Comma-separated list of excluded product codes'
    },
    // Customer Scope
    CustomerScope: {
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
        { label: 'Customer Segment', value: 'CustomerSegment' },
        { label: 'Industry', value: 'Industry' }
      ]
    },
    CustomerSegment: {
      type: 'text',
      label: 'Customer Segment',
      maxLength: 100
    },
    Industry: {
      type: 'text',
      label: 'Industry',
      maxLength: 100
    },
    IncludedAccounts: {
      type: 'textarea',
      label: 'Included Accounts',
      maxLength: 2000,
      description: 'Comma-separated list of account IDs'
    },
    // Approval Requirements
    RequiresApproval: {
      type: 'checkbox',
      label: 'Requires Approval',
      defaultValue: false,
      description: 'Discounts from this schedule require approval'
    },
    ApprovalLevel: {
      type: 'number',
      label: 'Approval Level',
      precision: 0,
      description: 'Required approval level (1-5)'
    },
    AutoApproveThreshold: {
      type: 'percent',
      label: 'Auto-Approve Threshold',
      description: 'Discount % below which auto-approval applies'
    },
    ApprovalMatrixId: {
      type: 'lookup',
      label: 'Approval Matrix',
      reference: 'ApprovalMatrix',
      description: 'Custom approval matrix for this schedule'
    },
    // Margin Protection
    EnforceMarginRules: {
      type: 'checkbox',
      label: 'Enforce Margin Rules',
      defaultValue: true,
      description: 'Enforce minimum margin requirements'
    },
    MinimumMarginPercent: {
      type: 'percent',
      label: 'Minimum Margin %',
      description: 'Minimum acceptable profit margin percentage'
    },
    MinimumMarginAmount: {
      type: 'currency',
      label: 'Minimum Margin Amount',
      precision: 2,
      description: 'Minimum acceptable profit margin amount'
    },
    AlertBelowMargin: {
      type: 'checkbox',
      label: 'Alert Below Margin',
      defaultValue: true,
      description: 'Alert when margin falls below threshold'
    },
    BlockBelowMargin: {
      type: 'checkbox',
      label: 'Block Below Margin',
      defaultValue: false,
      description: 'Prevent quotes below minimum margin'
    },
    // Usage Limits
    UsageLimitType: {
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
    MaxTotalUses: {
      type: 'number',
      label: 'Max Total Uses',
      precision: 0,
      description: 'Maximum total number of times schedule can be used'
    },
    MaxUsesPerCustomer: {
      type: 'number',
      label: 'Max Uses Per Customer',
      precision: 0,
      description: 'Maximum uses per customer'
    },
    MaxUsesPerProduct: {
      type: 'number',
      label: 'Max Uses Per Product',
      precision: 0,
      description: 'Maximum uses per product'
    },
    CurrentUsageCount: {
      type: 'number',
      label: 'Current Usage Count',
      precision: 0,
      readonly: true,
      defaultValue: 0,
      description: 'Current number of uses'
    },
    // Financial Constraints
    MinimumOrderValue: {
      type: 'currency',
      label: 'Minimum Order Value',
      precision: 2,
      description: 'Minimum order value required to apply discount'
    },
    MaximumOrderValue: {
      type: 'currency',
      label: 'Maximum Order Value',
      precision: 2,
      description: 'Maximum order value for discount applicability'
    },
    MinimumQuantity: {
      type: 'number',
      label: 'Minimum Quantity',
      precision: 0,
      description: 'Minimum product quantity required'
    },
    // Combination Rules
    AllowCombineWithOther: {
      type: 'checkbox',
      label: 'Allow Combine with Other Discounts',
      defaultValue: false,
      description: 'Can be combined with other discount schedules'
    },
    Priority: {
      type: 'number',
      label: 'Priority',
      precision: 0,
      defaultValue: 100,
      description: 'Priority when multiple schedules apply (lower = higher priority)'
    },
    ExclusiveWith: {
      type: 'textarea',
      label: 'Exclusive With',
      maxLength: 2000,
      description: 'Comma-separated list of schedule codes that cannot be combined'
    },
    // Analytics & Reporting
    TargetRevenue: {
      type: 'currency',
      label: 'Target Revenue',
      precision: 2,
      description: 'Revenue target for this promotion'
    },
    ActualRevenue: {
      type: 'currency',
      label: 'Actual Revenue',
      precision: 2,
      readonly: true,
      description: 'Actual revenue generated'
    },
    TargetUses: {
      type: 'number',
      label: 'Target Uses',
      precision: 0,
      description: 'Target number of uses'
    },
    ConversionRate: {
      type: 'percent',
      label: 'Conversion Rate',
      readonly: true,
      description: 'Quote to deal conversion rate'
    },
    AverageDiscountGiven: {
      type: 'percent',
      label: 'Average Discount Given',
      readonly: true,
      description: 'Average discount percentage given'
    },
    TotalDiscountAmount: {
      type: 'currency',
      label: 'Total Discount Amount',
      precision: 2,
      readonly: true,
      description: 'Total discount amount given'
    },
    // AI Enhancement
    AIOptimalDiscountPercent: {
      type: 'percent',
      label: 'AI Optimal Discount',
      readonly: true,
      description: 'AI-recommended optimal discount percentage'
    },
    AIExpectedROI: {
      type: 'percent',
      label: 'AI Expected ROI',
      readonly: true,
      description: 'AI-predicted return on investment'
    },
    AIRecommendedDuration: {
      type: 'number',
      label: 'AI Recommended Duration (Days)',
      precision: 0,
      readonly: true,
      description: 'AI-suggested optimal campaign duration'
    },
    AIPerformanceAnalysis: {
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
      foreignKey: 'DiscountScheduleId',
      label: 'Discount Tiers'
    },
    {
      name: 'AppliedQuotes',
      type: 'hasMany',
      object: 'Quote',
      foreignKey: 'DiscountScheduleId',
      label: 'Applied Quotes'
    }
  ],
  listViews: [
    {
      name: 'AllSchedules',
      label: 'All Schedules',
      filters: [],
      columns: ['Name', 'ScheduleCode', 'ScheduleType', 'Status', 'StartDate', 'EndDate'],
      sort: [['StartDate', 'desc']]
    },
    {
      name: 'ActiveSchedules',
      label: 'Active Schedules',
      filters: [['Status', '=', 'Active']],
      columns: ['Name', 'ScheduleType', 'DefaultDiscountPercent', 'StartDate', 'EndDate', 'CurrentUsageCount'],
      sort: [['Priority', 'asc']]
    },
    {
      name: 'CurrentPromotions',
      label: 'Current Promotions',
      filters: [
        ['Status', '=', 'Active'],
        ['StartDate', '<=', '$today'],
        ['EndDate', '>=', '$today']
      ],
      columns: ['Name', 'ScheduleType', 'DefaultDiscountPercent', 'EndDate', 'CurrentUsageCount', 'MaxTotalUses'],
      sort: [['EndDate', 'asc']]
    },
    {
      name: 'UpcomingSchedules',
      label: 'Upcoming',
      filters: [
        ['Status', 'in', ['Active', 'Scheduled']],
        ['StartDate', '>', '$today']
      ],
      columns: ['Name', 'ScheduleType', 'DefaultDiscountPercent', 'StartDate', 'EndDate'],
      sort: [['StartDate', 'asc']]
    },
    {
      name: 'ExpiringSchedules',
      label: 'Expiring Soon',
      filters: [
        ['Status', '=', 'Active'],
        ['EndDate', 'next_n_days', 7]
      ],
      columns: ['Name', 'ScheduleType', 'EndDate', 'CurrentUsageCount', 'ActualRevenue', 'TargetRevenue'],
      sort: [['EndDate', 'asc']]
    },
    {
      name: 'HighPerformance',
      label: 'High Performance',
      filters: [
        ['Status', '=', 'Active'],
        ['ConversionRate', '>', 0.5]
      ],
      columns: ['Name', 'ConversionRate', 'ActualRevenue', 'AverageDiscountGiven', 'CurrentUsageCount'],
      sort: [['ConversionRate', 'desc']]
    },
    {
      name: 'RequiringApproval',
      label: 'Requiring Approval',
      filters: [
        ['Status', '=', 'Active'],
        ['RequiresApproval', '=', true]
      ],
      columns: ['Name', 'MaximumDiscountPercent', 'ApprovalLevel', 'CurrentUsageCount'],
      sort: [['ApprovalLevel', 'desc']]
    },
    {
      name: 'RecurringSchedules',
      label: 'Recurring',
      filters: [['IsRecurring', '=', true]],
      columns: ['Name', 'ScheduleType', 'RecurrencePattern', 'DefaultDiscountPercent', 'Status'],
      sort: [['Name', 'asc']]
    }
  ],
  validationRules: [
    {
      name: 'EndDateAfterStartDate',
      errorMessage: 'End date must be after start date',
      formula: 'EndDate <= StartDate'
    },
    {
      name: 'DiscountTypeConfiguration',
      errorMessage: 'Default discount percent or amount must be specified based on discount type',
      formula: 'AND(DiscountType = "Percentage", ISBLANK(DefaultDiscountPercent))'
    },
    {
      name: 'MinMaxDiscountValid',
      errorMessage: 'Maximum discount must be greater than minimum discount',
      formula: 'AND(NOT(ISBLANK(MinimumDiscountPercent)), NOT(ISBLANK(MaximumDiscountPercent)), MaximumDiscountPercent < MinimumDiscountPercent)'
    },
    {
      name: 'DiscountPercentValid',
      errorMessage: 'Discount percentages must be between 0% and 100%',
      formula: 'OR(DefaultDiscountPercent > 1, MinimumDiscountPercent > 1, MaximumDiscountPercent > 1, DefaultDiscountPercent < 0, MinimumDiscountPercent < 0, MaximumDiscountPercent < 0)'
    },
    {
      name: 'MinMaxOrderValueValid',
      errorMessage: 'Maximum order value must be greater than minimum order value',
      formula: 'AND(NOT(ISBLANK(MinimumOrderValue)), NOT(ISBLANK(MaximumOrderValue)), MaximumOrderValue < MinimumOrderValue)'
    },
    {
      name: 'ApprovalLevelValid',
      errorMessage: 'Approval level must be between 1 and 5',
      formula: 'AND(RequiresApproval = true, NOT(ISBLANK(ApprovalLevel)), OR(ApprovalLevel < 1, ApprovalLevel > 5))'
    },
    {
      name: 'RecurrencePatternRequired',
      errorMessage: 'Recurrence pattern is required for recurring schedules',
      formula: 'AND(IsRecurring = true, ISBLANK(RecurrencePattern))'
    },
    {
      name: 'ProductCategoryRequired',
      errorMessage: 'Product category is required when applies to is Product Category',
      formula: 'AND(AppliesTo = "ProductCategory", ISBLANK(ProductCategory))'
    },
    {
      name: 'MarginPercentValid',
      errorMessage: 'Minimum margin percentage must be between 0% and 100%',
      formula: 'AND(NOT(ISBLANK(MinimumMarginPercent)), OR(MinimumMarginPercent < 0, MinimumMarginPercent > 1))'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Schedule Information',
        columns: 2,
        fields: ['Name', 'ScheduleCode', 'Status', 'ScheduleType', 'Priority', 'Description']
      },
      {
        label: 'Date Range',
        columns: 2,
        fields: ['StartDate', 'EndDate', 'IsRecurring', 'RecurrencePattern']
      },
      {
        label: 'Discount Configuration',
        columns: 2,
        fields: ['DiscountType', 'DefaultDiscountPercent', 'DefaultDiscountAmount', 'MinimumDiscountPercent', 'MaximumDiscountPercent']
      },
      {
        label: 'Applicability',
        columns: 2,
        fields: ['AppliesTo', 'ProductCategory', 'ProductFamily', 'IncludedProducts', 'ExcludedProducts']
      },
      {
        label: 'Customer Scope',
        columns: 2,
        fields: ['CustomerScope', 'CustomerSegment', 'Industry', 'IncludedAccounts']
      },
      {
        label: 'Approval Requirements',
        columns: 2,
        fields: ['RequiresApproval', 'ApprovalLevel', 'AutoApproveThreshold', 'ApprovalMatrixId']
      },
      {
        label: 'Margin Protection',
        columns: 2,
        fields: ['EnforceMarginRules', 'MinimumMarginPercent', 'MinimumMarginAmount', 'AlertBelowMargin', 'BlockBelowMargin']
      },
      {
        label: 'Usage Limits',
        columns: 2,
        fields: ['UsageLimitType', 'MaxTotalUses', 'MaxUsesPerCustomer', 'MaxUsesPerProduct', 'CurrentUsageCount']
      },
      {
        label: 'Financial Constraints',
        columns: 2,
        fields: ['MinimumOrderValue', 'MaximumOrderValue', 'MinimumQuantity']
      },
      {
        label: 'Combination Rules',
        columns: 2,
        fields: ['AllowCombineWithOther', 'ExclusiveWith']
      },
      {
        label: 'Analytics & Targets',
        columns: 2,
        fields: ['TargetRevenue', 'ActualRevenue', 'TargetUses', 'ConversionRate', 'AverageDiscountGiven', 'TotalDiscountAmount']
      },
      {
        label: 'AI Insights',
        columns: 1,
        fields: ['AIOptimalDiscountPercent', 'AIExpectedROI', 'AIRecommendedDuration', 'AIPerformanceAnalysis']
      }
    ]
  }
};

export default DiscountSchedule;

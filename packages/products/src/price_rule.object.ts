import type { ObjectSchema } from '@objectstack/spec/data';

const PriceRule: ObjectSchema = {
  name: 'price_rule',
  label: 'Price Rule',
  labelPlural: 'Price Rules',
  icon: 'calculator',
  description: 'Pricing rules for tiered pricing, volume discounts, contract-based pricing, and promotional pricing',
  enable: {
    searchEnabled: true,
    trackHistory: true,
    activitiesEnabled: true,
    feedsEnabled: true,
    filesEnabled: false
  },
  fields: {
    // Basic Information
    Name: {
      type: 'text',
      label: 'Rule Name',
      required: true,
      searchEnabled: true,
      maxLength: 255
    },
    RuleCode: {
      type: 'text',
      label: 'Rule Code',
      unique: true,
      searchEnabled: true,
      maxLength: 50,
      description: 'Unique identifier for the pricing rule'
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
    // Rule Type
    RuleType: {
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
    // Priority
    Priority: {
      type: 'number',
      label: 'Priority',
      precision: 0,
      required: true,
      defaultValue: 100,
      description: 'Rule execution priority (lower number = higher priority)'
    },
    // Applicability
    AppliesTo: {
      type: 'select',
      label: 'Applies To',
      required: true,
      options: [
        { label: 'All Products', value: 'AllProducts' },
        { label: 'Specific Product', value: 'SpecificProduct' },
        { label: 'Product Category', value: 'ProductCategory' },
        { label: 'Product Family', value: 'ProductFamily' },
        { label: 'Product Bundle', value: 'ProductBundle' }
      ]
    },
    ProductId: {
      type: 'lookup',
      label: 'Product',
      reference: 'Product',
      description: 'Specific product this rule applies to'
    },
    ProductCategory: {
      type: 'text',
      label: 'Product Category',
      maxLength: 100,
      description: 'Product category this rule applies to'
    },
    ProductFamily: {
      type: 'text',
      label: 'Product Family',
      maxLength: 100,
      description: 'Product family this rule applies to'
    },
    ProductBundleId: {
      type: 'lookup',
      label: 'Product Bundle',
      reference: 'ProductBundle',
      description: 'Product bundle this rule applies to'
    },
    // Customer Scope
    CustomerScope: {
      type: 'select',
      label: 'Customer Scope',
      required: true,
      defaultValue: 'AllCustomers',
      options: [
        { label: 'All Customers', value: 'AllCustomers' },
        { label: 'Specific Account', value: 'SpecificAccount' },
        { label: 'Account Type', value: 'AccountType' },
        { label: 'Industry', value: 'Industry' },
        { label: 'Customer Segment', value: 'CustomerSegment' }
      ]
    },
    AccountId: {
      type: 'lookup',
      label: 'Account',
      reference: 'Account',
      description: 'Specific account this rule applies to'
    },
    AccountType: {
      type: 'text',
      label: 'Account Type',
      maxLength: 100,
      description: 'Account type this rule applies to'
    },
    Industry: {
      type: 'text',
      label: 'Industry',
      maxLength: 100,
      description: 'Industry this rule applies to'
    },
    CustomerSegment: {
      type: 'text',
      label: 'Customer Segment',
      maxLength: 100,
      description: 'Customer segment this rule applies to'
    },
    // Date Range
    StartDate: {
      type: 'date',
      label: 'Start Date',
      required: true,
      description: 'Date when rule becomes active'
    },
    EndDate: {
      type: 'date',
      label: 'End Date',
      description: 'Date when rule expires'
    },
    // Pricing Configuration
    DiscountType: {
      type: 'select',
      label: 'Discount Type',
      options: [
        { label: 'Percentage', value: 'Percentage' },
        { label: 'Fixed Amount', value: 'FixedAmount' },
        { label: 'New Price', value: 'NewPrice' }
      ]
    },
    DiscountPercent: {
      type: 'percent',
      label: 'Discount %',
      description: 'Discount percentage'
    },
    DiscountAmount: {
      type: 'currency',
      label: 'Discount Amount',
      precision: 2,
      description: 'Fixed discount amount'
    },
    NewPrice: {
      type: 'currency',
      label: 'New Price',
      precision: 2,
      description: 'Overridden price'
    },
    // Volume Tiers
    UseTieredPricing: {
      type: 'checkbox',
      label: 'Use Tiered Pricing',
      defaultValue: false,
      description: 'Enable quantity-based tiered pricing'
    },
    MinimumQuantity: {
      type: 'number',
      label: 'Minimum Quantity',
      precision: 0,
      description: 'Minimum quantity required for rule to apply'
    },
    MaximumQuantity: {
      type: 'number',
      label: 'Maximum Quantity',
      precision: 0,
      description: 'Maximum quantity for rule applicability'
    },
    // Contract-Based Pricing
    ContractId: {
      type: 'lookup',
      label: 'Contract',
      reference: 'Contract',
      description: 'Contract this pricing rule is associated with'
    },
    RequireContract: {
      type: 'checkbox',
      label: 'Require Contract',
      defaultValue: false,
      description: 'Rule only applies if customer has an active contract'
    },
    // Promotional
    PromotionCode: {
      type: 'text',
      label: 'Promotion Code',
      maxLength: 50,
      description: 'Promotion code for customer entry'
    },
    IsPublic: {
      type: 'checkbox',
      label: 'Public Promotion',
      defaultValue: false,
      description: 'Publicly advertised promotion'
    },
    UsageLimit: {
      type: 'number',
      label: 'Usage Limit',
      precision: 0,
      description: 'Maximum number of times rule can be used'
    },
    UsageCount: {
      type: 'number',
      label: 'Usage Count',
      precision: 0,
      readonly: true,
      defaultValue: 0,
      description: 'Current usage count'
    },
    // Stackability
    AllowStacking: {
      type: 'checkbox',
      label: 'Allow Stacking',
      defaultValue: false,
      description: 'Allow combining with other pricing rules'
    },
    ExclusionRules: {
      type: 'textarea',
      label: 'Exclusion Rules',
      maxLength: 2000,
      description: 'Rules that cannot be combined with this rule (comma-separated rule codes)'
    },
    // Competitive Pricing
    CompetitorPrice: {
      type: 'currency',
      label: 'Competitor Price',
      precision: 2,
      description: 'Competitor reference price'
    },
    CompetitorName: {
      type: 'text',
      label: 'Competitor Name',
      maxLength: 255,
      description: 'Competitor being matched or beaten'
    },
    PriceMatchStrategy: {
      type: 'select',
      label: 'Price Match Strategy',
      options: [
        { label: 'Match Competitor', value: 'Match' },
        { label: 'Beat by %', value: 'BeatByPercent' },
        { label: 'Beat by Amount', value: 'BeatByAmount' }
      ]
    },
    BeatByPercent: {
      type: 'percent',
      label: 'Beat By %',
      description: 'Percentage to beat competitor price by'
    },
    BeatByAmount: {
      type: 'currency',
      label: 'Beat By Amount',
      precision: 2,
      description: 'Amount to beat competitor price by'
    },
    // Approval
    RequiresApproval: {
      type: 'checkbox',
      label: 'Requires Approval',
      defaultValue: false,
      description: 'Rule requires approval before activation'
    },
    ApprovalStatus: {
      type: 'select',
      label: 'Approval Status',
      readonly: true,
      defaultValue: 'Not Required',
      options: [
        { label: 'Not Required', value: 'Not Required' },
        { label: 'Pending', value: 'Pending' },
        { label: 'Approved', value: 'Approved' },
        { label: 'Rejected', value: 'Rejected' }
      ]
    },
    ApprovedById: {
      type: 'lookup',
      label: 'Approved By',
      reference: 'User',
      readonly: true
    },
    ApprovedDate: {
      type: 'datetime',
      label: 'Approved Date',
      readonly: true
    },
    // AI Enhancement
    AIOptimalDiscountPercent: {
      type: 'percent',
      label: 'AI Optimal Discount',
      readonly: true,
      description: 'AI-recommended optimal discount percentage'
    },
    AIExpectedImpact: {
      type: 'textarea',
      label: 'AI Expected Impact',
      readonly: true,
      maxLength: 2000,
      description: 'AI analysis of expected revenue and margin impact'
    },
    AICompetitiveAnalysis: {
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
      foreignKey: 'PriceRuleId',
      label: 'Price Tiers'
    },
    {
      name: 'AppliedQuotes',
      type: 'hasMany',
      object: 'Quote',
      foreignKey: 'PriceRuleId',
      label: 'Applied Quotes'
    }
  ],
  listViews: [
    {
      name: 'AllRules',
      label: 'All Price Rules',
      filters: [],
      columns: ['Name', 'RuleCode', 'RuleType', 'Status', 'Priority', 'StartDate', 'EndDate'],
      sort: [['Priority', 'asc']]
    },
    {
      name: 'ActiveRules',
      label: 'Active Rules',
      filters: [['Status', '=', 'Active']],
      columns: ['Name', 'RuleType', 'AppliesTo', 'CustomerScope', 'Priority', 'EndDate'],
      sort: [['Priority', 'asc']]
    },
    {
      name: 'PromotionalRules',
      label: 'Promotional',
      filters: [['RuleType', '=', 'Promotional']],
      columns: ['Name', 'PromotionCode', 'DiscountPercent', 'StartDate', 'EndDate', 'UsageCount', 'UsageLimit'],
      sort: [['StartDate', 'desc']]
    },
    {
      name: 'ContractPricing',
      label: 'Contract Pricing',
      filters: [['RuleType', '=', 'ContractBased']],
      columns: ['Name', 'ContractId', 'AccountId', 'DiscountPercent', 'StartDate', 'EndDate'],
      sort: [['StartDate', 'desc']]
    },
    {
      name: 'VolumeDiscounts',
      label: 'Volume Discounts',
      filters: [['RuleType', '=', 'VolumeDiscount']],
      columns: ['Name', 'ProductId', 'MinimumQuantity', 'DiscountPercent', 'Status'],
      sort: [['MinimumQuantity', 'asc']]
    },
    {
      name: 'ExpiringRules',
      label: 'Expiring Soon',
      filters: [
        ['Status', '=', 'Active'],
        ['EndDate', 'next_n_days', 30]
      ],
      columns: ['Name', 'RuleType', 'EndDate', 'UsageCount', 'UsageLimit'],
      sort: [['EndDate', 'asc']]
    },
    {
      name: 'PendingApproval',
      label: 'Pending Approval',
      filters: [['ApprovalStatus', '=', 'Pending']],
      columns: ['Name', 'RuleType', 'DiscountPercent', 'RequiresApproval', 'CreatedDate'],
      sort: [['CreatedDate', 'asc']]
    }
  ],
  validationRules: [
    {
      name: 'EndDateAfterStartDate',
      errorMessage: 'End date must be after start date',
      formula: 'AND(NOT(ISBLANK(StartDate)), NOT(ISBLANK(EndDate)), EndDate <= StartDate)'
    },
    {
      name: 'DiscountTypeRequired',
      errorMessage: 'Discount type is required',
      formula: 'AND(RuleType IN ("VolumeDiscount", "Promotional", "CustomerSpecific"), ISBLANK(DiscountType))'
    },
    {
      name: 'DiscountPercentValid',
      errorMessage: 'Discount percentage must be between 0% and 100%',
      formula: 'AND(DiscountType = "Percentage", OR(DiscountPercent < 0, DiscountPercent > 1))'
    },
    {
      name: 'DiscountAmountRequired',
      errorMessage: 'Discount amount is required when discount type is Fixed Amount',
      formula: 'AND(DiscountType = "FixedAmount", ISBLANK(DiscountAmount))'
    },
    {
      name: 'NewPriceRequired',
      errorMessage: 'New price is required when discount type is New Price',
      formula: 'AND(DiscountType = "NewPrice", ISBLANK(NewPrice))'
    },
    {
      name: 'ProductRequired',
      errorMessage: 'Product is required when applies to specific product',
      formula: 'AND(AppliesTo = "SpecificProduct", ISBLANK(ProductId))'
    },
    {
      name: 'AccountRequired',
      errorMessage: 'Account is required when customer scope is specific account',
      formula: 'AND(CustomerScope = "SpecificAccount", ISBLANK(AccountId))'
    },
    {
      name: 'ContractRequired',
      errorMessage: 'Contract is required when rule type is contract-based',
      formula: 'AND(RuleType = "ContractBased", ISBLANK(ContractId))'
    },
    {
      name: 'PromotionCodeRequired',
      errorMessage: 'Promotion code is required for promotional rules',
      formula: 'AND(RuleType = "Promotional", ISBLANK(PromotionCode))'
    },
    {
      name: 'MinMaxQuantityValid',
      errorMessage: 'Maximum quantity must be greater than minimum quantity',
      formula: 'AND(NOT(ISBLANK(MinimumQuantity)), NOT(ISBLANK(MaximumQuantity)), MaximumQuantity < MinimumQuantity)'
    },
    {
      name: 'CompetitorPriceRequired',
      errorMessage: 'Competitor price is required for competitive pricing rules',
      formula: 'AND(RuleType = "Competitive", ISBLANK(CompetitorPrice))'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Rule Information',
        columns: 2,
        fields: ['Name', 'RuleCode', 'Status', 'RuleType', 'Priority', 'Description']
      },
      {
        label: 'Applicability',
        columns: 2,
        fields: ['AppliesTo', 'ProductId', 'ProductCategory', 'ProductFamily', 'ProductBundleId']
      },
      {
        label: 'Customer Scope',
        columns: 2,
        fields: ['CustomerScope', 'AccountId', 'AccountType', 'Industry', 'CustomerSegment']
      },
      {
        label: 'Date Range',
        columns: 2,
        fields: ['StartDate', 'EndDate']
      },
      {
        label: 'Pricing Configuration',
        columns: 2,
        fields: ['DiscountType', 'DiscountPercent', 'DiscountAmount', 'NewPrice']
      },
      {
        label: 'Volume & Tiered Pricing',
        columns: 2,
        fields: ['UseTieredPricing', 'MinimumQuantity', 'MaximumQuantity']
      },
      {
        label: 'Contract-Based Pricing',
        columns: 2,
        fields: ['ContractId', 'RequireContract']
      },
      {
        label: 'Promotional Settings',
        columns: 2,
        fields: ['PromotionCode', 'IsPublic', 'UsageLimit', 'UsageCount']
      },
      {
        label: 'Stackability',
        columns: 2,
        fields: ['AllowStacking', 'ExclusionRules']
      },
      {
        label: 'Competitive Pricing',
        columns: 2,
        fields: ['CompetitorName', 'CompetitorPrice', 'PriceMatchStrategy', 'BeatByPercent', 'BeatByAmount']
      },
      {
        label: 'Approval',
        columns: 2,
        fields: ['RequiresApproval', 'ApprovalStatus', 'ApprovedById', 'ApprovedDate']
      },
      {
        label: 'AI Insights',
        columns: 1,
        fields: ['AIOptimalDiscountPercent', 'AIExpectedImpact', 'AICompetitiveAnalysis']
      }
    ]
  }
};

export default PriceRule;

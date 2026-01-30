import type { ServiceObject } from '@objectstack/spec/data';

const ProductBundle = {
  name: 'product_bundle',
  label: 'Product Bundle',
  labelPlural: 'Product Bundles',
  icon: 'box-open',
  description: 'Product bundles and packages with dependencies, constraints, and configuration options',
  capabilities: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true
  },
  fields: {
    // Basic Information
    Name: {
      type: 'text',
      label: 'Bundle Name',
      required: true,
      searchable: true,
      maxLength: 255
    },
    BundleCode: {
      type: 'text',
      label: 'Bundle Code',
      unique: true,
      searchable: true,
      maxLength: 50,
      description: 'Unique identifier for the bundle'
    },
    Description: {
      type: 'textarea',
      label: 'Description',
      maxLength: 32000
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
        { label: '📦 Archived', value: 'Archived' }
      ]
    },
    BundleType: {
      type: 'select',
      label: 'Bundle Type',
      required: true,
      options: [
        { label: 'Fixed Bundle', value: 'Fixed' },
        { label: 'Customizable Bundle', value: 'Customizable' },
        { label: 'Recommended Package', value: 'Recommended' },
        { label: 'Frequently Bought Together', value: 'FrequentlyBought' }
      ],
      description: 'Type of product bundle'
    },
    // Pricing
    PricingMethod: {
      type: 'select',
      label: 'Pricing Method',
      required: true,
      defaultValue: 'Sum',
      options: [
        { label: 'Sum of Components', value: 'Sum' },
        { label: 'Fixed Price', value: 'Fixed' },
        { label: 'Percentage Discount', value: 'PercentageDiscount' },
        { label: 'Amount Discount', value: 'AmountDiscount' }
      ]
    },
    FixedPrice: {
      type: 'currency',
      label: 'Fixed Price',
      precision: 2,
      description: 'Fixed price when PricingMethod is Fixed'
    },
    DiscountPercent: {
      type: 'percent',
      label: 'Discount %',
      description: 'Discount percentage when PricingMethod is PercentageDiscount'
    },
    DiscountAmount: {
      type: 'currency',
      label: 'Discount Amount',
      precision: 2,
      description: 'Discount amount when PricingMethod is AmountDiscount'
    },
    MinimumPrice: {
      type: 'currency',
      label: 'Minimum Price',
      precision: 2,
      description: 'Minimum allowed price for the bundle'
    },
    MaximumPrice: {
      type: 'currency',
      label: 'Maximum Price',
      precision: 2,
      description: 'Maximum allowed price for the bundle'
    },
    // Configuration
    AllowCustomization: {
      type: 'checkbox',
      label: 'Allow Customization',
      defaultValue: false,
      description: 'Allow customers to customize bundle components'
    },
    MinComponents: {
      type: 'number',
      label: 'Minimum Components',
      precision: 0,
      defaultValue: 1,
      description: 'Minimum number of components required'
    },
    MaxComponents: {
      type: 'number',
      label: 'Maximum Components',
      precision: 0,
      description: 'Maximum number of components allowed'
    },
    // Availability
    StartDate: {
      type: 'date',
      label: 'Start Date',
      description: 'Date when bundle becomes available'
    },
    EndDate: {
      type: 'date',
      label: 'End Date',
      description: 'Date when bundle expires'
    },
    // Inventory
    StockLevel: {
      type: 'number',
      label: 'Stock Level',
      precision: 0,
      description: 'Available stock for the bundle'
    },
    LowStockThreshold: {
      type: 'number',
      label: 'Low Stock Threshold',
      precision: 0,
      description: 'Alert when stock falls below this level'
    },
    IsStockTracked: {
      type: 'checkbox',
      label: 'Track Stock',
      defaultValue: false,
      description: 'Enable stock tracking for this bundle'
    },
    // Marketing
    FeaturedBundle: {
      type: 'checkbox',
      label: 'Featured Bundle',
      defaultValue: false,
      description: 'Display as featured bundle'
    },
    DisplayOrder: {
      type: 'number',
      label: 'Display Order',
      precision: 0,
      description: 'Order to display in bundle list'
    },
    ImageUrl: {
      type: 'url',
      label: 'Image URL',
      description: 'URL to bundle image'
    },
    // AI Enhancement
    AIRecommendationScore: {
      type: 'number',
      label: 'AI Recommendation Score',
      precision: 2,
      readonly: true,
      description: 'AI-calculated recommendation score based on purchase patterns'
    },
    AIFrequencyScore: {
      type: 'number',
      label: 'Frequency Score',
      precision: 2,
      readonly: true,
      description: 'How frequently this bundle is purchased together'
    },
    AISuggestedUpgrade: {
      type: 'lookup',
      label: 'Suggested Upgrade',
      reference: 'ProductBundle',
      description: 'AI-suggested upgrade bundle'
    }
  },
  relationships: [
    {
      name: 'BundleItems',
      type: 'hasMany',
      object: 'ProductBundleItem',
      foreignKey: 'BundleId',
      label: 'Bundle Items'
    },
    {
      name: 'BundleDependencies',
      type: 'hasMany',
      object: 'ProductBundleDependency',
      foreignKey: 'BundleId',
      label: 'Dependencies'
    },
    {
      name: 'BundleConstraints',
      type: 'hasMany',
      object: 'ProductBundleConstraint',
      foreignKey: 'BundleId',
      label: 'Constraints'
    }
  ],
  listViews: [
    {
      name: 'AllBundles',
      label: 'All Bundles',
      filters: [],
      columns: ['Name', 'BundleCode', 'BundleType', 'Status', 'PricingMethod', 'FixedPrice'],
      sort: [['Name', 'asc']]
    },
    {
      name: 'ActiveBundles',
      label: 'Active Bundles',
      filters: [['Status', '=', 'Active']],
      columns: ['Name', 'BundleCode', 'BundleType', 'PricingMethod', 'FixedPrice', 'DisplayOrder'],
      sort: [['DisplayOrder', 'asc']]
    },
    {
      name: 'FeaturedBundles',
      label: 'Featured Bundles',
      filters: [
        ['Status', '=', 'Active'],
        ['FeaturedBundle', '=', true]
      ],
      columns: ['Name', 'BundleCode', 'BundleType', 'FixedPrice', 'AIRecommendationScore'],
      sort: [['DisplayOrder', 'asc']]
    },
    {
      name: 'CustomizableBundles',
      label: 'Customizable Bundles',
      filters: [
        ['Status', '=', 'Active'],
        ['AllowCustomization', '=', true]
      ],
      columns: ['Name', 'BundleCode', 'MinComponents', 'MaxComponents', 'FixedPrice'],
      sort: [['Name', 'asc']]
    },
    {
      name: 'LowStock',
      label: 'Low Stock',
      filters: [
        ['IsStockTracked', '=', true],
        ['Status', '=', 'Active']
      ],
      columns: ['Name', 'BundleCode', 'StockLevel', 'LowStockThreshold'],
      sort: [['StockLevel', 'asc']]
    }
  ],
  validationRules: [
    {
      name: 'EndDateAfterStartDate',
      errorMessage: 'End date must be after start date',
      formula: 'AND(NOT(ISBLANK(StartDate)), NOT(ISBLANK(EndDate)), EndDate <= StartDate)'
    },
    {
      name: 'FixedPriceRequired',
      errorMessage: 'Fixed price is required when pricing method is Fixed',
      formula: 'AND(PricingMethod = "Fixed", ISBLANK(FixedPrice))'
    },
    {
      name: 'DiscountPercentRequired',
      errorMessage: 'Discount percentage is required when pricing method is PercentageDiscount',
      formula: 'AND(PricingMethod = "PercentageDiscount", ISBLANK(DiscountPercent))'
    },
    {
      name: 'DiscountAmountRequired',
      errorMessage: 'Discount amount is required when pricing method is AmountDiscount',
      formula: 'AND(PricingMethod = "AmountDiscount", ISBLANK(DiscountAmount))'
    },
    {
      name: 'MinMaxComponentsValid',
      errorMessage: 'Maximum components must be greater than or equal to minimum components',
      formula: 'AND(NOT(ISBLANK(MinComponents)), NOT(ISBLANK(MaxComponents)), MaxComponents < MinComponents)'
    },
    {
      name: 'MinPriceValid',
      errorMessage: 'Minimum price must be less than maximum price',
      formula: 'AND(NOT(ISBLANK(MinimumPrice)), NOT(ISBLANK(MaximumPrice)), MinimumPrice > MaximumPrice)'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Bundle Information',
        columns: 2,
        fields: ['Name', 'BundleCode', 'Status', 'BundleType', 'Description']
      },
      {
        label: 'Pricing',
        columns: 2,
        fields: ['PricingMethod', 'FixedPrice', 'DiscountPercent', 'DiscountAmount', 'MinimumPrice', 'MaximumPrice']
      },
      {
        label: 'Configuration',
        columns: 2,
        fields: ['AllowCustomization', 'MinComponents', 'MaxComponents']
      },
      {
        label: 'Availability',
        columns: 2,
        fields: ['StartDate', 'EndDate']
      },
      {
        label: 'Inventory',
        columns: 2,
        fields: ['IsStockTracked', 'StockLevel', 'LowStockThreshold']
      },
      {
        label: 'Marketing',
        columns: 2,
        fields: ['FeaturedBundle', 'DisplayOrder', 'ImageUrl']
      },
      {
        label: 'AI Recommendations',
        columns: 2,
        fields: ['AIRecommendationScore', 'AIFrequencyScore', 'AISuggestedUpgrade']
      }
    ]
  }
};

export default ProductBundle;

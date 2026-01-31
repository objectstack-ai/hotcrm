
const ProductBundle = {
  name: 'product_bundle',
  label: 'Product Bundle',
  labelPlural: 'Product Bundles',
  icon: 'box-open',
  description: 'Product bundles and packages with dependencies, constraints, and configuration options',
  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true
  },
  fields: {
    // Basic Information
    name: {
      type: 'text',
      label: 'Bundle name',
      required: true,
      searchable: true,
      maxLength: 255
    },
    bundle_code: {
      type: 'text',
      label: 'Bundle Code',
      unique: true,
      searchable: true,
      maxLength: 50,
      description: 'Unique identifier for the bundle'
    },
    description: {
      type: 'textarea',
      label: 'description',
      maxLength: 32000
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
        { label: '📦 Archived', value: 'Archived' }
      ]
    },
    bundle_type: {
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
    pricing_method: {
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
    fixed_price: {
      type: 'currency',
      label: 'Fixed Price',
      precision: 2,
      description: 'Fixed price when pricing_method is Fixed'
    },
    discount_percent: {
      type: 'percent',
      label: 'Discount %',
      description: 'Discount percentage when pricing_method is PercentageDiscount'
    },
    discount_amount: {
      type: 'currency',
      label: 'Discount Amount',
      precision: 2,
      description: 'Discount amount when pricing_method is AmountDiscount'
    },
    minimum_price: {
      type: 'currency',
      label: 'Minimum Price',
      precision: 2,
      description: 'Minimum allowed price for the bundle'
    },
    maximum_price: {
      type: 'currency',
      label: 'Maximum Price',
      precision: 2,
      description: 'Maximum allowed price for the bundle'
    },
    // Configuration
    allow_customization: {
      type: 'checkbox',
      label: 'Allow Customization',
      defaultValue: false,
      description: 'Allow customers to customize bundle components'
    },
    min_components: {
      type: 'number',
      label: 'Minimum Components',
      precision: 0,
      defaultValue: 1,
      description: 'Minimum number of components required'
    },
    max_components: {
      type: 'number',
      label: 'Maximum Components',
      precision: 0,
      description: 'Maximum number of components allowed'
    },
    // Availability
    start_date: {
      type: 'date',
      label: 'Start Date',
      description: 'Date when bundle becomes available'
    },
    end_date: {
      type: 'date',
      label: 'End Date',
      description: 'Date when bundle expires'
    },
    // Inventory
    stock_level: {
      type: 'number',
      label: 'Stock Level',
      precision: 0,
      description: 'Available stock for the bundle'
    },
    low_stock_threshold: {
      type: 'number',
      label: 'Low Stock Threshold',
      precision: 0,
      description: 'Alert when stock falls below this level'
    },
    is_stock_tracked: {
      type: 'checkbox',
      label: 'Track Stock',
      defaultValue: false,
      description: 'Enable stock tracking for this bundle'
    },
    // Marketing
    featured_bundle: {
      type: 'checkbox',
      label: 'Featured Bundle',
      defaultValue: false,
      description: 'Display as featured bundle'
    },
    display_order: {
      type: 'number',
      label: 'Display Order',
      precision: 0,
      description: 'Order to display in bundle list'
    },
    image_url: {
      type: 'url',
      label: 'Image URL',
      description: 'URL to bundle image'
    },
    // AI Enhancement
    ai_recommendation_score: {
      type: 'number',
      label: 'AI Recommendation Score',
      precision: 2,
      readonly: true,
      description: 'AI-calculated recommendation score based on purchase patterns'
    },
    ai_frequency_score: {
      type: 'number',
      label: 'Frequency Score',
      precision: 2,
      readonly: true,
      description: 'How frequently this bundle is purchased together'
    },
    ai_suggested_upgrade: {
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
      foreignKey: 'bundle_id',
      label: 'Bundle Items'
    },
    {
      name: 'BundleDependencies',
      type: 'hasMany',
      object: 'ProductBundleDependency',
      foreignKey: 'bundle_id',
      label: 'Dependencies'
    },
    {
      name: 'BundleConstraints',
      type: 'hasMany',
      object: 'ProductBundleConstraint',
      foreignKey: 'bundle_id',
      label: 'Constraints'
    }
  ],
  listViews: [
    {
      name: 'AllBundles',
      label: 'All Bundles',
      filters: [],
      columns: ['name', 'bundle_code', 'bundle_type', 'status', 'pricing_method', 'fixed_price'],
      sort: [['name', 'asc']]
    },
    {
      name: 'ActiveBundles',
      label: 'Active Bundles',
      filters: [['status', '=', 'Active']],
      columns: ['name', 'bundle_code', 'bundle_type', 'pricing_method', 'fixed_price', 'display_order'],
      sort: [['display_order', 'asc']]
    },
    {
      name: 'FeaturedBundles',
      label: 'Featured Bundles',
      filters: [
        ['status', '=', 'Active'],
        ['featured_bundle', '=', true]
      ],
      columns: ['name', 'bundle_code', 'bundle_type', 'fixed_price', 'ai_recommendation_score'],
      sort: [['display_order', 'asc']]
    },
    {
      name: 'CustomizableBundles',
      label: 'Customizable Bundles',
      filters: [
        ['status', '=', 'Active'],
        ['allow_customization', '=', true]
      ],
      columns: ['name', 'bundle_code', 'min_components', 'max_components', 'fixed_price'],
      sort: [['name', 'asc']]
    },
    {
      name: 'LowStock',
      label: 'Low Stock',
      filters: [
        ['is_stock_tracked', '=', true],
        ['status', '=', 'Active']
      ],
      columns: ['name', 'bundle_code', 'stock_level', 'low_stock_threshold'],
      sort: [['stock_level', 'asc']]
    }
  ],
  validationRules: [
    {
      name: 'EndDateAfterStartDate',
      errorMessage: 'End date must be after start date',
      formula: 'AND(NOT(ISBLANK(start_date)), NOT(ISBLANK(end_date)), end_date <= start_date)'
    },
    {
      name: 'FixedPriceRequired',
      errorMessage: 'Fixed price is required when pricing method is Fixed',
      formula: 'AND(pricing_method = "Fixed", ISBLANK(fixed_price))'
    },
    {
      name: 'DiscountPercentRequired',
      errorMessage: 'Discount percentage is required when pricing method is PercentageDiscount',
      formula: 'AND(pricing_method = "PercentageDiscount", ISBLANK(discount_percent))'
    },
    {
      name: 'DiscountAmountRequired',
      errorMessage: 'Discount amount is required when pricing method is AmountDiscount',
      formula: 'AND(pricing_method = "AmountDiscount", ISBLANK(discount_amount))'
    },
    {
      name: 'MinMaxComponentsValid',
      errorMessage: 'Maximum components must be greater than or equal to minimum components',
      formula: 'AND(NOT(ISBLANK(min_components)), NOT(ISBLANK(max_components)), max_components < min_components)'
    },
    {
      name: 'MinPriceValid',
      errorMessage: 'Minimum price must be less than maximum price',
      formula: 'AND(NOT(ISBLANK(minimum_price)), NOT(ISBLANK(maximum_price)), minimum_price > maximum_price)'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Bundle Information',
        columns: 2,
        fields: ['name', 'bundle_code', 'status', 'bundle_type', 'description']
      },
      {
        label: 'Pricing',
        columns: 2,
        fields: ['pricing_method', 'fixed_price', 'discount_percent', 'discount_amount', 'minimum_price', 'maximum_price']
      },
      {
        label: 'Configuration',
        columns: 2,
        fields: ['allow_customization', 'min_components', 'max_components']
      },
      {
        label: 'Availability',
        columns: 2,
        fields: ['start_date', 'end_date']
      },
      {
        label: 'Inventory',
        columns: 2,
        fields: ['is_stock_tracked', 'stock_level', 'low_stock_threshold']
      },
      {
        label: 'Marketing',
        columns: 2,
        fields: ['featured_bundle', 'display_order', 'image_url']
      },
      {
        label: 'AI Recommendations',
        columns: 2,
        fields: ['ai_recommendation_score', 'ai_frequency_score', 'ai_suggested_upgrade']
      }
    ]
  }
};

export default ProductBundle;

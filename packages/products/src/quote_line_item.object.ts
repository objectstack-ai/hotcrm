
const QuoteLineItem = {
  name: 'quote_line_item',
  label: 'Quote Line Item',
  labelPlural: 'Quote Line Items',
  icon: 'list',
  description: 'Individual line items on quotes with pricing, quantity, and discount information',
  enable: {
    searchable: true,
    trackHistory: true,
    activities: false,
    feeds: false,
    files: false
  },
  fields: {
    // Related Records
    quote_id: {
      type: 'lookup',
      label: 'Quote',
      reference: 'Quote',
      required: true
    },
    product_id: {
      type: 'lookup',
      label: 'Product',
      reference: 'product',
      required: true
    },
    product_bundle_id: {
      type: 'lookup',
      label: 'Product Bundle',
      reference: 'ProductBundle',
      description: 'Bundle this line item is part of'
    },
    pricebook_entry_id: {
      type: 'lookup',
      label: 'Pricebook Entry',
      reference: 'PricebookEntry',
      description: 'Reference to the pricebook entry'
    },
    // Line Item Details
    line_number: {
      type: 'number',
      label: 'Line Number',
      precision: 0,
      required: true,
      description: 'Display order of line item'
    },
    product_name: {
      type: 'text',
      label: 'Product Name',
      maxLength: 255,
      readonly: true,
      description: 'Cached product name for quick display'
    },
    product_code: {
      type: 'text',
      label: 'Product Code',
      maxLength: 50,
      readonly: true,
      description: 'Cached product code'
    },
    description: {
      type: 'textarea',
      label: 'description',
      maxLength: 2000,
      description: 'Custom description for this line item'
    },
    // quantity & Units
    quantity: {
      type: 'number',
      label: 'quantity',
      precision: 2,
      required: true,
      defaultValue: 1,
      description: 'Number of units'
    },
    unit_of_measure: {
      type: 'text',
      label: 'Unit of Measure',
      maxLength: 50,
      description: 'e.g., Each, License, User, GB, Hour'
    },
    // Pricing
    list_price: {
      type: 'currency',
      label: 'List Price',
      precision: 2,
      required: true,
      description: 'Standard list price per unit'
    },
    unit_price: {
      type: 'currency',
      label: 'Unit Price',
      precision: 2,
      required: true,
      description: 'Actual selling price per unit (after discounts)'
    },
    // Discounts
    discount_type: {
      type: 'select',
      label: 'Discount Type',
      options: [
        { label: 'None', value: 'None' },
        { label: 'Percentage', value: 'Percentage' },
        { label: 'Amount per Unit', value: 'AmountPerUnit' },
        { label: 'Total Amount', value: 'TotalAmount' }
      ],
      defaultValue: 'None'
    },
    discount_percent: {
      type: 'percent',
      label: 'Discount %',
      description: 'Discount percentage applied to list price'
    },
    discount_amount: {
      type: 'currency',
      label: 'Discount Amount',
      precision: 2,
      description: 'Total discount amount for this line'
    },
    price_rule_id: {
      type: 'lookup',
      label: 'Applied Price Rule',
      reference: 'PriceRule',
      description: 'Pricing rule applied to this line item'
    },
    // Calculated Amounts
    subtotal: {
      type: 'currency',
      label: 'subtotal',
      precision: 2,
      readonly: true,
      description: 'List Price × quantity'
    },
    total_price: {
      type: 'currency',
      label: 'Total Price',
      precision: 2,
      readonly: true,
      description: 'Unit Price × quantity (after discounts)'
    },
    margin: {
      type: 'currency',
      label: 'margin',
      precision: 2,
      readonly: true,
      description: 'Profit margin for this line item'
    },
    margin_percent: {
      type: 'percent',
      label: 'margin %',
      readonly: true,
      description: 'Profit margin percentage'
    },
    // Product Configuration
    configuration_json: {
      type: 'textarea',
      label: 'Configuration',
      maxLength: 32000,
      description: 'JSON configuration for customizable products'
    },
    selected_options: {
      type: 'textarea',
      label: 'Selected Options',
      maxLength: 2000,
      description: 'Selected product options and variants'
    },
    // Service Dates (for subscription/service products)
    service_start_date: {
      type: 'date',
      label: 'Service Start Date',
      description: 'Start date for subscription or service'
    },
    service_end_date: {
      type: 'date',
      label: 'Service End Date',
      description: 'End date for subscription or service'
    },
    billing_frequency: {
      type: 'select',
      label: 'Billing Frequency',
      options: [
        { label: 'One-Time', value: 'OneTime' },
        { label: 'Monthly', value: 'Monthly' },
        { label: 'Quarterly', value: 'Quarterly' },
        { label: 'Semi-Annual', value: 'SemiAnnual' },
        { label: 'Annual', value: 'Annual' }
      ],
      defaultValue: 'OneTime'
    },
    // Tax
    tax_percent: {
      type: 'percent',
      label: 'Tax %',
      description: 'Tax percentage for this line item'
    },
    tax_amount: {
      type: 'currency',
      label: 'Tax Amount',
      precision: 2,
      readonly: true,
      description: 'Calculated tax amount'
    },
    is_taxable: {
      type: 'checkbox',
      label: 'Taxable',
      defaultValue: true,
      description: 'Is this line item subject to tax?'
    },
    // Additional Charges
    setup_fee: {
      type: 'currency',
      label: 'Setup Fee',
      precision: 2,
      defaultValue: 0,
      description: 'One-time setup fee'
    },
    shipping_cost: {
      type: 'currency',
      label: 'Shipping Cost',
      precision: 2,
      defaultValue: 0,
      description: 'Shipping cost for this item'
    },
    // Product Dependencies
    required_by_line_item_id: {
      type: 'lookup',
      label: 'Required By',
      reference: 'QuoteLineItem',
      description: 'Parent line item that requires this item'
    },
    is_optional: {
      type: 'checkbox',
      label: 'Optional',
      defaultValue: false,
      description: 'Is this an optional add-on?'
    },
    is_bundle: {
      type: 'checkbox',
      label: 'Bundle',
      defaultValue: false,
      readonly: true,
      description: 'Is this a bundle item?'
    },
    bundle_parent_id: {
      type: 'lookup',
      label: 'Bundle Parent',
      reference: 'QuoteLineItem',
      description: 'Parent bundle line item'
    },
    // Notes
    internal_notes: {
      type: 'textarea',
      label: 'Internal Notes',
      maxLength: 2000,
      description: 'Internal notes not visible to customer'
    },
    customer_notes: {
      type: 'textarea',
      label: 'Customer Notes',
      maxLength: 2000,
      description: 'Notes visible to customer on quote'
    },
    // status
    status: {
      type: 'select',
      label: 'status',
      defaultValue: 'Active',
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Deleted', value: 'Deleted' },
        { label: 'Alternate', value: 'Alternate' }
      ]
    },
    // AI Enhancement
    ai_recommended_upsell: {
      type: 'lookup',
      label: 'AI Recommended Upsell',
      reference: 'product',
      readonly: true,
      description: 'AI-suggested upsell product for this line item'
    },
    ai_recommended_cross_sell: {
      type: 'textarea',
      label: 'AI Cross-Sell Recommendations',
      readonly: true,
      maxLength: 2000,
      description: 'AI-suggested complementary products'
    },
    ai_optimal_quantity: {
      type: 'number',
      label: 'AI Optimal quantity',
      precision: 0,
      readonly: true,
      description: 'AI-recommended optimal quantity based on usage patterns'
    }
  },
  relationships: [
    {
      name: 'ChildLineItems',
      type: 'hasMany',
      object: 'QuoteLineItem',
      foreignKey: 'required_by_line_item_id',
      label: 'Child Line Items'
    },
    {
      name: 'BundleComponents',
      type: 'hasMany',
      object: 'QuoteLineItem',
      foreignKey: 'bundle_parent_id',
      label: 'Bundle Components'
    }
  ],
  listViews: [
    {
      name: 'AllLineItems',
      label: 'All Line Items',
      filters: [],
      columns: ['line_number', 'quote_id', 'product_name', 'quantity', 'unit_price', 'total_price', 'status'],
      sort: [['line_number', 'asc']]
    },
    {
      name: 'ActiveLineItems',
      label: 'Active',
      filters: [['status', '=', 'Active']],
      columns: ['line_number', 'product_name', 'quantity', 'list_price', 'discount_percent', 'unit_price', 'total_price'],
      sort: [['line_number', 'asc']]
    },
    {
      name: 'DiscountedItems',
      label: 'Discounted Items',
      filters: [
        ['status', '=', 'Active'],
        ['discount_percent', '>', 0]
      ],
      columns: ['product_name', 'list_price', 'discount_percent', 'unit_price', 'total_price', 'margin_percent'],
      sort: [['discount_percent', 'desc']]
    },
    {
      name: 'BundleItems',
      label: 'Bundle Items',
      filters: [['is_bundle', '=', true]],
      columns: ['product_name', 'bundle_parent_id', 'quantity', 'unit_price', 'total_price'],
      sort: [['bundle_parent_id', 'asc']]
    },
    {
      name: 'SubscriptionItems',
      label: 'Subscriptions',
      filters: [['billing_frequency', '!=', 'OneTime']],
      columns: ['product_name', 'billing_frequency', 'service_start_date', 'service_end_date', 'unit_price', 'total_price'],
      sort: [['service_start_date', 'asc']]
    },
    {
      name: 'HighValueItems',
      label: 'High Value',
      filters: [
        ['total_price', '>', 10000],
        ['status', '=', 'Active']
      ],
      columns: ['product_name', 'quantity', 'unit_price', 'total_price', 'margin_percent'],
      sort: [['total_price', 'desc']]
    }
  ],
  validationRules: [
    {
      name: 'QuantityPositive',
      errorMessage: 'quantity must be greater than zero',
      formula: 'quantity <= 0'
    },
    {
      name: 'UnitPriceLessThanOrEqualListPrice',
      errorMessage: 'Unit price cannot exceed list price without approval',
      formula: 'unit_price > list_price'
    },
    {
      name: 'DiscountPercentValid',
      errorMessage: 'Discount percentage must be between 0% and 100%',
      formula: 'AND(discount_type = "Percentage", OR(discount_percent < 0, discount_percent > 1))'
    },
    {
      name: 'ServiceEndDateAfterStartDate',
      errorMessage: 'Service end date must be after start date',
      formula: 'AND(NOT(ISBLANK(service_start_date)), NOT(ISBLANK(service_end_date)), service_end_date <= service_start_date)'
    },
    {
      name: 'BundleComponentRequired',
      errorMessage: 'Bundle components must have a bundle parent specified',
      formula: 'AND(is_optional = false, NOT(ISBLANK(required_by_line_item_id)), ISBLANK(bundle_parent_id))'
    },
    {
      name: 'PricebookEntryOrProductRequired',
      errorMessage: 'Either pricebook entry or product must be specified',
      formula: 'AND(ISBLANK(pricebook_entry_id), ISBLANK(product_id))'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Line Item Information',
        columns: 2,
        fields: ['line_number', 'quote_id', 'product_id', 'product_name', 'product_code', 'status']
      },
      {
        label: 'Bundle & Dependencies',
        columns: 2,
        fields: ['product_bundle_id', 'is_bundle', 'bundle_parent_id', 'required_by_line_item_id', 'is_optional']
      },
      {
        label: 'quantity & Units',
        columns: 2,
        fields: ['quantity', 'unit_of_measure']
      },
      {
        label: 'Pricing',
        columns: 2,
        fields: ['pricebook_entry_id', 'list_price', 'discount_type', 'discount_percent', 'discount_amount', 'unit_price', 'price_rule_id']
      },
      {
        label: 'Amounts',
        columns: 2,
        fields: ['subtotal', 'total_price', 'margin', 'margin_percent']
      },
      {
        label: 'Tax',
        columns: 2,
        fields: ['is_taxable', 'tax_percent', 'tax_amount']
      },
      {
        label: 'Additional Charges',
        columns: 2,
        fields: ['setup_fee', 'shipping_cost']
      },
      {
        label: 'Service Dates',
        columns: 2,
        fields: ['service_start_date', 'service_end_date', 'billing_frequency']
      },
      {
        label: 'Configuration',
        columns: 1,
        fields: ['selected_options', 'configuration_json']
      },
      {
        label: 'Notes',
        columns: 1,
        fields: ['description', 'customer_notes', 'internal_notes']
      },
      {
        label: 'AI Recommendations',
        columns: 1,
        fields: ['ai_recommended_upsell', 'ai_recommended_cross_sell', 'ai_optimal_quantity']
      }
    ]
  }
};

export default QuoteLineItem;

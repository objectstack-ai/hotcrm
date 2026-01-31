import type { ObjectSchema } from '@objectstack/spec/data';

const QuoteLineItem: ObjectSchema = {
  name: 'quote_line_item',
  label: 'Quote Line Item',
  labelPlural: 'Quote Line Items',
  icon: 'list',
  description: 'Individual line items on quotes with pricing, quantity, and discount information',
  enable: {
    searchEnabled: true,
    trackHistory: true,
    activitiesEnabled: false,
    feedsEnabled: false,
    filesEnabled: false
  },
  fields: {
    // Related Records
    QuoteId: {
      type: 'lookup',
      label: 'Quote',
      reference: 'Quote',
      required: true
    },
    ProductId: {
      type: 'lookup',
      label: 'Product',
      reference: 'Product',
      required: true
    },
    ProductBundleId: {
      type: 'lookup',
      label: 'Product Bundle',
      reference: 'ProductBundle',
      description: 'Bundle this line item is part of'
    },
    PricebookEntryId: {
      type: 'lookup',
      label: 'Pricebook Entry',
      reference: 'PricebookEntry',
      description: 'Reference to the pricebook entry'
    },
    // Line Item Details
    LineNumber: {
      type: 'number',
      label: 'Line Number',
      precision: 0,
      required: true,
      description: 'Display order of line item'
    },
    ProductName: {
      type: 'text',
      label: 'Product Name',
      maxLength: 255,
      readonly: true,
      description: 'Cached product name for quick display'
    },
    ProductCode: {
      type: 'text',
      label: 'Product Code',
      maxLength: 50,
      readonly: true,
      description: 'Cached product code'
    },
    Description: {
      type: 'textarea',
      label: 'Description',
      maxLength: 2000,
      description: 'Custom description for this line item'
    },
    // Quantity & Units
    Quantity: {
      type: 'number',
      label: 'Quantity',
      precision: 2,
      required: true,
      defaultValue: 1,
      description: 'Number of units'
    },
    UnitOfMeasure: {
      type: 'text',
      label: 'Unit of Measure',
      maxLength: 50,
      description: 'e.g., Each, License, User, GB, Hour'
    },
    // Pricing
    ListPrice: {
      type: 'currency',
      label: 'List Price',
      precision: 2,
      required: true,
      description: 'Standard list price per unit'
    },
    UnitPrice: {
      type: 'currency',
      label: 'Unit Price',
      precision: 2,
      required: true,
      description: 'Actual selling price per unit (after discounts)'
    },
    // Discounts
    DiscountType: {
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
    DiscountPercent: {
      type: 'percent',
      label: 'Discount %',
      description: 'Discount percentage applied to list price'
    },
    DiscountAmount: {
      type: 'currency',
      label: 'Discount Amount',
      precision: 2,
      description: 'Total discount amount for this line'
    },
    PriceRuleId: {
      type: 'lookup',
      label: 'Applied Price Rule',
      reference: 'PriceRule',
      description: 'Pricing rule applied to this line item'
    },
    // Calculated Amounts
    Subtotal: {
      type: 'currency',
      label: 'Subtotal',
      precision: 2,
      readonly: true,
      description: 'List Price × Quantity'
    },
    TotalPrice: {
      type: 'currency',
      label: 'Total Price',
      precision: 2,
      readonly: true,
      description: 'Unit Price × Quantity (after discounts)'
    },
    Margin: {
      type: 'currency',
      label: 'Margin',
      precision: 2,
      readonly: true,
      description: 'Profit margin for this line item'
    },
    MarginPercent: {
      type: 'percent',
      label: 'Margin %',
      readonly: true,
      description: 'Profit margin percentage'
    },
    // Product Configuration
    ConfigurationJSON: {
      type: 'textarea',
      label: 'Configuration',
      maxLength: 32000,
      description: 'JSON configuration for customizable products'
    },
    SelectedOptions: {
      type: 'textarea',
      label: 'Selected Options',
      maxLength: 2000,
      description: 'Selected product options and variants'
    },
    // Service Dates (for subscription/service products)
    ServiceStartDate: {
      type: 'date',
      label: 'Service Start Date',
      description: 'Start date for subscription or service'
    },
    ServiceEndDate: {
      type: 'date',
      label: 'Service End Date',
      description: 'End date for subscription or service'
    },
    BillingFrequency: {
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
    TaxPercent: {
      type: 'percent',
      label: 'Tax %',
      description: 'Tax percentage for this line item'
    },
    TaxAmount: {
      type: 'currency',
      label: 'Tax Amount',
      precision: 2,
      readonly: true,
      description: 'Calculated tax amount'
    },
    IsTaxable: {
      type: 'checkbox',
      label: 'Taxable',
      defaultValue: true,
      description: 'Is this line item subject to tax?'
    },
    // Additional Charges
    SetupFee: {
      type: 'currency',
      label: 'Setup Fee',
      precision: 2,
      defaultValue: 0,
      description: 'One-time setup fee'
    },
    ShippingCost: {
      type: 'currency',
      label: 'Shipping Cost',
      precision: 2,
      defaultValue: 0,
      description: 'Shipping cost for this item'
    },
    // Product Dependencies
    RequiredByLineItemId: {
      type: 'lookup',
      label: 'Required By',
      reference: 'QuoteLineItem',
      description: 'Parent line item that requires this item'
    },
    IsOptional: {
      type: 'checkbox',
      label: 'Optional',
      defaultValue: false,
      description: 'Is this an optional add-on?'
    },
    IsBundle: {
      type: 'checkbox',
      label: 'Bundle',
      defaultValue: false,
      readonly: true,
      description: 'Is this a bundle item?'
    },
    BundleParentId: {
      type: 'lookup',
      label: 'Bundle Parent',
      reference: 'QuoteLineItem',
      description: 'Parent bundle line item'
    },
    // Notes
    InternalNotes: {
      type: 'textarea',
      label: 'Internal Notes',
      maxLength: 2000,
      description: 'Internal notes not visible to customer'
    },
    CustomerNotes: {
      type: 'textarea',
      label: 'Customer Notes',
      maxLength: 2000,
      description: 'Notes visible to customer on quote'
    },
    // Status
    Status: {
      type: 'select',
      label: 'Status',
      defaultValue: 'Active',
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Deleted', value: 'Deleted' },
        { label: 'Alternate', value: 'Alternate' }
      ]
    },
    // AI Enhancement
    AIRecommendedUpsell: {
      type: 'lookup',
      label: 'AI Recommended Upsell',
      reference: 'Product',
      readonly: true,
      description: 'AI-suggested upsell product for this line item'
    },
    AIRecommendedCrossSell: {
      type: 'textarea',
      label: 'AI Cross-Sell Recommendations',
      readonly: true,
      maxLength: 2000,
      description: 'AI-suggested complementary products'
    },
    AIOptimalQuantity: {
      type: 'number',
      label: 'AI Optimal Quantity',
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
      foreignKey: 'RequiredByLineItemId',
      label: 'Child Line Items'
    },
    {
      name: 'BundleComponents',
      type: 'hasMany',
      object: 'QuoteLineItem',
      foreignKey: 'BundleParentId',
      label: 'Bundle Components'
    }
  ],
  listViews: [
    {
      name: 'AllLineItems',
      label: 'All Line Items',
      filters: [],
      columns: ['LineNumber', 'QuoteId', 'ProductName', 'Quantity', 'UnitPrice', 'TotalPrice', 'Status'],
      sort: [['LineNumber', 'asc']]
    },
    {
      name: 'ActiveLineItems',
      label: 'Active',
      filters: [['Status', '=', 'Active']],
      columns: ['LineNumber', 'ProductName', 'Quantity', 'ListPrice', 'DiscountPercent', 'UnitPrice', 'TotalPrice'],
      sort: [['LineNumber', 'asc']]
    },
    {
      name: 'DiscountedItems',
      label: 'Discounted Items',
      filters: [
        ['Status', '=', 'Active'],
        ['DiscountPercent', '>', 0]
      ],
      columns: ['ProductName', 'ListPrice', 'DiscountPercent', 'UnitPrice', 'TotalPrice', 'MarginPercent'],
      sort: [['DiscountPercent', 'desc']]
    },
    {
      name: 'BundleItems',
      label: 'Bundle Items',
      filters: [['IsBundle', '=', true]],
      columns: ['ProductName', 'BundleParentId', 'Quantity', 'UnitPrice', 'TotalPrice'],
      sort: [['BundleParentId', 'asc']]
    },
    {
      name: 'SubscriptionItems',
      label: 'Subscriptions',
      filters: [['BillingFrequency', '!=', 'OneTime']],
      columns: ['ProductName', 'BillingFrequency', 'ServiceStartDate', 'ServiceEndDate', 'UnitPrice', 'TotalPrice'],
      sort: [['ServiceStartDate', 'asc']]
    },
    {
      name: 'HighValueItems',
      label: 'High Value',
      filters: [
        ['TotalPrice', '>', 10000],
        ['Status', '=', 'Active']
      ],
      columns: ['ProductName', 'Quantity', 'UnitPrice', 'TotalPrice', 'MarginPercent'],
      sort: [['TotalPrice', 'desc']]
    }
  ],
  validationRules: [
    {
      name: 'QuantityPositive',
      errorMessage: 'Quantity must be greater than zero',
      formula: 'Quantity <= 0'
    },
    {
      name: 'UnitPriceLessThanOrEqualListPrice',
      errorMessage: 'Unit price cannot exceed list price without approval',
      formula: 'UnitPrice > ListPrice'
    },
    {
      name: 'DiscountPercentValid',
      errorMessage: 'Discount percentage must be between 0% and 100%',
      formula: 'AND(DiscountType = "Percentage", OR(DiscountPercent < 0, DiscountPercent > 1))'
    },
    {
      name: 'ServiceEndDateAfterStartDate',
      errorMessage: 'Service end date must be after start date',
      formula: 'AND(NOT(ISBLANK(ServiceStartDate)), NOT(ISBLANK(ServiceEndDate)), ServiceEndDate <= ServiceStartDate)'
    },
    {
      name: 'BundleComponentRequired',
      errorMessage: 'Bundle components must have a bundle parent specified',
      formula: 'AND(IsOptional = false, NOT(ISBLANK(RequiredByLineItemId)), ISBLANK(BundleParentId))'
    },
    {
      name: 'PricebookEntryOrProductRequired',
      errorMessage: 'Either pricebook entry or product must be specified',
      formula: 'AND(ISBLANK(PricebookEntryId), ISBLANK(ProductId))'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Line Item Information',
        columns: 2,
        fields: ['LineNumber', 'QuoteId', 'ProductId', 'ProductName', 'ProductCode', 'Status']
      },
      {
        label: 'Bundle & Dependencies',
        columns: 2,
        fields: ['ProductBundleId', 'IsBundle', 'BundleParentId', 'RequiredByLineItemId', 'IsOptional']
      },
      {
        label: 'Quantity & Units',
        columns: 2,
        fields: ['Quantity', 'UnitOfMeasure']
      },
      {
        label: 'Pricing',
        columns: 2,
        fields: ['PricebookEntryId', 'ListPrice', 'DiscountType', 'DiscountPercent', 'DiscountAmount', 'UnitPrice', 'PriceRuleId']
      },
      {
        label: 'Amounts',
        columns: 2,
        fields: ['Subtotal', 'TotalPrice', 'Margin', 'MarginPercent']
      },
      {
        label: 'Tax',
        columns: 2,
        fields: ['IsTaxable', 'TaxPercent', 'TaxAmount']
      },
      {
        label: 'Additional Charges',
        columns: 2,
        fields: ['SetupFee', 'ShippingCost']
      },
      {
        label: 'Service Dates',
        columns: 2,
        fields: ['ServiceStartDate', 'ServiceEndDate', 'BillingFrequency']
      },
      {
        label: 'Configuration',
        columns: 1,
        fields: ['SelectedOptions', 'ConfigurationJSON']
      },
      {
        label: 'Notes',
        columns: 1,
        fields: ['Description', 'CustomerNotes', 'InternalNotes']
      },
      {
        label: 'AI Recommendations',
        columns: 1,
        fields: ['AIRecommendedUpsell', 'AIRecommendedCrossSell', 'AIOptimalQuantity']
      }
    ]
  }
};

export default QuoteLineItem;

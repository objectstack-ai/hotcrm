import { ObjectSchema, Field } from '@objectstack/spec/data';

export const QuoteLineItem = ObjectSchema.create({
  name: 'quote_line_item',
  label: 'Quote Line Item',
  pluralLabel: 'Quote Line Items',
  icon: 'list',
  description: 'Individual line items on quotes with pricing, quantity, and discount information',

  fields: {
    quote_id: Field.lookup('quote', {
      label: 'Quote',
      required: true
    }),
    product_id: Field.lookup('product', {
      label: 'Product',
      required: true
    }),
    product_bundle_id: Field.lookup('product_bundle', {
      label: 'Product Bundle',
      description: 'Bundle this line item is part of'
    }),
    pricebook_entry_id: Field.lookup('pricebook_entry', {
      label: 'Pricebook Entry',
      description: 'Reference to the pricebook entry'
    }),
    line_number: Field.number({
      label: 'Line Number',
      description: 'Display order of line item',
      required: true,
      precision: 0
    }),
    product_name: Field.text({
      label: 'Product Name',
      description: 'Cached product name for quick display',
      readonly: true,
      maxLength: 255
    }),
    product_code: Field.text({
      label: 'Product Code',
      description: 'Cached product code',
      readonly: true,
      maxLength: 50
    }),
    description: Field.textarea({
      label: 'description',
      description: 'Custom description for this line item',
      maxLength: 2000
    }),
    quantity: Field.number({
      label: 'quantity',
      description: 'Number of units',
      required: true,
      defaultValue: 1,
      precision: 2
    }),
    unit_of_measure: Field.text({
      label: 'Unit of Measure',
      description: 'e.g., Each, License, User, GB, Hour',
      maxLength: 50
    }),
    list_price: Field.currency({
      label: 'List Price',
      description: 'Standard list price per unit',
      required: true,
      precision: 2
    }),
    unit_price: Field.currency({
      label: 'Unit Price',
      description: 'Actual selling price per unit (after discounts)',
      required: true,
      precision: 2
    }),
    discount_type: Field.select({
      label: 'Discount Type',
      defaultValue: 'None',
      options: [
        {
          "label": "None",
          "value": "None"
        },
        {
          "label": "Percentage",
          "value": "Percentage"
        },
        {
          "label": "Amount per Unit",
          "value": "AmountPerUnit"
        },
        {
          "label": "Total Amount",
          "value": "TotalAmount"
        }
      ]
    }),
    discount_percent: Field.percent({
      label: 'Discount %',
      description: 'Discount percentage applied to list price'
    }),
    discount_amount: Field.currency({
      label: 'Discount Amount',
      description: 'Total discount amount for this line',
      precision: 2
    }),
    price_rule_id: Field.lookup('PriceRule', {
      label: 'Applied Price Rule',
      description: 'Pricing rule applied to this line item'
    }),
    subtotal: Field.currency({
      label: 'subtotal',
      description: 'List Price × quantity',
      readonly: true,
      precision: 2
    }),
    total_price: Field.currency({
      label: 'Total Price',
      description: 'Unit Price × quantity (after discounts)',
      readonly: true,
      precision: 2
    }),
    margin: Field.currency({
      label: 'margin',
      description: 'Profit margin for this line item',
      readonly: true,
      precision: 2
    }),
    margin_percent: Field.percent({
      label: 'margin %',
      description: 'Profit margin percentage',
      readonly: true
    }),
    configuration_json: Field.textarea({
      label: 'Configuration',
      description: 'JSON configuration for customizable products',
      maxLength: 32000
    }),
    selected_options: Field.textarea({
      label: 'Selected Options',
      description: 'Selected product options and variants',
      maxLength: 2000
    }),
    service_start_date: Field.date({
      label: 'Service Start Date',
      description: 'Start date for subscription or service'
    }),
    service_end_date: Field.date({
      label: 'Service End Date',
      description: 'End date for subscription or service'
    }),
    billing_frequency: Field.select({
      label: 'Billing Frequency',
      defaultValue: 'OneTime',
      options: [
        {
          "label": "One-Time",
          "value": "OneTime"
        },
        {
          "label": "Monthly",
          "value": "Monthly"
        },
        {
          "label": "Quarterly",
          "value": "Quarterly"
        },
        {
          "label": "Semi-Annual",
          "value": "SemiAnnual"
        },
        {
          "label": "Annual",
          "value": "Annual"
        }
      ]
    }),
    tax_percent: Field.percent({
      label: 'Tax %',
      description: 'Tax percentage for this line item'
    }),
    tax_amount: Field.currency({
      label: 'Tax Amount',
      description: 'Calculated tax amount',
      readonly: true,
      precision: 2
    }),
    is_taxable: Field.boolean({
      label: 'Taxable',
      description: 'Is this line item subject to tax?',
      defaultValue: true
    }),
    setup_fee: Field.currency({
      label: 'Setup Fee',
      description: 'One-time setup fee',
      defaultValue: 0,
      precision: 2
    }),
    shipping_cost: Field.currency({
      label: 'Shipping Cost',
      description: 'Shipping cost for this item',
      defaultValue: 0,
      precision: 2
    }),
    required_by_line_item_id: Field.lookup('QuoteLineItem', {
      label: 'Required By',
      description: 'Parent line item that requires this item'
    }),
    is_optional: Field.boolean({
      label: 'Optional',
      description: 'Is this an optional add-on?',
      defaultValue: false
    }),
    is_bundle: Field.boolean({
      label: 'Bundle',
      description: 'Is this a bundle item?',
      defaultValue: false,
      readonly: true
    }),
    bundle_parent_id: Field.lookup('QuoteLineItem', {
      label: 'Bundle Parent',
      description: 'Parent bundle line item'
    }),
    internal_notes: Field.textarea({
      label: 'Internal Notes',
      description: 'Internal notes not visible to customer',
      maxLength: 2000
    }),
    customer_notes: Field.textarea({
      label: 'Customer Notes',
      description: 'Notes visible to customer on quote',
      maxLength: 2000
    }),
    status: Field.select({
      label: 'status',
      defaultValue: 'Active',
      options: [
        {
          "label": "Active",
          "value": "Active"
        },
        {
          "label": "Deleted",
          "value": "Deleted"
        },
        {
          "label": "Alternate",
          "value": "Alternate"
        }
      ]
    }),
    ai_recommended_upsell: Field.lookup('product', {
      label: 'AI Recommended Upsell',
      description: 'AI-suggested upsell product for this line item',
      readonly: true
    }),
    ai_recommended_cross_sell: Field.textarea({
      label: 'AI Cross-Sell Recommendations',
      description: 'AI-suggested complementary products',
      readonly: true,
      maxLength: 2000
    }),
    ai_optimal_quantity: Field.number({
      label: 'AI Optimal quantity',
      description: 'AI-recommended optimal quantity based on usage patterns',
      readonly: true,
      precision: 0
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: false,
    feeds: false,
    files: false
  },
});
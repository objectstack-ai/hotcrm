import { ObjectSchema, Field } from '@objectstack/spec/data';

export const ProductBundle = ObjectSchema.create({
  name: 'product_bundle',
  label: 'Product Bundle',
  pluralLabel: 'Product Bundles',
  icon: 'box-open',
  description: 'Product bundles and packages with dependencies, constraints, and configuration options',

  fields: {
    name: Field.text({
      label: 'Bundle name',
      required: true,
      maxLength: 255
    }),
    bundle_code: Field.text({
      label: 'Bundle Code',
      description: 'Unique identifier for the bundle',
      unique: true,
      maxLength: 50
    }),
    description: Field.textarea({
      label: 'description',
      maxLength: 32000
    }),
    status: Field.select({
      label: 'status',
      required: true,
      defaultValue: 'Active',
      options: [
        {
          "label": "✅ Active",
          "value": "Active"
        },
        {
          "label": "📝 Draft",
          "value": "Draft"
        },
        {
          "label": "🚫 Inactive",
          "value": "Inactive"
        },
        {
          "label": "📦 Archived",
          "value": "Archived"
        }
      ]
    }),
    bundle_type: Field.select({
      label: 'Bundle Type',
      description: 'Type of product bundle',
      required: true,
      options: [
        {
          "label": "Fixed Bundle",
          "value": "Fixed"
        },
        {
          "label": "Customizable Bundle",
          "value": "Customizable"
        },
        {
          "label": "Recommended Package",
          "value": "Recommended"
        },
        {
          "label": "Frequently Bought Together",
          "value": "FrequentlyBought"
        }
      ]
    }),
    pricing_method: Field.select({
      label: 'Pricing Method',
      required: true,
      defaultValue: 'Sum',
      options: [
        {
          "label": "Sum of Components",
          "value": "Sum"
        },
        {
          "label": "Fixed Price",
          "value": "Fixed"
        },
        {
          "label": "Percentage Discount",
          "value": "PercentageDiscount"
        },
        {
          "label": "Amount Discount",
          "value": "AmountDiscount"
        }
      ]
    }),
    fixed_price: Field.currency({
      label: 'Fixed Price',
      description: 'Fixed price when pricing_method is Fixed',
      precision: 2
    }),
    discount_percent: Field.percent({
      label: 'Discount %',
      description: 'Discount percentage when pricing_method is PercentageDiscount'
    }),
    discount_amount: Field.currency({
      label: 'Discount Amount',
      description: 'Discount amount when pricing_method is AmountDiscount',
      precision: 2
    }),
    minimum_price: Field.currency({
      label: 'Minimum Price',
      description: 'Minimum allowed price for the bundle',
      precision: 2
    }),
    maximum_price: Field.currency({
      label: 'Maximum Price',
      description: 'Maximum allowed price for the bundle',
      precision: 2
    }),
    allow_customization: Field.boolean({
      label: 'Allow Customization',
      description: 'Allow customers to customize bundle components',
      defaultValue: false
    }),
    min_components: Field.number({
      label: 'Minimum Components',
      description: 'Minimum number of components required',
      defaultValue: 1,
      precision: 0
    }),
    max_components: Field.number({
      label: 'Maximum Components',
      description: 'Maximum number of components allowed',
      precision: 0
    }),
    start_date: Field.date({
      label: 'Start Date',
      description: 'Date when bundle becomes available'
    }),
    end_date: Field.date({
      label: 'End Date',
      description: 'Date when bundle expires'
    }),
    stock_level: Field.number({
      label: 'Stock Level',
      description: 'Available stock for the bundle',
      precision: 0
    }),
    low_stock_threshold: Field.number({
      label: 'Low Stock Threshold',
      description: 'Alert when stock falls below this level',
      precision: 0
    }),
    is_stock_tracked: Field.boolean({
      label: 'Track Stock',
      description: 'Enable stock tracking for this bundle',
      defaultValue: false
    }),
    featured_bundle: Field.boolean({
      label: 'Featured Bundle',
      description: 'Display as featured bundle',
      defaultValue: false
    }),
    display_order: Field.number({
      label: 'Display Order',
      description: 'Order to display in bundle list',
      precision: 0
    }),
    image_url: Field.url({
      label: 'Image URL',
      description: 'URL to bundle image'
    }),
    ai_recommendation_score: Field.number({
      label: 'AI Recommendation Score',
      description: 'AI-calculated recommendation score based on purchase patterns',
      readonly: true,
      precision: 2
    }),
    ai_frequency_score: Field.number({
      label: 'Frequency Score',
      description: 'How frequently this bundle is purchased together',
      readonly: true,
      precision: 2
    }),
    ai_suggested_upgrade: Field.lookup('ProductBundle', {
      label: 'Suggested Upgrade',
      description: 'AI-suggested upgrade bundle'
    })
  },

  enable: {
    searchEnabled: true,
    trackHistory: true,
    allowActivities: true,
    allowFeeds: true,
    allowAttachments: true
  },
});
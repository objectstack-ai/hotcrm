import { ObjectSchema, Field } from '@objectstack/spec/data';

export const PriceRule = ObjectSchema.create({
  name: 'price_rule',
  label: 'Price Rule',
  pluralLabel: 'Price Rules',
  icon: 'calculator',
  description: 'Pricing rules for tiered pricing, volume discounts, contract-based pricing, and promotional pricing',

  fields: {
    name: Field.text({
      label: 'Rule name',
      required: true,
      maxLength: 255
    }),
    rule_code: Field.text({
      label: 'Rule Code',
      description: 'Unique identifier for the pricing rule',
      unique: true,
      maxLength: 50
    }),
    description: Field.textarea({
      label: 'description',
      maxLength: 2000
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
          "label": "⏰ Scheduled",
          "value": "Scheduled"
        },
        {
          "label": "⌛ Expired",
          "value": "Expired"
        }
      ]
    }),
    rule_type: Field.select({
      label: 'Rule Type',
      required: true,
      options: [
        {
          "label": "Tiered Pricing",
          "value": "Tiered"
        },
        {
          "label": "Volume Discount",
          "value": "VolumeDiscount"
        },
        {
          "label": "Contract Pricing",
          "value": "ContractBased"
        },
        {
          "label": "Customer Specific",
          "value": "CustomerSpecific"
        },
        {
          "label": "Promotional Pricing",
          "value": "Promotional"
        },
        {
          "label": "Competitive Pricing",
          "value": "Competitive"
        },
        {
          "label": "Bundle Discount",
          "value": "BundleDiscount"
        }
      ]
    }),
    priority: Field.number({
      label: 'priority',
      description: 'Rule execution priority (lower number = higher priority)',
      required: true,
      defaultValue: 100,
      precision: 0
    }),
    applies_to: Field.select({
      label: 'Applies To',
      required: true,
      options: [
        {
          "label": "All Products",
          "value": "AllProducts"
        },
        {
          "label": "Specific Product",
          "value": "SpecificProduct"
        },
        {
          "label": "Product Category",
          "value": "product_category"
        },
        {
          "label": "Product Family",
          "value": "product_family"
        },
        {
          "label": "Product Bundle",
          "value": "ProductBundle"
        }
      ]
    }),
    product_id: Field.lookup('product', {
      label: 'Product',
      description: 'Specific product this rule applies to'
    }),
    product_category: Field.text({
      label: 'Product Category',
      description: 'Product category this rule applies to',
      maxLength: 100
    }),
    product_family: Field.text({
      label: 'Product Family',
      description: 'Product family this rule applies to',
      maxLength: 100
    }),
    product_bundle_id: Field.lookup('ProductBundle', {
      label: 'Product Bundle',
      description: 'Product bundle this rule applies to'
    }),
    customer_scope: Field.select({
      label: 'Customer Scope',
      required: true,
      defaultValue: 'AllCustomers',
      options: [
        {
          "label": "All Customers",
          "value": "AllCustomers"
        },
        {
          "label": "Specific Account",
          "value": "SpecificAccount"
        },
        {
          "label": "Account Type",
          "value": "account_type"
        },
        {
          "label": "industry",
          "value": "industry"
        },
        {
          "label": "Customer Segment",
          "value": "customer_segment"
        }
      ]
    }),
    account_id: Field.lookup('account', {
      label: 'Account',
      description: 'Specific account this rule applies to'
    }),
    account_type: Field.text({
      label: 'Account Type',
      description: 'Account type this rule applies to',
      maxLength: 100
    }),
    industry: Field.text({
      label: 'industry',
      description: 'industry this rule applies to',
      maxLength: 100
    }),
    customer_segment: Field.text({
      label: 'Customer Segment',
      description: 'Customer segment this rule applies to',
      maxLength: 100
    }),
    start_date: Field.date({
      label: 'Start Date',
      description: 'Date when rule becomes active',
      required: true
    }),
    end_date: Field.date({
      label: 'End Date',
      description: 'Date when rule expires'
    }),
    discount_type: Field.select({
      label: 'Discount Type',
      options: [
        {
          "label": "Percentage",
          "value": "Percentage"
        },
        {
          "label": "Fixed Amount",
          "value": "FixedAmount"
        },
        {
          "label": "New Price",
          "value": "new_price"
        }
      ]
    }),
    discount_percent: Field.percent({
      label: 'Discount %',
      description: 'Discount percentage'
    }),
    discount_amount: Field.currency({
      label: 'Discount Amount',
      description: 'Fixed discount amount',
      precision: 2
    }),
    new_price: Field.currency({
      label: 'New Price',
      description: 'Overridden price',
      precision: 2
    }),
    use_tiered_pricing: Field.checkbox({
      label: 'Use Tiered Pricing',
      description: 'Enable quantity-based tiered pricing',
      defaultValue: false
    }),
    minimum_quantity: Field.number({
      label: 'Minimum Quantity',
      description: 'Minimum quantity required for rule to apply',
      precision: 0
    }),
    maximum_quantity: Field.number({
      label: 'Maximum Quantity',
      description: 'Maximum quantity for rule applicability',
      precision: 0
    }),
    contract_id: Field.lookup('Contract', {
      label: 'Contract',
      description: 'Contract this pricing rule is associated with'
    }),
    require_contract: Field.checkbox({
      label: 'Require Contract',
      description: 'Rule only applies if customer has an active contract',
      defaultValue: false
    }),
    promotion_code: Field.text({
      label: 'Promotion Code',
      description: 'Promotion code for customer entry',
      maxLength: 50
    }),
    is_public: Field.checkbox({
      label: 'Public Promotion',
      description: 'Publicly advertised promotion',
      defaultValue: false
    }),
    usage_limit: Field.number({
      label: 'Usage Limit',
      description: 'Maximum number of times rule can be used',
      precision: 0
    }),
    usage_count: Field.number({
      label: 'Usage Count',
      description: 'Current usage count',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    allow_stacking: Field.checkbox({
      label: 'Allow Stacking',
      description: 'Allow combining with other pricing rules',
      defaultValue: false
    }),
    exclusion_rules: Field.textarea({
      label: 'Exclusion Rules',
      description: 'Rules that cannot be combined with this rule (comma-separated rule codes)',
      maxLength: 2000
    }),
    competitor_price: Field.currency({
      label: 'Competitor Price',
      description: 'Competitor reference price',
      precision: 2
    }),
    competitor_name: Field.text({
      label: 'Competitor name',
      description: 'Competitor being matched or beaten',
      maxLength: 255
    }),
    price_match_strategy: Field.select({
      label: 'Price Match Strategy',
      options: [
        {
          "label": "Match Competitor",
          "value": "Match"
        },
        {
          "label": "Beat by %",
          "value": "beat_by_percent"
        },
        {
          "label": "Beat by Amount",
          "value": "beat_by_amount"
        }
      ]
    }),
    beat_by_percent: Field.percent({
      label: 'Beat By %',
      description: 'Percentage to beat competitor price by'
    }),
    beat_by_amount: Field.currency({
      label: 'Beat By Amount',
      description: 'Amount to beat competitor price by',
      precision: 2
    }),
    requires_approval: Field.checkbox({
      label: 'Requires Approval',
      description: 'Rule requires approval before activation',
      defaultValue: false
    }),
    approval_status: Field.select({
      label: 'Approval status',
      defaultValue: 'Not Required',
      readonly: true,
      options: [
        {
          "label": "Not Required",
          "value": "Not Required"
        },
        {
          "label": "Pending",
          "value": "Pending"
        },
        {
          "label": "Approved",
          "value": "Approved"
        },
        {
          "label": "Rejected",
          "value": "Rejected"
        }
      ]
    }),
    approved_by_id: Field.lookup('users', {
      label: 'Approved By',
      readonly: true
    }),
    approved_date: Field.datetime({
      label: 'Approved Date',
      readonly: true
    }),
    ai_optimal_discount_percent: Field.percent({
      label: 'AI Optimal Discount',
      description: 'AI-recommended optimal discount percentage',
      readonly: true
    }),
    ai_expected_impact: Field.textarea({
      label: 'AI Expected Impact',
      description: 'AI analysis of expected revenue and margin impact',
      readonly: true,
      maxLength: 2000
    }),
    ai_competitive_analysis: Field.textarea({
      label: 'AI Competitive Analysis',
      description: 'AI-powered competitive pricing insights',
      readonly: true,
      maxLength: 2000
    })
  },

  enable: {
    searchEnabled: true,
    trackHistory: true,
    allowActivities: true,
    allowFeeds: true,
    allowAttachments: false
  },
});
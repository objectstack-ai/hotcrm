import { ObjectSchema, Field } from '@objectstack/spec/data';

export const DiscountSchedule = ObjectSchema.create({
  name: 'discount_schedule',
  label: 'Discount Schedule',
  pluralLabel: 'Discount Schedules',
  icon: 'percent',
  description: 'Discount schedules with date ranges, approval workflows, and margin protection',

  fields: {
    name: Field.text({
      label: 'Schedule name',
      required: true,
      maxLength: 255
    }),
    schedule_code: Field.text({
      label: 'Schedule Code',
      description: 'Unique identifier for the discount schedule',
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
    schedule_type: Field.select({
      label: 'Schedule Type',
      required: true,
      options: [
        {
          "label": "Seasonal Discount",
          "value": "Seasonal"
        },
        {
          "label": "Promotional Campaign",
          "value": "Promotional"
        },
        {
          "label": "Clearance Sale",
          "value": "Clearance"
        },
        {
          "label": "Early Bird Discount",
          "value": "EarlyBird"
        },
        {
          "label": "End of Quarter",
          "value": "EndOfQuarter"
        },
        {
          "label": "Volume-Based",
          "value": "VolumeBased"
        },
        {
          "label": "Loyalty Program",
          "value": "LoyaltyProgram"
        },
        {
          "label": "New Customer",
          "value": "NewCustomer"
        }
      ]
    }),
    start_date: Field.datetime({
      label: 'Start Date',
      description: 'When discount becomes effective',
      required: true
    }),
    end_date: Field.datetime({
      label: 'End Date',
      description: 'When discount expires',
      required: true
    }),
    is_recurring: Field.checkbox({
      label: 'Recurring',
      description: 'Schedule repeats annually',
      defaultValue: false
    }),
    recurrence_pattern: Field.text({
      label: 'Recurrence Pattern',
      description: 'e.g., "Every January 1-31", "Q4 Every Year"',
      maxLength: 100
    }),
    discount_type: Field.select({
      label: 'Discount Type',
      required: true,
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
          "label": "Tiered",
          "value": "Tiered"
        }
      ]
    }),
    default_discount_percent: Field.percent({
      label: 'Default Discount %',
      description: 'Default discount percentage'
    }),
    default_discount_amount: Field.currency({
      label: 'Default Discount Amount',
      description: 'Default fixed discount amount',
      precision: 2
    }),
    minimum_discount_percent: Field.percent({
      label: 'Minimum Discount %',
      description: 'Minimum allowed discount percentage'
    }),
    maximum_discount_percent: Field.percent({
      label: 'Maximum Discount %',
      description: 'Maximum allowed discount percentage'
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
          "label": "Product Category",
          "value": "product_category"
        },
        {
          "label": "Product Family",
          "value": "product_family"
        },
        {
          "label": "Specific Products",
          "value": "SpecificProducts"
        },
        {
          "label": "Product Bundles",
          "value": "ProductBundles"
        }
      ]
    }),
    product_category: Field.text({
      label: 'Product Category',
      maxLength: 100
    }),
    product_family: Field.text({
      label: 'Product Family',
      maxLength: 100
    }),
    included_products: Field.textarea({
      label: 'Included Products',
      description: 'Comma-separated list of product codes',
      maxLength: 2000
    }),
    excluded_products: Field.textarea({
      label: 'Excluded Products',
      description: 'Comma-separated list of excluded product codes',
      maxLength: 2000
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
          "label": "New Customers",
          "value": "NewCustomers"
        },
        {
          "label": "Existing Customers",
          "value": "ExistingCustomers"
        },
        {
          "label": "VIP Customers",
          "value": "VIPCustomers"
        },
        {
          "label": "Specific Accounts",
          "value": "SpecificAccounts"
        },
        {
          "label": "Customer Segment",
          "value": "customer_segment"
        },
        {
          "label": "industry",
          "value": "industry"
        }
      ]
    }),
    customer_segment: Field.text({
      label: 'Customer Segment',
      maxLength: 100
    }),
    industry: Field.text({
      label: 'industry',
      maxLength: 100
    }),
    included_accounts: Field.textarea({
      label: 'Included Accounts',
      description: 'Comma-separated list of account IDs',
      maxLength: 2000
    }),
    requires_approval: Field.checkbox({
      label: 'Requires Approval',
      description: 'Discounts from this schedule require approval',
      defaultValue: false
    }),
    approval_level: Field.number({
      label: 'Approval Level',
      description: 'Required approval level (1-5)',
      precision: 0
    }),
    auto_approve_threshold: Field.percent({
      label: 'Auto-Approve Threshold',
      description: 'Discount % below which auto-approval applies'
    }),
    approval_matrix_id: Field.lookup('ApprovalMatrix', {
      label: 'Approval Matrix',
      description: 'Custom approval matrix for this schedule'
    }),
    enforce_margin_rules: Field.checkbox({
      label: 'Enforce Margin Rules',
      description: 'Enforce minimum margin requirements',
      defaultValue: true
    }),
    minimum_margin_percent: Field.percent({
      label: 'Minimum Margin %',
      description: 'Minimum acceptable profit margin percentage'
    }),
    minimum_margin_amount: Field.currency({
      label: 'Minimum Margin Amount',
      description: 'Minimum acceptable profit margin amount',
      precision: 2
    }),
    alert_below_margin: Field.checkbox({
      label: 'Alert Below Margin',
      description: 'Alert when margin falls below threshold',
      defaultValue: true
    }),
    block_below_margin: Field.checkbox({
      label: 'Block Below Margin',
      description: 'Prevent quotes below minimum margin',
      defaultValue: false
    }),
    usage_limit_type: Field.select({
      label: 'Usage Limit Type',
      defaultValue: 'Unlimited',
      options: [
        {
          "label": "Unlimited",
          "value": "Unlimited"
        },
        {
          "label": "Total Uses",
          "value": "TotalUses"
        },
        {
          "label": "Per Customer",
          "value": "PerCustomer"
        },
        {
          "label": "Per Product",
          "value": "PerProduct"
        }
      ]
    }),
    max_total_uses: Field.number({
      label: 'Max Total Uses',
      description: 'Maximum total number of times schedule can be used',
      precision: 0
    }),
    max_uses_per_customer: Field.number({
      label: 'Max Uses Per Customer',
      description: 'Maximum uses per customer',
      precision: 0
    }),
    max_uses_per_product: Field.number({
      label: 'Max Uses Per Product',
      description: 'Maximum uses per product',
      precision: 0
    }),
    current_usage_count: Field.number({
      label: 'Current Usage Count',
      description: 'Current number of uses',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    minimum_order_value: Field.currency({
      label: 'Minimum Order Value',
      description: 'Minimum order value required to apply discount',
      precision: 2
    }),
    maximum_order_value: Field.currency({
      label: 'Maximum Order Value',
      description: 'Maximum order value for discount applicability',
      precision: 2
    }),
    minimum_quantity: Field.number({
      label: 'Minimum Quantity',
      description: 'Minimum product quantity required',
      precision: 0
    }),
    allow_combine_with_other: Field.checkbox({
      label: 'Allow Combine with Other Discounts',
      description: 'Can be combined with other discount schedules',
      defaultValue: false
    }),
    priority: Field.number({
      label: 'priority',
      description: 'priority when multiple schedules apply (lower = higher priority)',
      defaultValue: 100,
      precision: 0
    }),
    exclusive_with: Field.textarea({
      label: 'Exclusive With',
      description: 'Comma-separated list of schedule codes that cannot be combined',
      maxLength: 2000
    }),
    target_revenue: Field.currency({
      label: 'Target Revenue',
      description: 'Revenue target for this promotion',
      precision: 2
    }),
    actual_revenue: Field.currency({
      label: 'Actual Revenue',
      description: 'Actual revenue generated',
      readonly: true,
      precision: 2
    }),
    target_uses: Field.number({
      label: 'Target Uses',
      description: 'Target number of uses',
      precision: 0
    }),
    conversion_rate: Field.percent({
      label: 'Conversion Rate',
      description: 'Quote to deal conversion rate',
      readonly: true
    }),
    average_discount_given: Field.percent({
      label: 'Average Discount Given',
      description: 'Average discount percentage given',
      readonly: true
    }),
    total_discount_amount: Field.currency({
      label: 'Total Discount Amount',
      description: 'Total discount amount given',
      readonly: true,
      precision: 2
    }),
    ai_optimal_discount_percent: Field.percent({
      label: 'AI Optimal Discount',
      description: 'AI-recommended optimal discount percentage',
      readonly: true
    }),
    ai_expected_r_o_i: Field.percent({
      label: 'AI Expected ROI',
      description: 'AI-predicted return on investment',
      readonly: true
    }),
    ai_recommended_duration: Field.number({
      label: 'AI Recommended Duration (Days)',
      description: 'AI-suggested optimal campaign duration',
      readonly: true,
      precision: 0
    }),
    ai_performance_analysis: Field.textarea({
      label: 'AI Performance Analysis',
      description: 'AI analysis of schedule performance',
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
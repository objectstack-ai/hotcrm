import type { TranslationData } from '@objectstack/spec/system';

/**
 * English (en) — Products & Pricing Translations
 *
 * Per-locale file: one file per language, following the `per_locale` convention.
 * Each file exports a single `TranslationData` object for its locale.
 *
 * Covers all 13 Products objects with field labels, select options, and help texts.
 */
export const en: TranslationData = {
  objects: {
    product: {
      label: 'Product',
      pluralLabel: 'Products',
      fields: {
        name: { label: 'Product Name' },
        product_code: { label: 'Product Code' },
        description: { label: 'Description' },
        family: {
          label: 'Product Family',
          options: {
            Hardware: 'Hardware', Software: 'Software', Service: 'Service',
            Subscription: 'Subscription', Consulting: 'Consulting', Training: 'Training',
            Support: 'Support', License: 'License', Other: 'Other',
          },
        },
        is_active: { label: 'Active' },
        unit_price: { label: 'Unit Price' },
        cost: { label: 'Cost' },
        quantity_in_stock: { label: 'Quantity in Stock' },
      },
    },

    pricebook: {
      label: 'Price Book',
      pluralLabel: 'Price Books',
      fields: {
        name: { label: 'Price Book Name' },
        description: { label: 'Description' },
        is_active: { label: 'Active' },
        is_standard: { label: 'Standard Price Book', help: 'Designates this as the default price book' },
        currency_code: { label: 'Currency' },
        effective_date: { label: 'Effective Date' },
        expiration_date: { label: 'Expiration Date' },
      },
    },

    quote: {
      label: 'Quote',
      pluralLabel: 'Quotes',
      fields: {
        quote_number: { label: 'Quote Number' },
        name: { label: 'Quote Name' },
        opportunity_id: { label: 'Opportunity' },
        account_id: { label: 'Account' },
        contact_id: { label: 'Contact' },
        status: {
          label: 'Status',
          options: {
            Draft: 'Draft 📝', 'Needs Review': 'Needs Review 🔍', 'In Review': 'In Review 🔎',
            Approved: 'Approved ✅', Rejected: 'Rejected ❌', Presented: 'Presented 📊',
            Accepted: 'Accepted 🤝',
          },
        },
        expiration_date: { label: 'Expiration Date' },
        subtotal: { label: 'Subtotal' },
        discount: { label: 'Discount' },
        total_price: { label: 'Total Price' },
        tax: { label: 'Tax' },
        grand_total: { label: 'Grand Total' },
        pricebook_id: { label: 'Price Book' },
        description: { label: 'Description' },
        billing_name: { label: 'Billing Name' },
        billing_street: { label: 'Billing Street' },
        billing_city: { label: 'Billing City' },
        billing_state: { label: 'Billing State' },
        billing_postal_code: { label: 'Billing Postal Code' },
        billing_country: { label: 'Billing Country' },
        shipping_name: { label: 'Shipping Name' },
        shipping_street: { label: 'Shipping Street' },
        shipping_city: { label: 'Shipping City' },
        shipping_state: { label: 'Shipping State' },
        shipping_postal_code: { label: 'Shipping Postal Code' },
        shipping_country: { label: 'Shipping Country' },
        line_item_count: { label: 'Line Items', help: 'Number of line items on this quote' },
        owner_id: { label: 'Owner' },
      },
    },

    quote_line_item: {
      label: 'Quote Line Item',
      pluralLabel: 'Quote Line Items',
      fields: {
        quote_id: { label: 'Quote' },
        product_id: { label: 'Product' },
        quantity: { label: 'Quantity' },
        unit_price: { label: 'Unit Price' },
        discount: { label: 'Discount (%)' },
        total_price: { label: 'Total Price' },
        sort_order: { label: 'Sort Order' },
        description: { label: 'Description' },
        service_date: { label: 'Service Date' },
      },
    },

    product_bundle: {
      label: 'Product Bundle',
      pluralLabel: 'Product Bundles',
      fields: {
        name: { label: 'Bundle Name' },
        description: { label: 'Description' },
        status: {
          label: 'Status',
          options: { Draft: 'Draft 📝', Active: 'Active ✅', Retired: 'Retired 🚫' },
        },
        bundle_price: { label: 'Bundle Price' },
        component_count: { label: 'Components', help: 'Number of products in this bundle' },
        discount_type: {
          label: 'Discount Type',
          options: { Percentage: 'Percentage', 'Fixed Amount': 'Fixed Amount', None: 'None' },
        },
        discount_value: { label: 'Discount Value' },
        is_configurable: { label: 'Configurable', help: 'Allow buyers to customize bundle contents' },
        valid_from: { label: 'Valid From' },
        valid_to: { label: 'Valid To' },
        min_quantity: { label: 'Minimum Quantity' },
        max_quantity: { label: 'Maximum Quantity' },
        owner_id: { label: 'Owner' },
      },
    },

    product_bundle_component: {
      label: 'Bundle Component',
      pluralLabel: 'Bundle Components',
      fields: {
        bundle_id: { label: 'Bundle' },
        product_id: { label: 'Product' },
        quantity: { label: 'Quantity' },
        is_required: { label: 'Required' },
        is_default: { label: 'Default Selected' },
        sort_order: { label: 'Sort Order' },
        min_quantity: { label: 'Min Quantity' },
        max_quantity: { label: 'Max Quantity' },
        discount_override: { label: 'Discount Override', help: 'Override bundle-level discount for this component' },
      },
    },

    price_rule: {
      label: 'Price Rule',
      pluralLabel: 'Price Rules',
      fields: {
        name: { label: 'Rule Name' },
        description: { label: 'Description' },
        type: {
          label: 'Rule Type',
          options: {
            Discount: 'Discount', Surcharge: 'Surcharge', Override: 'Override',
            Tiered: 'Tiered', Volume: 'Volume', Bundle: 'Bundle',
          },
        },
        status: {
          label: 'Status',
          options: {
            Draft: 'Draft 📝', Active: 'Active ✅',
            Inactive: 'Inactive ⏸️', Expired: 'Expired ⏰',
          },
        },
        priority: { label: 'Priority', help: 'Lower number = higher priority' },
        target_object: { label: 'Target Object' },
        condition: { label: 'Condition' },
        discount_type: {
          label: 'Discount Type',
          options: { Percentage: 'Percentage', 'Fixed Amount': 'Fixed Amount' },
        },
        discount_value: { label: 'Discount Value' },
        effective_date: { label: 'Effective Date' },
        expiration_date: { label: 'Expiration Date' },
        owner_id: { label: 'Owner' },
      },
    },

    approval_request: {
      label: 'Approval Request',
      pluralLabel: 'Approval Requests',
      fields: {
        name: { label: 'Request Name' },
        related_object_type: { label: 'Related Object' },
        related_record_id: { label: 'Related Record' },
        status: {
          label: 'Status',
          options: {
            Pending: 'Pending ⏳', Approved: 'Approved ✅', Rejected: 'Rejected ❌',
            Recalled: 'Recalled 🔄', Escalated: 'Escalated 🔺',
          },
        },
        submitted_by_id: { label: 'Submitted By' },
        submitted_date: { label: 'Submitted Date' },
        approver_id: { label: 'Approver' },
        approved_date: { label: 'Approved/Rejected Date' },
        comments: { label: 'Comments' },
        approval_chain: { label: 'Approval Chain', help: 'Ordered list of approval steps' },
        current_step: { label: 'Current Step' },
        total_steps: { label: 'Total Steps' },
        priority: {
          label: 'Priority',
          options: { Low: 'Low', Medium: 'Medium', High: 'High ⚡', Critical: 'Critical 🔥' },
        },
        due_date: { label: 'Due Date' },
      },
    },

    discount_schedule: {
      label: 'Discount Schedule',
      pluralLabel: 'Discount Schedules',
      fields: {
        name: { label: 'Schedule Name' },
        description: { label: 'Description' },
        type: {
          label: 'Schedule Type',
          options: { Volume: 'Volume', Tiered: 'Tiered', Slab: 'Slab' },
        },
        status: {
          label: 'Status',
          options: {
            Draft: 'Draft 📝', Active: 'Active ✅',
            Inactive: 'Inactive ⏸️', Expired: 'Expired ⏰',
          },
        },
        pricebook_id: { label: 'Price Book' },
        product_id: { label: 'Product' },
        effective_date: { label: 'Effective Date' },
        expiration_date: { label: 'Expiration Date' },
        discount_unit: {
          label: 'Discount Unit',
          options: { Percentage: 'Percentage', 'Fixed Amount': 'Fixed Amount' },
        },
        tiers: { label: 'Discount Tiers', help: 'Quantity-based discount tier definitions' },
        owner_id: { label: 'Owner' },
      },
    },

    order: {
      label: 'Order',
      pluralLabel: 'Orders',
      fields: {
        order_number: { label: 'Order Number' },
        account_id: { label: 'Account' },
        contract_id: { label: 'Contract' },
        quote_id: { label: 'Quote' },
        opportunity_id: { label: 'Opportunity' },
        status: {
          label: 'Status',
          options: {
            Draft: 'Draft 📝', Activated: 'Activated 🚀',
            Fulfilled: 'Fulfilled ✅', Cancelled: 'Cancelled ❌',
          },
        },
        order_date: { label: 'Order Date' },
        effective_date: { label: 'Effective Date' },
        total_amount: { label: 'Total Amount' },
        billing_street: { label: 'Billing Street' },
        billing_city: { label: 'Billing City' },
        billing_state: { label: 'Billing State' },
        billing_postal_code: { label: 'Billing Postal Code' },
        billing_country: { label: 'Billing Country' },
        shipping_street: { label: 'Shipping Street' },
        shipping_city: { label: 'Shipping City' },
        shipping_state: { label: 'Shipping State' },
        shipping_postal_code: { label: 'Shipping Postal Code' },
        shipping_country: { label: 'Shipping Country' },
        description: { label: 'Description' },
        owner_id: { label: 'Owner' },
      },
    },

    order_item: {
      label: 'Order Item',
      pluralLabel: 'Order Items',
      fields: {
        order_id: { label: 'Order' },
        product_id: { label: 'Product' },
        quantity: { label: 'Quantity' },
        unit_price: { label: 'Unit Price' },
        total_price: { label: 'Total Price' },
        description: { label: 'Description' },
        service_date: { label: 'Service Date' },
      },
    },

    subscription: {
      label: 'Subscription',
      pluralLabel: 'Subscriptions',
      fields: {
        name: { label: 'Subscription Name' },
        account_id: { label: 'Account' },
        product_id: { label: 'Product' },
        quote_id: { label: 'Quote' },
        status: {
          label: 'Status',
          options: {
            Draft: 'Draft 📝', Active: 'Active ✅', Suspended: 'Suspended ⏸️',
            Cancelled: 'Cancelled ❌', Expired: 'Expired ⏰',
          },
        },
        start_date: { label: 'Start Date' },
        end_date: { label: 'End Date' },
        billing_frequency: {
          label: 'Billing Frequency',
          options: {
            Monthly: 'Monthly', Quarterly: 'Quarterly',
            'Semi-Annually': 'Semi-Annually', Annually: 'Annually',
          },
        },
        unit_price: { label: 'Unit Price' },
        quantity: { label: 'Quantity' },
        total_contract_value: { label: 'Total Contract Value', help: 'Total value over the subscription term' },
        auto_renew: { label: 'Auto-Renew' },
        renewal_term: { label: 'Renewal Term (Months)' },
        cancellation_date: { label: 'Cancellation Date' },
        cancellation_reason: { label: 'Cancellation Reason' },
        next_billing_date: { label: 'Next Billing Date' },
        owner_id: { label: 'Owner' },
      },
    },

    product_option: {
      label: 'Product Option',
      pluralLabel: 'Product Options',
      fields: {
        product_id: { label: 'Product' },
        name: { label: 'Option Name' },
        type: {
          label: 'Option Type',
          options: {
            Color: 'Color', Size: 'Size', Configuration: 'Configuration',
            'Add-On': 'Add-On', Upgrade: 'Upgrade',
          },
        },
        values: { label: 'Available Values' },
        default_value: { label: 'Default Value' },
        is_required: { label: 'Required' },
        price_adjustment: { label: 'Price Adjustment' },
        adjustment_type: {
          label: 'Adjustment Type',
          options: { Fixed: 'Fixed', Percentage: 'Percentage' },
        },
        sort_order: { label: 'Sort Order' },
      },
    },
  },

  apps: {
    products: {
      label: 'Products & Pricing',
      description: 'Product catalog, pricing rules, and CPQ functionality',
    },
  },

  messages: {
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.back': 'Back',
    'common.confirm': 'Confirm',
    'common.refresh': 'Refresh',
    'nav.products_pricing': 'Products & Pricing',
    'nav.subscriptions': 'Subscriptions',
    'nav.views_dashboards': 'Views & Dashboards',
    'nav.quote_approval_timeline': 'Quote Approval Timeline',
    'nav.cpq_dashboard': 'CPQ Dashboard',
    'success.saved': 'Record saved successfully',
    'success.deleted': 'Record deleted successfully',
    'success.quote_approved': 'Quote approved successfully',
    'success.quote_accepted': 'Quote accepted by customer',
    'success.order_activated': 'Order activated successfully',
    'success.subscription_activated': 'Subscription activated successfully',
    'success.bundle_configured': 'Bundle configured successfully',
    'success.price_rule_applied': 'Price rule applied successfully',
    'success.approval_submitted': 'Approval request submitted',
    'confirm.delete': 'Are you sure you want to delete this record?',
    'confirm.approve_quote': 'Approve this quote?',
    'confirm.reject_quote': 'Reject this quote? Please provide a reason.',
    'confirm.activate_order': 'Activate this order? This action cannot be undone.',
    'confirm.cancel_subscription': 'Cancel this subscription? This action will take effect at the end of the current billing period.',
    'error.required': 'This field is required',
    'error.load_failed': 'Failed to load data',
    'error.save_failed': 'Failed to save record',
    'error.pricing_calculation_failed': 'Failed to calculate pricing',
    'error.approval_failed': 'Approval request processing failed',
  },

  validationMessages: {
    discount_exceeds_limit: 'Discount exceeds the maximum allowed limit',
    quantity_must_be_positive: 'Quantity must be greater than zero',
    quote_expired: 'This quote has passed its expiration date',
    bundle_incomplete: 'All required bundle components must be selected',
    unit_price_required: 'Unit price is required for all line items',
    effective_date_required: 'Effective date is required',
    expiration_before_effective: 'Expiration date must be after effective date',
    subscription_dates_invalid: 'Subscription end date must be after start date',
    max_quantity_exceeded: 'Quantity exceeds the maximum allowed',
    min_quantity_not_met: 'Quantity does not meet the minimum requirement',
    duplicate_product_in_bundle: 'This product is already included in the bundle',
    order_total_mismatch: 'Order total does not match the sum of line items',
    approval_chain_required: 'At least one approver is required',
  },
};


const Quote = {
  name: 'quote',
  label: 'Quote',
  labelPlural: 'Quotes',
  icon: 'file-invoice-dollar',
  description: 'CPQ (Configure, Price, Quote) with complex pricing, discount approval, and PDF generation',
  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true,
    approvalProcess: true
  },
  fields: {
    // Basic Information
    quote_number: {
      type: 'autonumber',
      label: 'Quote Number',
      format: 'Q-{YYYY}-{MM}-{0000}',
      readonly: true,
      searchable: true
    },
    name: {
      type: 'text',
      label: 'Quote name',
      required: true,
      searchable: true,
      maxLength: 255
    },
    status: {
      type: 'select',
      label: 'status',
      required: true,
      defaultValue: 'Draft',
      options: [
        { label: '📝 Draft', value: 'Draft' },
        { label: '🔄 In Review', value: 'In Review' },
        { label: '✅ Approved', value: 'Approved' },
        { label: '❌ Rejected', value: 'Rejected' },
        { label: '📧 Sent', value: 'Sent' },
        { label: '🤝 Accepted', value: 'Accepted' },
        { label: '🚫 Declined', value: 'Declined' },
        { label: '⏰ Expired', value: 'Expired' }
      ]
    },
    // Related Records
    opportunity_id: {
      type: 'lookup',
      label: 'Opportunity',
      reference: 'Opportunity',
      required: true
    },
    account_id: {
      type: 'lookup',
      label: 'Account',
      reference: 'Account',
      required: true
    },
    contact_id: {
      type: 'lookup',
      label: 'Contact',
      reference: 'Contact'
    },
    pricebook_id: {
      type: 'lookup',
      label: 'Price Book',
      reference: 'Pricebook',
      required: true
    },
    // Dates
    quote_date: {
      type: 'date',
      label: 'Quote Date',
      required: true,
      defaultValue: '$today'
    },
    expiration_date: {
      type: 'date',
      label: 'Expiration Date',
      required: true
    },
    validity_period_days: {
      type: 'number',
      label: 'Validity Period (Days)',
      precision: 0,
      defaultValue: 30,
      readonly: true
    },
    // Pricing
    subtotal: {
      type: 'currency',
      label: 'subtotal',
      precision: 2,
      readonly: true,
      description: 'Sum of all line item amounts'
    },
    discount_percent: {
      type: 'percent',
      label: 'Discount %',
      defaultValue: 0
    },
    discount_amount: {
      type: 'currency',
      label: 'Discount Amount',
      precision: 2,
      readonly: true
    },
    tax_percent: {
      type: 'percent',
      label: 'Tax %',
      defaultValue: 0
    },
    tax_amount: {
      type: 'currency',
      label: 'Tax Amount',
      precision: 2,
      readonly: true
    },
    shipping_handling: {
      type: 'currency',
      label: 'Shipping & Handling',
      precision: 2,
      defaultValue: 0
    },
    total_price: {
      type: 'currency',
      label: 'Total Price',
      precision: 2,
      readonly: true,
      description: 'subtotal - Discount + Tax + Shipping'
    },
    // Multi-Currency Support
    currency_code: {
      type: 'select',
      label: 'Currency',
      defaultValue: 'USD',
      options: [
        { label: 'USD - US Dollar', value: 'USD' },
        { label: 'EUR - Euro', value: 'EUR' },
        { label: 'GBP - British Pound', value: 'GBP' },
        { label: 'JPY - Japanese Yen', value: 'JPY' },
        { label: 'CNY - Chinese Yuan', value: 'CNY' },
        { label: 'AUD - Australian Dollar', value: 'AUD' },
        { label: 'CAD - Canadian Dollar', value: 'CAD' }
      ]
    },
    exchange_rate: {
      type: 'number',
      label: 'Exchange Rate',
      precision: 6,
      defaultValue: 1.0,
      description: 'Conversion rate to base currency'
    },
    // Payment Terms
    payment_terms: {
      type: 'select',
      label: 'Payment Terms',
      options: [
        { label: 'Full Prepayment', value: 'Full Prepayment' },
        { label: '30% Prepay, 70% on Acceptance', value: '30/70 Split' },
        { label: '50% Prepay, 50% on Acceptance', value: '50/50 Split' },
        { label: 'Net 30', value: 'Net 30' },
        { label: 'Net 60', value: 'Net 60' },
        { label: 'Net 90', value: 'Net 90' },
        { label: 'Installments', value: 'Installments' },
        { label: 'Other', value: 'Other' }
      ]
    },
    delivery_terms: {
      type: 'select',
      label: 'Delivery Terms',
      options: [
        { label: 'On-site Delivery', value: 'On-site Delivery' },
        { label: 'Remote Delivery', value: 'Remote Delivery' },
        { label: 'Cloud Deployment', value: 'Cloud Deployment' },
        { label: 'Shipping', value: 'Shipping' },
        { label: 'Digital Download', value: 'Digital Download' },
        { label: 'Other', value: 'Other' }
      ]
    },
    // Shipping Address
    shipping_street: {
      type: 'text',
      label: 'Shipping Street',
      maxLength: 255
    },
    shipping_city: {
      type: 'text',
      label: 'Shipping City',
      maxLength: 40
    },
    shipping_state: {
      type: 'text',
      label: 'Shipping State',
      maxLength: 80
    },
    shipping_postal_code: {
      type: 'text',
      label: 'Shipping Postal Code',
      maxLength: 20
    },
    shipping_country: {
      type: 'text',
      label: 'Shipping Country',
      maxLength: 80
    },
    // Billing Address
    billing_street: {
      type: 'text',
      label: 'Billing Street',
      maxLength: 255
    },
    billing_city: {
      type: 'text',
      label: 'Billing City',
      maxLength: 40
    },
    billing_state: {
      type: 'text',
      label: 'Billing State',
      maxLength: 80
    },
    billing_postal_code: {
      type: 'text',
      label: 'Billing Postal Code',
      maxLength: 20
    },
    billing_country: {
      type: 'text',
      label: 'Billing Country',
      maxLength: 80
    },
    // Approval Workflow
    approval_status: {
      type: 'select',
      label: 'Approval status',
      readonly: true,
      defaultValue: 'Not Submitted',
      options: [
        { label: 'Not Submitted', value: 'Not Submitted' },
        { label: 'Pending', value: 'Pending' },
        { label: 'Approved', value: 'Approved' },
        { label: 'Rejected', value: 'Rejected' },
        { label: 'Recalled', value: 'Recalled' }
      ]
    },
    approval_level: {
      type: 'number',
      label: 'Approval Level',
      precision: 0,
      readonly: true,
      description: 'Required approval level based on discount %'
    },
    approved_by_id: {
      type: 'lookup',
      label: 'Approved By',
      reference: 'User',
      readonly: true
    },
    approved_date: {
      type: 'datetime',
      label: 'Approved Date',
      readonly: true
    },
    rejected_by_id: {
      type: 'lookup',
      label: 'Rejected By',
      reference: 'User',
      readonly: true
    },
    rejected_date: {
      type: 'datetime',
      label: 'Rejected Date',
      readonly: true
    },
    rejection_reason: {
      type: 'textarea',
      label: 'Rejection Reason',
      maxLength: 2000,
      readonly: true
    },
    // Quote Versioning
    version_number: {
      type: 'number',
      label: 'Version',
      precision: 0,
      defaultValue: 1,
      readonly: true
    },
    is_primary_quote: {
      type: 'checkbox',
      label: 'Primary Quote',
      defaultValue: true,
      description: 'Is this the primary quote for the opportunity?'
    },
    previous_version_id: {
      type: 'lookup',
      label: 'Previous Version',
      reference: 'Quote',
      readonly: true
    },
    latest_version_id: {
      type: 'lookup',
      label: 'Latest Version',
      reference: 'Quote',
      readonly: true
    },
    // Quote Template
    template_id: {
      type: 'lookup',
      label: 'Template',
      reference: 'QuoteTemplate',
      description: 'Quote template used for PDF generation'
    },
    // Additional Info
    description: {
      type: 'textarea',
      label: 'description',
      maxLength: 32000
    },
    internal_notes: {
      type: 'textarea',
      label: 'Internal Notes',
      maxLength: 5000,
      description: 'Internal use only, not visible to customer'
    },
    // PDF Generation
    p_d_f_generated_date: {
      type: 'datetime',
      label: 'PDF Generated Date',
      readonly: true
    },
    p_d_f_url: {
      type: 'url',
      label: 'PDF URL',
      readonly: true
    },
    p_d_f_document_id: {
      type: 'lookup',
      label: 'PDF Document',
      reference: 'Document',
      readonly: true
    },
    // Customer Acceptance
    accepted_date: {
      type: 'datetime',
      label: 'Accepted Date',
      readonly: true
    },
    accepted_by_id: {
      type: 'lookup',
      label: 'Accepted By',
      reference: 'Contact',
      readonly: true
    },
    customer_signature: {
      type: 'text',
      label: 'Customer Signature',
      maxLength: 255,
      readonly: true
    },
    // AI Enhancement Fields
    a_i_recommended_bundle: {
      type: 'textarea',
      label: 'AI Recommended Bundle',
      readonly: true,
      maxLength: 2000,
      description: 'Auto-generated product bundle recommendations based on customer budget'
    },
    a_i_optimal_discount: {
      type: 'percent',
      label: 'AI Optimal Discount',
      readonly: true,
      description: 'AI-suggested optimal discount based on historical data'
    },
    a_i_win_probability: {
      type: 'percent',
      label: 'AI Win Probability',
      readonly: true,
      description: 'Predicted win rate based on quote configuration'
    },
    a_i_pricing_analysis: {
      type: 'textarea',
      label: 'AI Pricing Analysis',
      readonly: true,
      maxLength: 2000,
      description: 'Competitive pricing analysis and recommendations'
    },
    a_i_recommended_upsells: {
      type: 'textarea',
      label: 'AI Recommended Upsells',
      readonly: true,
      maxLength: 2000,
      description: 'Cross-sell and upsell product recommendations'
    }
  },
  relationships: [
    {
      name: 'QuoteLineItems',
      type: 'hasMany',
      object: 'QuoteLineItem',
      foreignKey: 'quote_id',
      label: 'Quote Line Items'
    },
    {
      name: 'Contracts',
      type: 'hasMany',
      object: 'Contract',
      foreignKey: 'quote_id',
      label: 'Contracts'
    },
    {
      name: 'ApprovalHistory',
      type: 'hasMany',
      object: 'ApprovalHistory',
      foreignKey: 'record_id',
      label: 'Approval History'
    },
    {
      name: 'QuoteVersions',
      type: 'hasMany',
      object: 'Quote',
      foreignKey: 'previous_version_id',
      label: 'Quote Versions'
    }
  ],
  listViews: [
    {
      name: 'AllQuotes',
      label: 'All Quotes',
      filters: [],
      columns: ['quote_number', 'name', 'account_id', 'total_price', 'status', 'quote_date', 'expiration_date'],
      sort: [['quote_date', 'desc']]
    },
    {
      name: 'MyQuotes',
      label: 'My Quotes',
      filters: [['OwnerId', '=', '$currentUser']],
      columns: ['quote_number', 'name', 'account_id', 'total_price', 'status', 'expiration_date'],
      sort: [['quote_date', 'desc']]
    },
    {
      name: 'DraftQuotes',
      label: 'Draft',
      filters: [['status', '=', 'Draft']],
      columns: ['quote_number', 'name', 'account_id', 'total_price', 'quote_date', 'OwnerId'],
      sort: [['quote_date', 'desc']]
    },
    {
      name: 'PendingApproval',
      label: 'Pending Approval',
      filters: [['approval_status', '=', 'Pending']],
      columns: ['quote_number', 'name', 'account_id', 'total_price', 'discount_percent', 'approval_level', 'OwnerId'],
      sort: [['quote_date', 'asc']]
    },
    {
      name: 'ApprovedQuotes',
      label: 'Approved',
      filters: [
        ['approval_status', '=', 'Approved'],
        ['status', 'not in', ['Accepted', 'Expired', 'Declined']]
      ],
      columns: ['quote_number', 'name', 'account_id', 'total_price', 'approved_date', 'expiration_date'],
      sort: [['approved_date', 'desc']]
    },
    {
      name: 'SentQuotes',
      label: 'Sent to Customer',
      filters: [['status', '=', 'Sent']],
      columns: ['quote_number', 'name', 'account_id', 'contact_id', 'total_price', 'expiration_date', 'OwnerId'],
      sort: [['quote_date', 'desc']]
    },
    {
      name: 'AcceptedQuotes',
      label: 'Accepted',
      filters: [['status', '=', 'Accepted']],
      columns: ['quote_number', 'name', 'account_id', 'total_price', 'accepted_date', 'accepted_by_id'],
      sort: [['accepted_date', 'desc']]
    },
    {
      name: 'RejectedQuotes',
      label: 'Rejected/Declined',
      filters: [['status', 'in', ['Rejected', 'Declined']]],
      columns: ['quote_number', 'name', 'account_id', 'total_price', 'status', 'rejection_reason'],
      sort: [['ModifiedDate', 'desc']]
    },
    {
      name: 'ExpiringQuotes',
      label: 'Expiring Soon',
      filters: [
        ['expiration_date', 'next_n_days', 7],
        ['status', 'not in', ['Accepted', 'Expired', 'Declined']]
      ],
      columns: ['quote_number', 'name', 'account_id', 'total_price', 'expiration_date', 'OwnerId'],
      sort: [['expiration_date', 'asc']]
    },
    {
      name: 'HighValueQuotes',
      label: 'High Value',
      filters: [
        ['total_price', '>', 100000],
        ['status', 'not in', ['Expired', 'Declined']]
      ],
      columns: ['quote_number', 'name', 'account_id', 'total_price', 'status', 'a_i_win_probability', 'OwnerId'],
      sort: [['total_price', 'desc']]
    }
  ],
  validationRules: [
    {
      name: 'ExpirationAfterQuoteDate',
      errorMessage: 'Expiration date must be after quote date',
      formula: 'AND(NOT(ISBLANK(quote_date)), NOT(ISBLANK(expiration_date)), expiration_date <= quote_date)'
    },
    {
      name: 'HighDiscountRequiresApproval',
      errorMessage: 'Discount over 20% requires approval',
      formula: 'AND(discount_percent > 0.20, approval_status NOT IN ("Approved", "Pending"), status NOT IN ("Draft", "In Review"))'
    },
    {
      name: 'ApprovedQuoteReadOnly',
      errorMessage: 'Approved quotes cannot modify pricing',
      formula: 'AND(approval_status = "Approved", OR(subtotal != PRIORVALUE(subtotal), discount_percent != PRIORVALUE(discount_percent), tax_percent != PRIORVALUE(tax_percent)))'
    },
    {
      name: 'AcceptedQuoteReadOnly',
      errorMessage: 'Accepted quotes cannot be modified',
      formula: 'AND(status = "Accepted", ISCHANGED(status) = false)'
    },
    {
      name: 'DiscountPercentValid',
      errorMessage: 'Discount percentage must be between 0% and 100%',
      formula: 'OR(discount_percent < 0, discount_percent > 1)'
    },
    {
      name: 'TaxPercentValid',
      errorMessage: 'Tax percentage must be between 0% and 100%',
      formula: 'OR(tax_percent < 0, tax_percent > 1)'
    },
    {
      name: 'PrimaryQuoteUnique',
      errorMessage: 'Only one primary quote allowed per opportunity',
      formula: 'AND(is_primary_quote = true, opportunity_id != null)'
    },
    {
      name: 'ExchangeRatePositive',
      errorMessage: 'Exchange rate must be positive',
      formula: 'exchange_rate <= 0'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Quote Information',
        columns: 2,
        fields: ['quote_number', 'name', 'status', 'version_number', 'is_primary_quote', 'template_id']
      },
      {
        label: 'Related Records',
        columns: 2,
        fields: ['opportunity_id', 'account_id', 'contact_id', 'pricebook_id']
      },
      {
        label: 'Dates',
        columns: 2,
        fields: ['quote_date', 'expiration_date', 'validity_period_days']
      },
      {
        label: 'Pricing',
        columns: 2,
        fields: ['currency_code', 'exchange_rate', 'subtotal', 'discount_percent', 'discount_amount', 'tax_percent', 'tax_amount', 'shipping_handling', 'total_price']
      },
      {
        label: 'Payment & Delivery',
        columns: 2,
        fields: ['payment_terms', 'delivery_terms']
      },
      {
        label: 'Shipping Address',
        columns: 2,
        fields: ['shipping_street', 'shipping_city', 'shipping_state', 'shipping_postal_code', 'shipping_country']
      },
      {
        label: 'Billing Address',
        columns: 2,
        fields: ['billing_street', 'billing_city', 'billing_state', 'billing_postal_code', 'billing_country']
      },
      {
        label: 'Approval Information',
        columns: 2,
        fields: ['approval_status', 'approval_level', 'approved_by_id', 'approved_date', 'rejected_by_id', 'rejected_date', 'rejection_reason']
      },
      {
        label: 'Version Control',
        columns: 2,
        fields: ['previous_version_id', 'latest_version_id']
      },
      {
        label: 'PDF Document',
        columns: 2,
        fields: ['p_d_f_generated_date', 'p_d_f_url', 'p_d_f_document_id']
      },
      {
        label: 'Customer Acceptance',
        columns: 2,
        fields: ['accepted_date', 'accepted_by_id', 'customer_signature']
      },
      {
        label: 'AI Smart Pricing',
        columns: 1,
        fields: ['a_i_recommended_bundle', 'a_i_optimal_discount', 'a_i_win_probability', 'a_i_pricing_analysis', 'a_i_recommended_upsells']
      },
      {
        label: 'Notes',
        columns: 1,
        fields: ['description', 'internal_notes']
      }
    ]
  }
};

export default Quote;

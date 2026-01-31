
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
    QuoteNumber: {
      type: 'autoNumber',
      label: 'Quote Number',
      format: 'Q-{YYYY}-{MM}-{0000}',
      readonly: true,
      searchable: true
    },
    Name: {
      type: 'text',
      label: 'Quote Name',
      required: true,
      searchable: true,
      maxLength: 255
    },
    Status: {
      type: 'select',
      label: 'Status',
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
    OpportunityId: {
      type: 'lookup',
      label: 'Opportunity',
      reference: 'Opportunity',
      required: true
    },
    AccountId: {
      type: 'lookup',
      label: 'Account',
      reference: 'Account',
      required: true
    },
    ContactId: {
      type: 'lookup',
      label: 'Contact',
      reference: 'Contact'
    },
    PricebookId: {
      type: 'lookup',
      label: 'Price Book',
      reference: 'Pricebook',
      required: true
    },
    // Dates
    QuoteDate: {
      type: 'date',
      label: 'Quote Date',
      required: true,
      defaultValue: '$today'
    },
    ExpirationDate: {
      type: 'date',
      label: 'Expiration Date',
      required: true
    },
    ValidityPeriodDays: {
      type: 'number',
      label: 'Validity Period (Days)',
      precision: 0,
      defaultValue: 30,
      readonly: true
    },
    // Pricing
    Subtotal: {
      type: 'currency',
      label: 'Subtotal',
      precision: 2,
      readonly: true,
      description: 'Sum of all line item amounts'
    },
    DiscountPercent: {
      type: 'percent',
      label: 'Discount %',
      defaultValue: 0
    },
    DiscountAmount: {
      type: 'currency',
      label: 'Discount Amount',
      precision: 2,
      readonly: true
    },
    TaxPercent: {
      type: 'percent',
      label: 'Tax %',
      defaultValue: 0
    },
    TaxAmount: {
      type: 'currency',
      label: 'Tax Amount',
      precision: 2,
      readonly: true
    },
    ShippingHandling: {
      type: 'currency',
      label: 'Shipping & Handling',
      precision: 2,
      defaultValue: 0
    },
    TotalPrice: {
      type: 'currency',
      label: 'Total Price',
      precision: 2,
      readonly: true,
      description: 'Subtotal - Discount + Tax + Shipping'
    },
    // Multi-Currency Support
    CurrencyCode: {
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
    ExchangeRate: {
      type: 'number',
      label: 'Exchange Rate',
      precision: 6,
      defaultValue: 1.0,
      description: 'Conversion rate to base currency'
    },
    // Payment Terms
    PaymentTerms: {
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
    DeliveryTerms: {
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
    ShippingStreet: {
      type: 'text',
      label: 'Shipping Street',
      maxLength: 255
    },
    ShippingCity: {
      type: 'text',
      label: 'Shipping City',
      maxLength: 40
    },
    ShippingState: {
      type: 'text',
      label: 'Shipping State',
      maxLength: 80
    },
    ShippingPostalCode: {
      type: 'text',
      label: 'Shipping Postal Code',
      maxLength: 20
    },
    ShippingCountry: {
      type: 'text',
      label: 'Shipping Country',
      maxLength: 80
    },
    // Billing Address
    BillingStreet: {
      type: 'text',
      label: 'Billing Street',
      maxLength: 255
    },
    BillingCity: {
      type: 'text',
      label: 'Billing City',
      maxLength: 40
    },
    BillingState: {
      type: 'text',
      label: 'Billing State',
      maxLength: 80
    },
    BillingPostalCode: {
      type: 'text',
      label: 'Billing Postal Code',
      maxLength: 20
    },
    BillingCountry: {
      type: 'text',
      label: 'Billing Country',
      maxLength: 80
    },
    // Approval Workflow
    ApprovalStatus: {
      type: 'select',
      label: 'Approval Status',
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
    ApprovalLevel: {
      type: 'number',
      label: 'Approval Level',
      precision: 0,
      readonly: true,
      description: 'Required approval level based on discount %'
    },
    ApprovedById: {
      type: 'lookup',
      label: 'Approved By',
      reference: 'User',
      readonly: true
    },
    ApprovedDate: {
      type: 'datetime',
      label: 'Approved Date',
      readonly: true
    },
    RejectedById: {
      type: 'lookup',
      label: 'Rejected By',
      reference: 'User',
      readonly: true
    },
    RejectedDate: {
      type: 'datetime',
      label: 'Rejected Date',
      readonly: true
    },
    RejectionReason: {
      type: 'textarea',
      label: 'Rejection Reason',
      maxLength: 2000,
      readonly: true
    },
    // Quote Versioning
    VersionNumber: {
      type: 'number',
      label: 'Version',
      precision: 0,
      defaultValue: 1,
      readonly: true
    },
    IsPrimaryQuote: {
      type: 'checkbox',
      label: 'Primary Quote',
      defaultValue: true,
      description: 'Is this the primary quote for the opportunity?'
    },
    PreviousVersionId: {
      type: 'lookup',
      label: 'Previous Version',
      reference: 'Quote',
      readonly: true
    },
    LatestVersionId: {
      type: 'lookup',
      label: 'Latest Version',
      reference: 'Quote',
      readonly: true
    },
    // Quote Template
    TemplateId: {
      type: 'lookup',
      label: 'Template',
      reference: 'QuoteTemplate',
      description: 'Quote template used for PDF generation'
    },
    // Additional Info
    Description: {
      type: 'textarea',
      label: 'Description',
      maxLength: 32000
    },
    InternalNotes: {
      type: 'textarea',
      label: 'Internal Notes',
      maxLength: 5000,
      description: 'Internal use only, not visible to customer'
    },
    // PDF Generation
    PDFGeneratedDate: {
      type: 'datetime',
      label: 'PDF Generated Date',
      readonly: true
    },
    PDFUrl: {
      type: 'url',
      label: 'PDF URL',
      readonly: true
    },
    PDFDocumentId: {
      type: 'lookup',
      label: 'PDF Document',
      reference: 'Document',
      readonly: true
    },
    // Customer Acceptance
    AcceptedDate: {
      type: 'datetime',
      label: 'Accepted Date',
      readonly: true
    },
    AcceptedById: {
      type: 'lookup',
      label: 'Accepted By',
      reference: 'Contact',
      readonly: true
    },
    CustomerSignature: {
      type: 'text',
      label: 'Customer Signature',
      maxLength: 255,
      readonly: true
    },
    // AI Enhancement Fields
    AIRecommendedBundle: {
      type: 'textarea',
      label: 'AI Recommended Bundle',
      readonly: true,
      maxLength: 2000,
      description: 'Auto-generated product bundle recommendations based on customer budget'
    },
    AIOptimalDiscount: {
      type: 'percent',
      label: 'AI Optimal Discount',
      readonly: true,
      description: 'AI-suggested optimal discount based on historical data'
    },
    AIWinProbability: {
      type: 'percent',
      label: 'AI Win Probability',
      readonly: true,
      description: 'Predicted win rate based on quote configuration'
    },
    AIPricingAnalysis: {
      type: 'textarea',
      label: 'AI Pricing Analysis',
      readonly: true,
      maxLength: 2000,
      description: 'Competitive pricing analysis and recommendations'
    },
    AIRecommendedUpsells: {
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
      foreignKey: 'QuoteId',
      label: 'Quote Line Items'
    },
    {
      name: 'Contracts',
      type: 'hasMany',
      object: 'Contract',
      foreignKey: 'QuoteId',
      label: 'Contracts'
    },
    {
      name: 'ApprovalHistory',
      type: 'hasMany',
      object: 'ApprovalHistory',
      foreignKey: 'RecordId',
      label: 'Approval History'
    },
    {
      name: 'QuoteVersions',
      type: 'hasMany',
      object: 'Quote',
      foreignKey: 'PreviousVersionId',
      label: 'Quote Versions'
    }
  ],
  listViews: [
    {
      name: 'AllQuotes',
      label: 'All Quotes',
      filters: [],
      columns: ['QuoteNumber', 'Name', 'AccountId', 'TotalPrice', 'Status', 'QuoteDate', 'ExpirationDate'],
      sort: [['QuoteDate', 'desc']]
    },
    {
      name: 'MyQuotes',
      label: 'My Quotes',
      filters: [['OwnerId', '=', '$currentUser']],
      columns: ['QuoteNumber', 'Name', 'AccountId', 'TotalPrice', 'Status', 'ExpirationDate'],
      sort: [['QuoteDate', 'desc']]
    },
    {
      name: 'DraftQuotes',
      label: 'Draft',
      filters: [['Status', '=', 'Draft']],
      columns: ['QuoteNumber', 'Name', 'AccountId', 'TotalPrice', 'QuoteDate', 'OwnerId'],
      sort: [['QuoteDate', 'desc']]
    },
    {
      name: 'PendingApproval',
      label: 'Pending Approval',
      filters: [['ApprovalStatus', '=', 'Pending']],
      columns: ['QuoteNumber', 'Name', 'AccountId', 'TotalPrice', 'DiscountPercent', 'ApprovalLevel', 'OwnerId'],
      sort: [['QuoteDate', 'asc']]
    },
    {
      name: 'ApprovedQuotes',
      label: 'Approved',
      filters: [
        ['ApprovalStatus', '=', 'Approved'],
        ['Status', 'not in', ['Accepted', 'Expired', 'Declined']]
      ],
      columns: ['QuoteNumber', 'Name', 'AccountId', 'TotalPrice', 'ApprovedDate', 'ExpirationDate'],
      sort: [['ApprovedDate', 'desc']]
    },
    {
      name: 'SentQuotes',
      label: 'Sent to Customer',
      filters: [['Status', '=', 'Sent']],
      columns: ['QuoteNumber', 'Name', 'AccountId', 'ContactId', 'TotalPrice', 'ExpirationDate', 'OwnerId'],
      sort: [['QuoteDate', 'desc']]
    },
    {
      name: 'AcceptedQuotes',
      label: 'Accepted',
      filters: [['Status', '=', 'Accepted']],
      columns: ['QuoteNumber', 'Name', 'AccountId', 'TotalPrice', 'AcceptedDate', 'AcceptedById'],
      sort: [['AcceptedDate', 'desc']]
    },
    {
      name: 'RejectedQuotes',
      label: 'Rejected/Declined',
      filters: [['Status', 'in', ['Rejected', 'Declined']]],
      columns: ['QuoteNumber', 'Name', 'AccountId', 'TotalPrice', 'Status', 'RejectionReason'],
      sort: [['ModifiedDate', 'desc']]
    },
    {
      name: 'ExpiringQuotes',
      label: 'Expiring Soon',
      filters: [
        ['ExpirationDate', 'next_n_days', 7],
        ['Status', 'not in', ['Accepted', 'Expired', 'Declined']]
      ],
      columns: ['QuoteNumber', 'Name', 'AccountId', 'TotalPrice', 'ExpirationDate', 'OwnerId'],
      sort: [['ExpirationDate', 'asc']]
    },
    {
      name: 'HighValueQuotes',
      label: 'High Value',
      filters: [
        ['TotalPrice', '>', 100000],
        ['Status', 'not in', ['Expired', 'Declined']]
      ],
      columns: ['QuoteNumber', 'Name', 'AccountId', 'TotalPrice', 'Status', 'AIWinProbability', 'OwnerId'],
      sort: [['TotalPrice', 'desc']]
    }
  ],
  validationRules: [
    {
      name: 'ExpirationAfterQuoteDate',
      errorMessage: 'Expiration date must be after quote date',
      formula: 'AND(NOT(ISBLANK(QuoteDate)), NOT(ISBLANK(ExpirationDate)), ExpirationDate <= QuoteDate)'
    },
    {
      name: 'HighDiscountRequiresApproval',
      errorMessage: 'Discount over 20% requires approval',
      formula: 'AND(DiscountPercent > 0.20, ApprovalStatus NOT IN ("Approved", "Pending"), Status NOT IN ("Draft", "In Review"))'
    },
    {
      name: 'ApprovedQuoteReadOnly',
      errorMessage: 'Approved quotes cannot modify pricing',
      formula: 'AND(ApprovalStatus = "Approved", OR(Subtotal != PRIORVALUE(Subtotal), DiscountPercent != PRIORVALUE(DiscountPercent), TaxPercent != PRIORVALUE(TaxPercent)))'
    },
    {
      name: 'AcceptedQuoteReadOnly',
      errorMessage: 'Accepted quotes cannot be modified',
      formula: 'AND(Status = "Accepted", ISCHANGED(Status) = false)'
    },
    {
      name: 'DiscountPercentValid',
      errorMessage: 'Discount percentage must be between 0% and 100%',
      formula: 'OR(DiscountPercent < 0, DiscountPercent > 1)'
    },
    {
      name: 'TaxPercentValid',
      errorMessage: 'Tax percentage must be between 0% and 100%',
      formula: 'OR(TaxPercent < 0, TaxPercent > 1)'
    },
    {
      name: 'PrimaryQuoteUnique',
      errorMessage: 'Only one primary quote allowed per opportunity',
      formula: 'AND(IsPrimaryQuote = true, OpportunityId != null)'
    },
    {
      name: 'ExchangeRatePositive',
      errorMessage: 'Exchange rate must be positive',
      formula: 'ExchangeRate <= 0'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Quote Information',
        columns: 2,
        fields: ['QuoteNumber', 'Name', 'Status', 'VersionNumber', 'IsPrimaryQuote', 'TemplateId']
      },
      {
        label: 'Related Records',
        columns: 2,
        fields: ['OpportunityId', 'AccountId', 'ContactId', 'PricebookId']
      },
      {
        label: 'Dates',
        columns: 2,
        fields: ['QuoteDate', 'ExpirationDate', 'ValidityPeriodDays']
      },
      {
        label: 'Pricing',
        columns: 2,
        fields: ['CurrencyCode', 'ExchangeRate', 'Subtotal', 'DiscountPercent', 'DiscountAmount', 'TaxPercent', 'TaxAmount', 'ShippingHandling', 'TotalPrice']
      },
      {
        label: 'Payment & Delivery',
        columns: 2,
        fields: ['PaymentTerms', 'DeliveryTerms']
      },
      {
        label: 'Shipping Address',
        columns: 2,
        fields: ['ShippingStreet', 'ShippingCity', 'ShippingState', 'ShippingPostalCode', 'ShippingCountry']
      },
      {
        label: 'Billing Address',
        columns: 2,
        fields: ['BillingStreet', 'BillingCity', 'BillingState', 'BillingPostalCode', 'BillingCountry']
      },
      {
        label: 'Approval Information',
        columns: 2,
        fields: ['ApprovalStatus', 'ApprovalLevel', 'ApprovedById', 'ApprovedDate', 'RejectedById', 'RejectedDate', 'RejectionReason']
      },
      {
        label: 'Version Control',
        columns: 2,
        fields: ['PreviousVersionId', 'LatestVersionId']
      },
      {
        label: 'PDF Document',
        columns: 2,
        fields: ['PDFGeneratedDate', 'PDFUrl', 'PDFDocumentId']
      },
      {
        label: 'Customer Acceptance',
        columns: 2,
        fields: ['AcceptedDate', 'AcceptedById', 'CustomerSignature']
      },
      {
        label: 'AI Smart Pricing',
        columns: 1,
        fields: ['AIRecommendedBundle', 'AIOptimalDiscount', 'AIWinProbability', 'AIPricingAnalysis', 'AIRecommendedUpsells']
      },
      {
        label: 'Notes',
        columns: 1,
        fields: ['Description', 'InternalNotes']
      }
    ]
  }
};

export default Quote;

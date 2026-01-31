
const ApprovalRequest = {
  name: 'approval_request',
  label: 'Approval Request',
  labelPlural: 'Approval Requests',
  icon: 'clipboard-check',
  description: 'Multi-level approval workflow for discounts and pricing exceptions',
  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true
  },
  fields: {
    // Basic Information
    request_number: {
      type: 'autonumber',
      label: 'Request Number',
      format: 'AR-{YYYY}-{MM}-{00000}',
      readonly: true,
      searchable: true
    },
    name: {
      type: 'text',
      label: 'Request name',
      required: true,
      searchable: true,
      maxLength: 255
    },
    description: {
      type: 'textarea',
      label: 'description',
      maxLength: 2000,
      description: 'Detailed description of approval request'
    },
    // Request Type
    request_type: {
      type: 'select',
      label: 'Request Type',
      required: true,
      options: [
        { label: 'Discount Approval', value: 'DiscountApproval' },
        { label: 'Price Override', value: 'PriceOverride' },
        { label: 'Contract Terms', value: 'ContractTerms' },
        { label: 'Credit Limit', value: 'CreditLimit' },
        { label: 'Payment Terms', value: 'PaymentTerms' },
        { label: 'Custom Pricing', value: 'CustomPricing' },
        { label: 'Other', value: 'Other' }
      ]
    },
    // Related Records
    quote_id: {
      type: 'lookup',
      label: 'Quote',
      reference: 'Quote',
      description: 'Quote requiring approval'
    },
    opportunity_id: {
      type: 'lookup',
      label: 'Opportunity',
      reference: 'Opportunity',
      description: 'Related opportunity'
    },
    account_id: {
      type: 'lookup',
      label: 'Account',
      reference: 'Account',
      description: 'Customer account'
    },
    contract_id: {
      type: 'lookup',
      label: 'Contract',
      reference: 'Contract',
      description: 'Contract requiring approval'
    },
    // Submitter Information
    submitted_by_id: {
      type: 'lookup',
      label: 'Submitted By',
      reference: 'User',
      readonly: true
    },
    submitted_date: {
      type: 'datetime',
      label: 'Submitted Date',
      readonly: true
    },
    // Approval Details
    status: {
      type: 'select',
      label: 'status',
      required: true,
      defaultValue: 'Pending',
      options: [
        { label: '📝 Draft', value: 'Draft' },
        { label: '🔄 Pending', value: 'Pending' },
        { label: '✅ Approved', value: 'Approved' },
        { label: '❌ Rejected', value: 'Rejected' },
        { label: '🔙 Recalled', value: 'Recalled' },
        { label: '⏰ Expired', value: 'Expired' }
      ]
    },
    current_approval_level: {
      type: 'number',
      label: 'Current Level',
      precision: 0,
      readonly: true,
      defaultValue: 1,
      description: 'Current approval level in the chain'
    },
    total_approval_levels: {
      type: 'number',
      label: 'Total Levels',
      precision: 0,
      readonly: true,
      description: 'Total approval levels required'
    },
    current_approver_id: {
      type: 'lookup',
      label: 'Current Approver',
      reference: 'User',
      readonly: true,
      description: 'User who needs to approve at current level'
    },
    // Discount Information
    discount_percent: {
      type: 'percent',
      label: 'Discount %',
      description: 'Requested discount percentage'
    },
    discount_amount: {
      type: 'currency',
      label: 'Discount Amount',
      precision: 2,
      description: 'Requested discount amount'
    },
    original_price: {
      type: 'currency',
      label: 'Original Price',
      precision: 2,
      description: 'Original price before discount'
    },
    proposed_price: {
      type: 'currency',
      label: 'Proposed Price',
      precision: 2,
      description: 'Proposed price after discount'
    },
    revenue_impact: {
      type: 'currency',
      label: 'Revenue Impact',
      precision: 2,
      readonly: true,
      description: 'Calculated revenue impact'
    },
    margin_impact: {
      type: 'percent',
      label: 'Margin Impact',
      readonly: true,
      description: 'Impact on profit margin'
    },
    // Justification
    business_justification: {
      type: 'textarea',
      label: 'Business Justification',
      required: true,
      maxLength: 5000,
      description: 'Detailed business justification for the request'
    },
    reason_code: {
      type: 'select',
      label: 'Reason Code',
      required: true,
      options: [
        { label: 'Competitive Match', value: 'CompetitiveMatch' },
        { label: 'Volume Discount', value: 'VolumeDiscount' },
        { label: 'Strategic Account', value: 'StrategicAccount' },
        { label: 'End of Quarter', value: 'EndOfQuarter' },
        { label: 'Closeout Sale', value: 'CloseoutSale' },
        { label: 'Customer Loyalty', value: 'CustomerLoyalty' },
        { label: 'Upsell Opportunity', value: 'UpsellOpportunity' },
        { label: 'Market Conditions', value: 'MarketConditions' },
        { label: 'Other', value: 'Other' }
      ]
    },
    competitor_name: {
      type: 'text',
      label: 'Competitor name',
      maxLength: 255,
      description: 'Competitor being matched (if applicable)'
    },
    competitor_price: {
      type: 'currency',
      label: 'Competitor Price',
      precision: 2,
      description: 'Competitor price being matched'
    },
    // Approval Matrix Criteria
    required_approval_level: {
      type: 'number',
      label: 'Required Approval Level',
      precision: 0,
      readonly: true,
      description: 'Calculated based on discount % and amount'
    },
    approval_matrix_rule: {
      type: 'text',
      label: 'Approval Matrix Rule',
      maxLength: 255,
      readonly: true,
      description: 'Rule that determined approval levels'
    },
    // Decision
    final_decision: {
      type: 'select',
      label: 'Final Decision',
      readonly: true,
      options: [
        { label: 'Pending', value: 'Pending' },
        { label: 'Approved', value: 'Approved' },
        { label: 'Rejected', value: 'Rejected' },
        { label: 'Approved with Conditions', value: 'ApprovedWithConditions' }
      ],
      defaultValue: 'Pending'
    },
    approved_by_id: {
      type: 'lookup',
      label: 'Approved By',
      reference: 'User',
      readonly: true,
      description: 'Final approver'
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
      maxLength: 5000,
      readonly: true
    },
    approval_conditions: {
      type: 'textarea',
      label: 'Approval Conditions',
      maxLength: 5000,
      description: 'Conditions attached to approval'
    },
    // Escalation
    is_escalated: {
      type: 'checkbox',
      label: 'Escalated',
      defaultValue: false,
      description: 'Request has been escalated'
    },
    escalated_date: {
      type: 'datetime',
      label: 'Escalated Date',
      readonly: true
    },
    escalation_reason: {
      type: 'textarea',
      label: 'Escalation Reason',
      maxLength: 2000
    },
    // SLA
    due_date: {
      type: 'datetime',
      label: 'Due Date',
      description: 'SLA due date for approval decision'
    },
    is_overdue: {
      type: 'checkbox',
      label: 'Overdue',
      defaultValue: false,
      readonly: true,
      description: 'Past due date'
    },
    response_time: {
      type: 'number',
      label: 'Response Time (hours)',
      precision: 2,
      readonly: true,
      description: 'Time taken from submission to decision'
    },
    // Comments
    approver_comments: {
      type: 'textarea',
      label: 'Approver Comments',
      maxLength: 5000,
      description: 'Comments from approvers'
    },
    internal_notes: {
      type: 'textarea',
      label: 'Internal Notes',
      maxLength: 5000,
      description: 'Internal notes not visible to submitter'
    },
    // Notifications
    notify_on_approval: {
      type: 'checkbox',
      label: 'Notify on Approval',
      defaultValue: true,
      description: 'Send notification when approved'
    },
    notify_on_rejection: {
      type: 'checkbox',
      label: 'Notify on Rejection',
      defaultValue: true,
      description: 'Send notification when rejected'
    },
    escalation_email: {
      type: 'email',
      label: 'Escalation Email',
      description: 'Email for escalation notifications'
    },
    // AI Enhancement
    ai_risk_score: {
      type: 'number',
      label: 'AI Risk Score',
      precision: 2,
      readonly: true,
      description: 'AI-calculated risk score (0-100)'
    },
    ai_recommendation: {
      type: 'select',
      label: 'AI Recommendation',
      readonly: true,
      options: [
        { label: 'Approve', value: 'Approve' },
        { label: 'Review', value: 'Review' },
        { label: 'Reject', value: 'Reject' }
      ]
    },
    ai_analysis: {
      type: 'textarea',
      label: 'AI Analysis',
      readonly: true,
      maxLength: 2000,
      description: 'AI analysis of approval request'
    },
    ai_similar_requests: {
      type: 'textarea',
      label: 'Similar Requests',
      readonly: true,
      maxLength: 2000,
      description: 'AI-identified similar historical requests'
    }
  },
  relationships: [
    {
      name: 'ApprovalSteps',
      type: 'hasMany',
      object: 'ApprovalStep',
      foreignKey: 'approval_request_id',
      label: 'Approval Steps'
    },
    {
      name: 'ApprovalHistory',
      type: 'hasMany',
      object: 'ApprovalHistory',
      foreignKey: 'approval_request_id',
      label: 'Approval History'
    }
  ],
  listViews: [
    {
      name: 'AllRequests',
      label: 'All Requests',
      filters: [],
      columns: ['request_number', 'name', 'request_type', 'status', 'submitted_date', 'current_approver_id'],
      sort: [['submitted_date', 'desc']]
    },
    {
      name: 'PendingRequests',
      label: 'Pending',
      filters: [['status', '=', 'Pending']],
      columns: ['request_number', 'name', 'request_type', 'discount_percent', 'current_approval_level', 'current_approver_id', 'due_date'],
      sort: [['submitted_date', 'asc']]
    },
    {
      name: 'MyApprovals',
      label: 'My Approvals',
      filters: [
        ['status', '=', 'Pending'],
        ['current_approver_id', '=', '$currentUser']
      ],
      columns: ['request_number', 'name', 'account_id', 'discount_percent', 'business_justification', 'due_date'],
      sort: [['due_date', 'asc']]
    },
    {
      name: 'MySubmissions',
      label: 'My Submissions',
      filters: [['submitted_by_id', '=', '$currentUser']],
      columns: ['request_number', 'name', 'status', 'current_approval_level', 'submitted_date', 'approved_date'],
      sort: [['submitted_date', 'desc']]
    },
    {
      name: 'HighValueApprovals',
      label: 'High Value',
      filters: [
        ['status', '=', 'Pending'],
        ['original_price', '>', 50000]
      ],
      columns: ['request_number', 'name', 'account_id', 'original_price', 'discount_percent', 'current_approver_id'],
      sort: [['original_price', 'desc']]
    },
    {
      name: 'HighDiscountApprovals',
      label: 'High Discount',
      filters: [
        ['status', '=', 'Pending'],
        ['discount_percent', '>', 0.30]
      ],
      columns: ['request_number', 'name', 'account_id', 'discount_percent', 'reason_code', 'current_approver_id'],
      sort: [['discount_percent', 'desc']]
    },
    {
      name: 'OverdueApprovals',
      label: 'Overdue',
      filters: [
        ['status', '=', 'Pending'],
        ['is_overdue', '=', true]
      ],
      columns: ['request_number', 'name', 'due_date', 'current_approver_id', 'submitted_date'],
      sort: [['due_date', 'asc']]
    },
    {
      name: 'EscalatedRequests',
      label: 'Escalated',
      filters: [['is_escalated', '=', true]],
      columns: ['request_number', 'name', 'escalated_date', 'escalation_reason', 'current_approver_id'],
      sort: [['escalated_date', 'desc']]
    },
    {
      name: 'ApprovedRequests',
      label: 'Approved',
      filters: [['status', '=', 'Approved']],
      columns: ['request_number', 'name', 'account_id', 'discount_percent', 'approved_by_id', 'approved_date'],
      sort: [['approved_date', 'desc']]
    },
    {
      name: 'RejectedRequests',
      label: 'Rejected',
      filters: [['status', '=', 'Rejected']],
      columns: ['request_number', 'name', 'account_id', 'discount_percent', 'rejected_by_id', 'rejection_reason'],
      sort: [['rejected_date', 'desc']]
    }
  ],
  validationRules: [
    {
      name: 'DiscountAmountOrPercentRequired',
      errorMessage: 'Either discount amount or percentage must be specified',
      formula: 'AND(request_type = "DiscountApproval", ISBLANK(discount_amount), ISBLANK(discount_percent))'
    },
    {
      name: 'BusinessJustificationRequired',
      errorMessage: 'Business justification is required for all approval requests',
      formula: 'AND(status != "Draft", ISBLANK(business_justification))'
    },
    {
      name: 'QuoteOrContractRequired',
      errorMessage: 'Either Quote or Contract must be specified',
      formula: 'AND(request_type IN ("DiscountApproval", "PriceOverride"), ISBLANK(quote_id), ISBLANK(contract_id))'
    },
    {
      name: 'CompetitorInfoRequired',
      errorMessage: 'Competitor information required when reason is competitive match',
      formula: 'AND(reason_code = "CompetitiveMatch", ISBLANK(competitor_name))'
    },
    {
      name: 'CannotRecallApproved',
      errorMessage: 'Cannot recall an approved or rejected request',
      formula: 'AND(status = "Recalled", PRIORVALUE(status) IN ("Approved", "Rejected"))'
    },
    {
      name: 'DiscountPercentValid',
      errorMessage: 'Discount percentage must be between 0% and 100%',
      formula: 'AND(NOT(ISBLANK(discount_percent)), OR(discount_percent < 0, discount_percent > 1))'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Request Information',
        columns: 2,
        fields: ['request_number', 'name', 'request_type', 'status', 'description']
      },
      {
        label: 'Related Records',
        columns: 2,
        fields: ['quote_id', 'opportunity_id', 'account_id', 'contract_id']
      },
      {
        label: 'Submission',
        columns: 2,
        fields: ['submitted_by_id', 'submitted_date']
      },
      {
        label: 'Approval Progress',
        columns: 2,
        fields: ['current_approval_level', 'total_approval_levels', 'current_approver_id', 'approval_matrix_rule']
      },
      {
        label: 'Discount Information',
        columns: 2,
        fields: ['discount_percent', 'discount_amount', 'original_price', 'proposed_price', 'revenue_impact', 'margin_impact']
      },
      {
        label: 'Justification',
        columns: 1,
        fields: ['business_justification', 'reason_code', 'competitor_name', 'competitor_price']
      },
      {
        label: 'Decision',
        columns: 2,
        fields: ['final_decision', 'approved_by_id', 'approved_date', 'rejected_by_id', 'rejected_date']
      },
      {
        label: 'Rejection/Conditions',
        columns: 1,
        fields: ['rejection_reason', 'approval_conditions']
      },
      {
        label: 'Escalation',
        columns: 2,
        fields: ['is_escalated', 'escalated_date', 'escalation_reason']
      },
      {
        label: 'SLA',
        columns: 2,
        fields: ['due_date', 'is_overdue', 'response_time']
      },
      {
        label: 'Comments',
        columns: 1,
        fields: ['approver_comments', 'internal_notes']
      },
      {
        label: 'Notifications',
        columns: 2,
        fields: ['notify_on_approval', 'notify_on_rejection', 'escalation_email']
      },
      {
        label: 'AI Insights',
        columns: 1,
        fields: ['ai_risk_score', 'ai_recommendation', 'ai_analysis', 'ai_similar_requests']
      }
    ]
  }
};

export default ApprovalRequest;

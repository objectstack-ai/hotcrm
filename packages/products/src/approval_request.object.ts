
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
    RequestNumber: {
      type: 'autonumber',
      label: 'Request Number',
      format: 'AR-{YYYY}-{MM}-{00000}',
      readonly: true,
      searchable: true
    },
    Name: {
      type: 'text',
      label: 'Request Name',
      required: true,
      searchable: true,
      maxLength: 255
    },
    Description: {
      type: 'textarea',
      label: 'Description',
      maxLength: 2000,
      description: 'Detailed description of approval request'
    },
    // Request Type
    RequestType: {
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
    QuoteId: {
      type: 'lookup',
      label: 'Quote',
      reference: 'Quote',
      description: 'Quote requiring approval'
    },
    OpportunityId: {
      type: 'lookup',
      label: 'Opportunity',
      reference: 'Opportunity',
      description: 'Related opportunity'
    },
    AccountId: {
      type: 'lookup',
      label: 'Account',
      reference: 'Account',
      description: 'Customer account'
    },
    ContractId: {
      type: 'lookup',
      label: 'Contract',
      reference: 'Contract',
      description: 'Contract requiring approval'
    },
    // Submitter Information
    SubmittedById: {
      type: 'lookup',
      label: 'Submitted By',
      reference: 'User',
      readonly: true
    },
    SubmittedDate: {
      type: 'datetime',
      label: 'Submitted Date',
      readonly: true
    },
    // Approval Details
    Status: {
      type: 'select',
      label: 'Status',
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
    CurrentApprovalLevel: {
      type: 'number',
      label: 'Current Level',
      precision: 0,
      readonly: true,
      defaultValue: 1,
      description: 'Current approval level in the chain'
    },
    TotalApprovalLevels: {
      type: 'number',
      label: 'Total Levels',
      precision: 0,
      readonly: true,
      description: 'Total approval levels required'
    },
    CurrentApproverId: {
      type: 'lookup',
      label: 'Current Approver',
      reference: 'User',
      readonly: true,
      description: 'User who needs to approve at current level'
    },
    // Discount Information
    DiscountPercent: {
      type: 'percent',
      label: 'Discount %',
      description: 'Requested discount percentage'
    },
    DiscountAmount: {
      type: 'currency',
      label: 'Discount Amount',
      precision: 2,
      description: 'Requested discount amount'
    },
    OriginalPrice: {
      type: 'currency',
      label: 'Original Price',
      precision: 2,
      description: 'Original price before discount'
    },
    ProposedPrice: {
      type: 'currency',
      label: 'Proposed Price',
      precision: 2,
      description: 'Proposed price after discount'
    },
    RevenueImpact: {
      type: 'currency',
      label: 'Revenue Impact',
      precision: 2,
      readonly: true,
      description: 'Calculated revenue impact'
    },
    MarginImpact: {
      type: 'percent',
      label: 'Margin Impact',
      readonly: true,
      description: 'Impact on profit margin'
    },
    // Justification
    BusinessJustification: {
      type: 'textarea',
      label: 'Business Justification',
      required: true,
      maxLength: 5000,
      description: 'Detailed business justification for the request'
    },
    ReasonCode: {
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
    CompetitorName: {
      type: 'text',
      label: 'Competitor Name',
      maxLength: 255,
      description: 'Competitor being matched (if applicable)'
    },
    CompetitorPrice: {
      type: 'currency',
      label: 'Competitor Price',
      precision: 2,
      description: 'Competitor price being matched'
    },
    // Approval Matrix Criteria
    RequiredApprovalLevel: {
      type: 'number',
      label: 'Required Approval Level',
      precision: 0,
      readonly: true,
      description: 'Calculated based on discount % and amount'
    },
    ApprovalMatrixRule: {
      type: 'text',
      label: 'Approval Matrix Rule',
      maxLength: 255,
      readonly: true,
      description: 'Rule that determined approval levels'
    },
    // Decision
    FinalDecision: {
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
    ApprovedById: {
      type: 'lookup',
      label: 'Approved By',
      reference: 'User',
      readonly: true,
      description: 'Final approver'
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
      maxLength: 5000,
      readonly: true
    },
    ApprovalConditions: {
      type: 'textarea',
      label: 'Approval Conditions',
      maxLength: 5000,
      description: 'Conditions attached to approval'
    },
    // Escalation
    IsEscalated: {
      type: 'checkbox',
      label: 'Escalated',
      defaultValue: false,
      description: 'Request has been escalated'
    },
    EscalatedDate: {
      type: 'datetime',
      label: 'Escalated Date',
      readonly: true
    },
    EscalationReason: {
      type: 'textarea',
      label: 'Escalation Reason',
      maxLength: 2000
    },
    // SLA
    DueDate: {
      type: 'datetime',
      label: 'Due Date',
      description: 'SLA due date for approval decision'
    },
    IsOverdue: {
      type: 'checkbox',
      label: 'Overdue',
      defaultValue: false,
      readonly: true,
      description: 'Past due date'
    },
    ResponseTime: {
      type: 'number',
      label: 'Response Time (hours)',
      precision: 2,
      readonly: true,
      description: 'Time taken from submission to decision'
    },
    // Comments
    ApproverComments: {
      type: 'textarea',
      label: 'Approver Comments',
      maxLength: 5000,
      description: 'Comments from approvers'
    },
    InternalNotes: {
      type: 'textarea',
      label: 'Internal Notes',
      maxLength: 5000,
      description: 'Internal notes not visible to submitter'
    },
    // Notifications
    NotifyOnApproval: {
      type: 'checkbox',
      label: 'Notify on Approval',
      defaultValue: true,
      description: 'Send notification when approved'
    },
    NotifyOnRejection: {
      type: 'checkbox',
      label: 'Notify on Rejection',
      defaultValue: true,
      description: 'Send notification when rejected'
    },
    EscalationEmail: {
      type: 'email',
      label: 'Escalation Email',
      description: 'Email for escalation notifications'
    },
    // AI Enhancement
    AIRiskScore: {
      type: 'number',
      label: 'AI Risk Score',
      precision: 2,
      readonly: true,
      description: 'AI-calculated risk score (0-100)'
    },
    AIRecommendation: {
      type: 'select',
      label: 'AI Recommendation',
      readonly: true,
      options: [
        { label: 'Approve', value: 'Approve' },
        { label: 'Review', value: 'Review' },
        { label: 'Reject', value: 'Reject' }
      ]
    },
    AIAnalysis: {
      type: 'textarea',
      label: 'AI Analysis',
      readonly: true,
      maxLength: 2000,
      description: 'AI analysis of approval request'
    },
    AISimilarRequests: {
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
      foreignKey: 'ApprovalRequestId',
      label: 'Approval Steps'
    },
    {
      name: 'ApprovalHistory',
      type: 'hasMany',
      object: 'ApprovalHistory',
      foreignKey: 'ApprovalRequestId',
      label: 'Approval History'
    }
  ],
  listViews: [
    {
      name: 'AllRequests',
      label: 'All Requests',
      filters: [],
      columns: ['RequestNumber', 'Name', 'RequestType', 'Status', 'SubmittedDate', 'CurrentApproverId'],
      sort: [['SubmittedDate', 'desc']]
    },
    {
      name: 'PendingRequests',
      label: 'Pending',
      filters: [['Status', '=', 'Pending']],
      columns: ['RequestNumber', 'Name', 'RequestType', 'DiscountPercent', 'CurrentApprovalLevel', 'CurrentApproverId', 'DueDate'],
      sort: [['SubmittedDate', 'asc']]
    },
    {
      name: 'MyApprovals',
      label: 'My Approvals',
      filters: [
        ['Status', '=', 'Pending'],
        ['CurrentApproverId', '=', '$currentUser']
      ],
      columns: ['RequestNumber', 'Name', 'AccountId', 'DiscountPercent', 'BusinessJustification', 'DueDate'],
      sort: [['DueDate', 'asc']]
    },
    {
      name: 'MySubmissions',
      label: 'My Submissions',
      filters: [['SubmittedById', '=', '$currentUser']],
      columns: ['RequestNumber', 'Name', 'Status', 'CurrentApprovalLevel', 'SubmittedDate', 'ApprovedDate'],
      sort: [['SubmittedDate', 'desc']]
    },
    {
      name: 'HighValueApprovals',
      label: 'High Value',
      filters: [
        ['Status', '=', 'Pending'],
        ['OriginalPrice', '>', 50000]
      ],
      columns: ['RequestNumber', 'Name', 'AccountId', 'OriginalPrice', 'DiscountPercent', 'CurrentApproverId'],
      sort: [['OriginalPrice', 'desc']]
    },
    {
      name: 'HighDiscountApprovals',
      label: 'High Discount',
      filters: [
        ['Status', '=', 'Pending'],
        ['DiscountPercent', '>', 0.30]
      ],
      columns: ['RequestNumber', 'Name', 'AccountId', 'DiscountPercent', 'ReasonCode', 'CurrentApproverId'],
      sort: [['DiscountPercent', 'desc']]
    },
    {
      name: 'OverdueApprovals',
      label: 'Overdue',
      filters: [
        ['Status', '=', 'Pending'],
        ['IsOverdue', '=', true]
      ],
      columns: ['RequestNumber', 'Name', 'DueDate', 'CurrentApproverId', 'SubmittedDate'],
      sort: [['DueDate', 'asc']]
    },
    {
      name: 'EscalatedRequests',
      label: 'Escalated',
      filters: [['IsEscalated', '=', true]],
      columns: ['RequestNumber', 'Name', 'EscalatedDate', 'EscalationReason', 'CurrentApproverId'],
      sort: [['EscalatedDate', 'desc']]
    },
    {
      name: 'ApprovedRequests',
      label: 'Approved',
      filters: [['Status', '=', 'Approved']],
      columns: ['RequestNumber', 'Name', 'AccountId', 'DiscountPercent', 'ApprovedById', 'ApprovedDate'],
      sort: [['ApprovedDate', 'desc']]
    },
    {
      name: 'RejectedRequests',
      label: 'Rejected',
      filters: [['Status', '=', 'Rejected']],
      columns: ['RequestNumber', 'Name', 'AccountId', 'DiscountPercent', 'RejectedById', 'RejectionReason'],
      sort: [['RejectedDate', 'desc']]
    }
  ],
  validationRules: [
    {
      name: 'DiscountAmountOrPercentRequired',
      errorMessage: 'Either discount amount or percentage must be specified',
      formula: 'AND(RequestType = "DiscountApproval", ISBLANK(DiscountAmount), ISBLANK(DiscountPercent))'
    },
    {
      name: 'BusinessJustificationRequired',
      errorMessage: 'Business justification is required for all approval requests',
      formula: 'AND(Status != "Draft", ISBLANK(BusinessJustification))'
    },
    {
      name: 'QuoteOrContractRequired',
      errorMessage: 'Either Quote or Contract must be specified',
      formula: 'AND(RequestType IN ("DiscountApproval", "PriceOverride"), ISBLANK(QuoteId), ISBLANK(ContractId))'
    },
    {
      name: 'CompetitorInfoRequired',
      errorMessage: 'Competitor information required when reason is competitive match',
      formula: 'AND(ReasonCode = "CompetitiveMatch", ISBLANK(CompetitorName))'
    },
    {
      name: 'CannotRecallApproved',
      errorMessage: 'Cannot recall an approved or rejected request',
      formula: 'AND(Status = "Recalled", PRIORVALUE(Status) IN ("Approved", "Rejected"))'
    },
    {
      name: 'DiscountPercentValid',
      errorMessage: 'Discount percentage must be between 0% and 100%',
      formula: 'AND(NOT(ISBLANK(DiscountPercent)), OR(DiscountPercent < 0, DiscountPercent > 1))'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'Request Information',
        columns: 2,
        fields: ['RequestNumber', 'Name', 'RequestType', 'Status', 'Description']
      },
      {
        label: 'Related Records',
        columns: 2,
        fields: ['QuoteId', 'OpportunityId', 'AccountId', 'ContractId']
      },
      {
        label: 'Submission',
        columns: 2,
        fields: ['SubmittedById', 'SubmittedDate']
      },
      {
        label: 'Approval Progress',
        columns: 2,
        fields: ['CurrentApprovalLevel', 'TotalApprovalLevels', 'CurrentApproverId', 'ApprovalMatrixRule']
      },
      {
        label: 'Discount Information',
        columns: 2,
        fields: ['DiscountPercent', 'DiscountAmount', 'OriginalPrice', 'ProposedPrice', 'RevenueImpact', 'MarginImpact']
      },
      {
        label: 'Justification',
        columns: 1,
        fields: ['BusinessJustification', 'ReasonCode', 'CompetitorName', 'CompetitorPrice']
      },
      {
        label: 'Decision',
        columns: 2,
        fields: ['FinalDecision', 'ApprovedById', 'ApprovedDate', 'RejectedById', 'RejectedDate']
      },
      {
        label: 'Rejection/Conditions',
        columns: 1,
        fields: ['RejectionReason', 'ApprovalConditions']
      },
      {
        label: 'Escalation',
        columns: 2,
        fields: ['IsEscalated', 'EscalatedDate', 'EscalationReason']
      },
      {
        label: 'SLA',
        columns: 2,
        fields: ['DueDate', 'IsOverdue', 'ResponseTime']
      },
      {
        label: 'Comments',
        columns: 1,
        fields: ['ApproverComments', 'InternalNotes']
      },
      {
        label: 'Notifications',
        columns: 2,
        fields: ['NotifyOnApproval', 'NotifyOnRejection', 'EscalationEmail']
      },
      {
        label: 'AI Insights',
        columns: 1,
        fields: ['AIRiskScore', 'AIRecommendation', 'AIAnalysis', 'AISimilarRequests']
      }
    ]
  }
};

export default ApprovalRequest;

import { ObjectSchema, Field } from '@objectstack/spec/data';

export const ApprovalRequest = ObjectSchema.create({
  name: 'approval_request',
  label: 'Approval Request',
  pluralLabel: 'Approval Requests',
  icon: 'clipboard-check',
  description: 'Multi-level approval workflow for discounts and pricing exceptions',

  fields: {
    request_number: Field.autoNumber({
      label: 'Request Number',
      readonly: true,
      format: 'AR-{YYYY}-{MM}-{00000}'
    }),
    name: Field.text({
      label: 'Request name',
      required: true,
      maxLength: 255
    }),
    description: Field.textarea({
      label: 'description',
      description: 'Detailed description of approval request',
      maxLength: 2000
    }),
    request_type: Field.select({
      label: 'Request Type',
      required: true,
      options: [
        {
          "label": "Discount Approval",
          "value": "DiscountApproval"
        },
        {
          "label": "Price Override",
          "value": "PriceOverride"
        },
        {
          "label": "Contract Terms",
          "value": "ContractTerms"
        },
        {
          "label": "Credit Limit",
          "value": "CreditLimit"
        },
        {
          "label": "Payment Terms",
          "value": "PaymentTerms"
        },
        {
          "label": "Custom Pricing",
          "value": "CustomPricing"
        },
        {
          "label": "Other",
          "value": "Other"
        }
      ]
    }),
    quote_id: Field.lookup('Quote', {
      label: 'Quote',
      description: 'Quote requiring approval'
    }),
    opportunity_id: Field.lookup('opportunity', {
      label: 'Opportunity',
      description: 'Related opportunity'
    }),
    account_id: Field.lookup('account', {
      label: 'Account',
      description: 'Customer account'
    }),
    contract_id: Field.lookup('Contract', {
      label: 'Contract',
      description: 'Contract requiring approval'
    }),
    submitted_by_id: Field.lookup('users', {
      label: 'Submitted By',
      readonly: true
    }),
    submitted_date: Field.datetime({
      label: 'Submitted Date',
      readonly: true
    }),
    status: Field.select({
      label: 'status',
      required: true,
      defaultValue: 'Pending',
      options: [
        {
          "label": "📝 Draft",
          "value": "Draft"
        },
        {
          "label": "🔄 Pending",
          "value": "Pending"
        },
        {
          "label": "✅ Approved",
          "value": "Approved"
        },
        {
          "label": "❌ Rejected",
          "value": "Rejected"
        },
        {
          "label": "🔙 Recalled",
          "value": "Recalled"
        },
        {
          "label": "⏰ Expired",
          "value": "Expired"
        }
      ]
    }),
    current_approval_level: Field.number({
      label: 'Current Level',
      description: 'Current approval level in the chain',
      defaultValue: 1,
      readonly: true,
      precision: 0
    }),
    total_approval_levels: Field.number({
      label: 'Total Levels',
      description: 'Total approval levels required',
      readonly: true,
      precision: 0
    }),
    current_approver_id: Field.lookup('users', {
      label: 'Current Approver',
      description: 'User who needs to approve at current level',
      readonly: true
    }),
    discount_percent: Field.percent({
      label: 'Discount %',
      description: 'Requested discount percentage'
    }),
    discount_amount: Field.currency({
      label: 'Discount Amount',
      description: 'Requested discount amount',
      precision: 2
    }),
    original_price: Field.currency({
      label: 'Original Price',
      description: 'Original price before discount',
      precision: 2
    }),
    proposed_price: Field.currency({
      label: 'Proposed Price',
      description: 'Proposed price after discount',
      precision: 2
    }),
    revenue_impact: Field.currency({
      label: 'Revenue Impact',
      description: 'Calculated revenue impact',
      readonly: true,
      precision: 2
    }),
    margin_impact: Field.percent({
      label: 'Margin Impact',
      description: 'Impact on profit margin',
      readonly: true
    }),
    business_justification: Field.textarea({
      label: 'Business Justification',
      description: 'Detailed business justification for the request',
      required: true,
      maxLength: 5000
    }),
    reason_code: Field.select({
      label: 'Reason Code',
      required: true,
      options: [
        {
          "label": "Competitive Match",
          "value": "CompetitiveMatch"
        },
        {
          "label": "Volume Discount",
          "value": "VolumeDiscount"
        },
        {
          "label": "Strategic Account",
          "value": "StrategicAccount"
        },
        {
          "label": "End of Quarter",
          "value": "EndOfQuarter"
        },
        {
          "label": "Closeout Sale",
          "value": "CloseoutSale"
        },
        {
          "label": "Customer Loyalty",
          "value": "CustomerLoyalty"
        },
        {
          "label": "Upsell Opportunity",
          "value": "UpsellOpportunity"
        },
        {
          "label": "Market Conditions",
          "value": "MarketConditions"
        },
        {
          "label": "Other",
          "value": "Other"
        }
      ]
    }),
    competitor_name: Field.text({
      label: 'Competitor name',
      description: 'Competitor being matched (if applicable)',
      maxLength: 255
    }),
    competitor_price: Field.currency({
      label: 'Competitor Price',
      description: 'Competitor price being matched',
      precision: 2
    }),
    required_approval_level: Field.number({
      label: 'Required Approval Level',
      description: 'Calculated based on discount % and amount',
      readonly: true,
      precision: 0
    }),
    approval_matrix_rule: Field.text({
      label: 'Approval Matrix Rule',
      description: 'Rule that determined approval levels',
      readonly: true,
      maxLength: 255
    }),
    final_decision: Field.select({
      label: 'Final Decision',
      defaultValue: 'Pending',
      readonly: true,
      options: [
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
        },
        {
          "label": "Approved with Conditions",
          "value": "ApprovedWithConditions"
        }
      ]
    }),
    approved_by_id: Field.lookup('users', {
      label: 'Approved By',
      description: 'Final approver',
      readonly: true
    }),
    approved_date: Field.datetime({
      label: 'Approved Date',
      readonly: true
    }),
    rejected_by_id: Field.lookup('users', {
      label: 'Rejected By',
      readonly: true
    }),
    rejected_date: Field.datetime({
      label: 'Rejected Date',
      readonly: true
    }),
    rejection_reason: Field.textarea({
      label: 'Rejection Reason',
      readonly: true,
      maxLength: 5000
    }),
    approval_conditions: Field.textarea({
      label: 'Approval Conditions',
      description: 'Conditions attached to approval',
      maxLength: 5000
    }),
    is_escalated: Field.checkbox({
      label: 'Escalated',
      description: 'Request has been escalated',
      defaultValue: false
    }),
    escalated_date: Field.datetime({
      label: 'Escalated Date',
      readonly: true
    }),
    escalation_reason: Field.textarea({
      label: 'Escalation Reason',
      maxLength: 2000
    }),
    due_date: Field.datetime({
      label: 'Due Date',
      description: 'SLA due date for approval decision'
    }),
    is_overdue: Field.checkbox({
      label: 'Overdue',
      description: 'Past due date',
      defaultValue: false,
      readonly: true
    }),
    response_time: Field.number({
      label: 'Response Time (hours)',
      description: 'Time taken from submission to decision',
      readonly: true,
      precision: 2
    }),
    approver_comments: Field.textarea({
      label: 'Approver Comments',
      description: 'Comments from approvers',
      maxLength: 5000
    }),
    internal_notes: Field.textarea({
      label: 'Internal Notes',
      description: 'Internal notes not visible to submitter',
      maxLength: 5000
    }),
    notify_on_approval: Field.checkbox({
      label: 'Notify on Approval',
      description: 'Send notification when approved',
      defaultValue: true
    }),
    notify_on_rejection: Field.checkbox({
      label: 'Notify on Rejection',
      description: 'Send notification when rejected',
      defaultValue: true
    }),
    escalation_email: Field.email({
      label: 'Escalation Email',
      description: 'Email for escalation notifications'
    }),
    ai_risk_score: Field.number({
      label: 'AI Risk Score',
      description: 'AI-calculated risk score (0-100)',
      readonly: true,
      precision: 2
    }),
    ai_recommendation: Field.select({
      label: 'AI Recommendation',
      readonly: true,
      options: [
        {
          "label": "Approve",
          "value": "Approve"
        },
        {
          "label": "Review",
          "value": "Review"
        },
        {
          "label": "Reject",
          "value": "Reject"
        }
      ]
    }),
    ai_analysis: Field.textarea({
      label: 'AI Analysis',
      description: 'AI analysis of approval request',
      readonly: true,
      maxLength: 2000
    }),
    ai_similar_requests: Field.textarea({
      label: 'Similar Requests',
      description: 'AI-identified similar historical requests',
      readonly: true,
      maxLength: 2000
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
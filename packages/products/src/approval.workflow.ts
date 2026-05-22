// Workflow rules for Advanced Approval automation
import { WorkflowRuleSchema, type WorkflowRule } from '@objectstack/spec/automation';

/**
 * Parallel Approval Chain Workflow
 * Routes requests to multiple approvers in parallel based on level and request type.
 */
export const ParallelApprovalChain = {
  name: 'parallel_approval_chain',
  label: 'Parallel Approval Chain',
  objectName: 'approval_request',
  description: 'Route approval requests to multiple approvers in parallel based on level and type',
  triggerType: 'on_create_or_update',
  condition: 'status = "pending" AND ISCHANGED(status)',
  actions: [
    {
      type: 'customAction',
      handler: 'resolveApprovalMatrix',
      parameters: {
        request_id: '${id}',
        request_type: '${request_type}',
        approval_level: '${current_approval_level}',
        discount_percent: '${discount_percent}',
        revenue_impact: '${revenue_impact}'
      }
    },
    {
      type: 'field_update',
      field: 'total_approval_levels',
      formula: `CASE
        WHEN discount_percent >= 30 OR revenue_impact >= 100000 THEN 3
        WHEN discount_percent >= 15 OR revenue_impact >= 50000 THEN 2
        ELSE 1 END`
    },
    {
      type: 'field_update',
      field: 'approval_matrix_rule',
      formula: `CASE
        WHEN request_type = "DiscountApproval" AND discount_percent >= 30 THEN 'VP_FINANCE_REQUIRED'
        WHEN request_type = "PriceOverride" AND revenue_impact >= 100000 THEN 'C_LEVEL_REQUIRED'
        WHEN request_type = "ContractTerms" THEN 'LEGAL_REVIEW_REQUIRED'
        WHEN request_type = "CreditLimit" THEN 'FINANCE_REVIEW_REQUIRED'
        ELSE 'STANDARD_APPROVAL' END`
    },
    {
      type: 'field_update',
      field: 'due_date',
      formula: `CASE
        WHEN revenue_impact >= 100000 THEN NOW() + 1
        WHEN revenue_impact >= 50000 THEN NOW() + 2
        ELSE NOW() + 3 END`
    },
    {
      type: 'email_alert',
      template: 'approval_request_pending',
      recipients: ['current_approver_id'],
      cc: ['${submitted_by_id.email}', '${escalation_email}'],
      condition: 'current_approver_id != NULL'
    },
    {
      type: 'task_creation',
      subject: 'Approval Required: ${name} (Level ${current_approval_level}/${total_approval_levels})',
      description: 'Type: ${request_type}\nDiscount: ${discount_percent}%\nRevenue Impact: ${revenue_impact}\nJustification: ${business_justification}',
      assignee: '${current_approver_id}',
      dueDate: '${due_date}',
      priority: 'high',
      status: 'not_started'
    },
    {
      type: 'http_call',
      method: 'POST',
      url: '${env.SLACK_WEBHOOK_URL}',
      headers: { 'Content-Type': 'application/json' },
      body: {
        text: '📋 New Approval: ${name} | Type: ${request_type} | Discount: ${discount_percent}% | Approver: ${current_approver_id.name}'
      }
    }
  ],

  executionOrder: 1,
  active: true
};

/**
 * Smart Delegation Workflow
 * Auto-delegates approval requests when the assigned approver is OOO to their backup.
 */
export const SmartDelegation = {
  name: 'smart_delegation',
  label: 'Smart Delegation for Unavailable Approvers',
  objectName: 'approval_request',
  description: 'Auto-delegate to backup approver when primary approver is out of office',
  triggerType: 'on_create_or_update',
  condition: 'status = "pending" AND current_approver_id != NULL AND current_approver_id.is_out_of_office = true',
  actions: [
    {
      type: 'customAction',
      handler: 'resolveDelegateApprover',
      parameters: {
        approver_id: '${current_approver_id}',
        request_id: '${id}',
        request_type: '${request_type}',
        max_delegation_depth: 3
      }
    },
    {
      type: 'field_update',
      field: 'internal_notes',
      formula: 'CONCAT(internal_notes, "\n[", NOW(), "] Auto-delegated from ", current_approver_id.name, " (OOO) to delegate approver.")'
    },
    {
      type: 'field_update',
      field: 'current_approver_id',
      formula: 'getDelegateApprover(current_approver_id)'
    },
    {
      type: 'email_alert',
      template: 'approval_delegated_to_you',
      recipients: ['current_approver_id'],
      cc: ['${submitted_by_id.email}']
    },
    {
      type: 'email_alert',
      template: 'approval_delegated_from_you',
      recipients: ['${current_approver_id.delegated_from_id.email}']
    },
    {
      type: 'task_creation',
      subject: 'Delegated Approval: ${name}',
      description: 'Delegated from ${current_approver_id.delegated_from_id.name} (OOO).\nType: ${request_type} | Discount: ${discount_percent}%',
      assignee: '${current_approver_id}',
      dueDate: '${due_date}',
      priority: 'high',
      status: 'not_started'
    },
    {
      type: 'http_call',
      method: 'POST',
      url: '${env.AUDIT_WEBHOOK_URL}',
      headers: { 'Content-Type': 'application/json', 'X-Event-Type': 'approval_delegation' },
      body: {
        event: 'approval_delegated',
        request_id: '${id}',
        request_number: '${request_number}',
        original_approver: '${current_approver_id.delegated_from_id.name}',
        delegate_approver: '${current_approver_id.name}',
        reason: 'out_of_office',
        timestamp: '${NOW()}'
      }
    }
  ],

  executionOrder: 2,
  active: true
};

/**
 * Approval Escalation Workflow
 * Daily scheduled check for overdue approvals; auto-escalates after SLA breach.
 */
export const ApprovalEscalation = {
  name: 'approval_escalation',
  label: 'Approval SLA Escalation',
  objectName: 'approval_request',
  description: 'Auto-escalate overdue approvals after SLA breach',
  triggerType: 'schedule',
  schedule: {
    frequency: 'daily',
    time: '08:00',
    timezone: 'UTC'
  },

  condition: 'status = "pending" AND due_date < NOW() AND is_escalated = false',
  actions: [
    { type: 'field_update', field: 'is_overdue', value: true },
    { type: 'field_update', field: 'is_escalated', value: true },
    { type: 'field_update', field: 'escalated_date', value: 'NOW()' },
    {
      type: 'field_update',
      field: 'escalation_reason',
      formula: 'CONCAT("Auto-escalated: SLA breached. Due: ", due_date, ". Overdue by ", HOURS_BETWEEN(due_date, NOW()), "h. Approver: ", current_approver_id.name)'
    },
    {
      type: 'customAction',
      handler: 'escalateApproval',
      parameters: {
        request_id: '${id}',
        current_approver_id: '${current_approver_id}',
        escalation_target: 'manager',
        sla_hours_overdue: '${HOURS_BETWEEN(due_date, NOW())}'
      }
    },
    {
      type: 'email_alert',
      template: 'approval_escalation_urgent',
      recipients: ['${current_approver_id.manager_id}'],
      cc: ['${submitted_by_id.email}', '${escalation_email}']
    },
    {
      type: 'email_alert',
      template: 'approval_escalated_notice',
      recipients: ['current_approver_id'],
      condition: 'current_approver_id != NULL'
    },
    {
      type: 'task_creation',
      subject: '⚠️ Escalated Approval: ${name} (Overdue)',
      description: 'SLA breached. Approver: ${current_approver_id.name}\nDue: ${due_date} | Discount: ${discount_percent}% | Impact: ${revenue_impact}',
      assignee: '${current_approver_id.manager_id}',
      dueDate: 'TODAY() + 1',
      priority: 'urgent',
      status: 'not_started'
    },
    {
      type: 'http_call',
      method: 'POST',
      url: '${env.SLACK_WEBHOOK_URL}',
      headers: { 'Content-Type': 'application/json' },
      body: {
        text: '🚨 Escalation: ${name} | Approver: ${current_approver_id.name} | Overdue since: ${due_date} | Escalated to: ${current_approver_id.manager_id.name}'
      }
    }
  ],

  executionOrder: 3,
  active: true
};

/**
 * Approval Auto-Resolve Workflow
 * Auto-approves low-risk requests where AI risk score < 20 and discount < 5%.
 */
export const ApprovalAutoResolve = {
  name: 'approval_auto_resolve',
  label: 'Auto-Approve Low-Risk Requests',
  objectName: 'approval_request',
  description: 'Auto-approve requests with low AI risk score and minimal discount',
  triggerType: 'on_create_or_update',
  condition: 'status = "pending" AND ai_risk_score != NULL AND ai_risk_score < 20 AND discount_percent < 5 AND ai_recommendation = "Approve"',
  actions: [
    { type: 'field_update', field: 'final_decision', value: 'approved' },
    { type: 'field_update', field: 'status', value: 'approved' },
    { type: 'field_update', field: 'approved_date', value: 'NOW()' },
    {
      type: 'field_update',
      field: 'response_time',
      formula: 'HOURS_BETWEEN(submitted_date, NOW())'
    },
    {
      type: 'field_update',
      field: 'approver_comments',
      formula: 'CONCAT("Auto-approved. AI Risk Score: ", ai_risk_score, "/100. Discount: ", discount_percent, "%. Recommendation: ", ai_recommendation)'
    },
    {
      type: 'customAction',
      handler: 'logApprovalDecision',
      parameters: {
        request_id: '${id}',
        decision: 'auto_approved',
        ai_risk_score: '${ai_risk_score}',
        ai_recommendation: '${ai_recommendation}',
        discount_percent: '${discount_percent}',
        reason: 'Low-risk auto-approval: score ${ai_risk_score} < 20, discount ${discount_percent}% < 5%'
      }
    },
    {
      type: 'email_alert',
      template: 'approval_auto_approved',
      recipients: ['${submitted_by_id.email}'],
      cc: ['${account_id.owner_id.email}']
    },
    {
      type: 'customAction',
      handler: 'applyApprovedDiscount',
      parameters: {
        request_id: '${id}',
        quote_id: '${quote_id}',
        discount_percent: '${discount_percent}',
        discount_amount: '${discount_amount}',
        proposed_price: '${proposed_price}'
      }
    },
    {
      type: 'http_call',
      method: 'POST',
      url: '${env.SLACK_WEBHOOK_URL}',
      headers: { 'Content-Type': 'application/json' },
      body: {
        text: '✅ Auto-Approved: ${name} | AI Score: ${ai_risk_score}/100 | Discount: ${discount_percent}% | By: ${submitted_by_id.name}'
      }
    }
  ],

  executionOrder: 4,
  active: true
};

export const ApprovalWorkflows = {
  parallelApprovalChain: ParallelApprovalChain,
  smartDelegation: SmartDelegation,
  approvalEscalation: ApprovalEscalation,
  approvalAutoResolve: ApprovalAutoResolve
};

export default ApprovalWorkflows;

// Spec-validated workflow definitions
export const ValidatedWorkflows = {
  parallelApprovalChain: WorkflowRuleSchema.parse({
    name: 'parallel_approval_chain',
    objectName: 'approval_request',
    triggerType: 'on_create_or_update',
    active: true,
    actions: [{ type: 'field_update', name: 'set_approval_levels', field: 'total_approval_levels', value: '1' }],
    executionOrder: 1,
    reevaluateOnChange: false,
  } satisfies WorkflowRule),

  smartDelegation: WorkflowRuleSchema.parse({
    name: 'smart_delegation',
    objectName: 'approval_request',
    triggerType: 'on_create_or_update',
    active: true,
    actions: [{ type: 'field_update', name: 'delegate_approver', field: 'current_approver_id', value: 'delegate' }],
    executionOrder: 2,
    reevaluateOnChange: false,
  } satisfies WorkflowRule),

  approvalEscalation: WorkflowRuleSchema.parse({
    name: 'approval_escalation',
    objectName: 'approval_request',
    triggerType: 'schedule',
    active: true,
    actions: [{ type: 'field_update', name: 'mark_escalated', field: 'is_escalated', value: 'true' }],
    executionOrder: 3,
    reevaluateOnChange: false,
  } satisfies WorkflowRule),

  approvalAutoResolve: WorkflowRuleSchema.parse({
    name: 'approval_auto_resolve',
    objectName: 'approval_request',
    triggerType: 'on_create_or_update',
    active: true,
    actions: [{ type: 'field_update', name: 'auto_approve', field: 'status', value: 'approved' }],
    executionOrder: 4,
    reevaluateOnChange: false,
  } satisfies WorkflowRule),
};

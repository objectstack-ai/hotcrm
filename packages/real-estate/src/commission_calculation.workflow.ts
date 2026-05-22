// Workflow rules for Commission calculation automation
import { WorkflowRuleSchema, type WorkflowRule } from '@objectstack/spec/automation';

/**
 * Commission Calculation Workflow
 * Automatically calculates commission when a listing is sold.
 */
export const CommissionCalculation = {
  name: 'commission_calculation',
  label: 'Calculate Commission on Sale',
  objectName: 'listing',
  description: 'Automatically calculate and create commission records when a listing status changes to sold',

  triggerType: 'on_create_or_update',

  condition: 'status = "sold" AND sold_price > 0 AND ISCHANGED(status)',

  actions: [
    {
      type: 'customAction',
      handler: 'calculateCommission',
      parameters: {
        listing_id: '${id}',
        sold_price: '${sold_price}',
        listing_agent: '${listing_agent}',
        commission_rate: '0.03'
      }
    },
    {
      type: 'field_update',
      field: 'sold_date',
      value: 'NOW()'
    },
    {
      type: 'email_alert',
      template: 'commission_calculated',
      recipients: ['${listing_agent.email}'],
      cc: ['${broker.email}']
    },
    {
      type: 'task_creation',
      subject: 'Process commission payment for: ${property_id.name}',
      description: 'Commission calculated for sold listing. Review and approve payment.',
      assignee: '${broker.id}',
      dueDate: 'TODAY() + 5',
      priority: 'high',
      status: 'not_started'
    }
  ],

  executionOrder: 1,
  active: true
};

/**
 * Commission Split Workflow
 * Handles co-listing and referral commission splits.
 */
export const CommissionSplit = {
  name: 'commission_split',
  label: 'Commission Split Processing',
  objectName: 'commission',
  description: 'Automatically process commission splits for co-listings and referrals',

  triggerType: 'on_create',

  condition: 'split_type != "full"',

  actions: [
    {
      type: 'customAction',
      handler: 'processCommissionSplit',
      parameters: {
        commission_id: '${id}',
        split_type: '${split_type}',
        agent_id: '${agent_id}',
        commission_amount: '${commission_amount}'
      }
    },
    {
      type: 'email_alert',
      template: 'commission_split_notification',
      recipients: ['${agent_id.email}']
    }
  ],

  executionOrder: 2,
  active: true
};

export const CommissionWorkflows = {
  calculation: CommissionCalculation,
  split: CommissionSplit
};

export default CommissionWorkflows;

// Spec-validated workflow definitions
export const ValidatedWorkflows = {
  commissionCalculation: WorkflowRuleSchema.parse({
    name: 'commission_calculation',
    objectName: 'listing',
    triggerType: 'on_create_or_update',
    active: true,
    actions: [{ type: 'field_update', name: 'set_sold_date', field: 'sold_date', value: 'NOW()' }],
    executionOrder: 1,
    reevaluateOnChange: false,
  } satisfies WorkflowRule),

  commissionSplit: WorkflowRuleSchema.parse({
    name: 'commission_split',
    objectName: 'commission',
    triggerType: 'on_create',
    active: true,
    actions: [{ type: 'field_update', name: 'process_split', field: 'payment_status', value: 'pending' }],
    executionOrder: 2,
    reevaluateOnChange: false,
  } satisfies WorkflowRule),
};

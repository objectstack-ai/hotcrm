// Workflow rules for Portfolio Rebalance automation
import { WorkflowRuleSchema, type WorkflowRule } from '@objectstack/spec/automation';

/**
 * Portfolio Drift Detection Workflow
 * Monitors portfolio allocation drift and triggers rebalance alerts.
 */
export const PortfolioDriftDetection = {
  name: 'portfolio_drift_detection',
  label: 'Portfolio Drift Detection',
  object: 'portfolio',
  description: 'Detect when portfolio allocation drifts beyond acceptable thresholds and notify advisor',

  triggerType: 'scheduled',
  schedule: {
    frequency: 'daily',
    time: '07:00',
    timezone: 'UTC'
  },

  condition: 'ABS(equity_pct - target_equity_pct) > 5 OR ABS(fixed_income_pct - target_fixed_income_pct) > 5 OR ABS(alternatives_pct - target_alternatives_pct) > 5',

  actions: [
    {
      type: 'fieldUpdate',
      field: 'rebalance_flag',
      value: 'true'
    },
    {
      type: 'emailAlert',
      template: 'portfolio_drift_alert',
      recipients: ['${wealth_account.advisor_id.email}'],
      cc: ['${wealth_account.advisor_id.manager.email}']
    },
    {
      type: 'taskCreation',
      subject: 'Review portfolio drift: ${name}',
      description: 'Portfolio allocation has drifted beyond threshold. Review and consider rebalancing.',
      assignee: '${wealth_account.advisor_id}',
      dueDate: 'TODAY() + 3',
      priority: 'high',
      status: 'not_started'
    }
  ],

  active: true
};

/**
 * Automatic Rebalance Execution Workflow
 * Executes automatic rebalancing for portfolios with auto-rebalance enabled.
 */
export const AutoRebalanceExecution = {
  name: 'auto_rebalance_execution',
  label: 'Auto Rebalance Execution',
  object: 'portfolio',
  description: 'Automatically execute rebalancing trades for portfolios with auto-rebalance enabled',

  triggerType: 'onCreateOrUpdate',

  condition: 'rebalance_flag = true AND auto_rebalance = true AND ISCHANGED(rebalance_flag)',

  actions: [
    {
      type: 'customAction',
      handler: 'executeRebalance',
      parameters: {
        portfolio_id: '${id}',
        target_equity: '${target_equity_pct}',
        target_fixed_income: '${target_fixed_income_pct}',
        target_alternatives: '${target_alternatives_pct}',
        target_cash: '${target_cash_pct}'
      }
    },
    {
      type: 'fieldUpdate',
      field: 'last_rebalance_date',
      value: 'NOW()'
    },
    {
      type: 'fieldUpdate',
      field: 'rebalance_flag',
      value: 'false'
    },
    {
      type: 'emailAlert',
      template: 'rebalance_confirmation',
      recipients: ['${wealth_account.email}', '${wealth_account.advisor_id.email}']
    }
  ],

  executionOrder: 1,
  active: true
};

/**
 * Quarterly Review Reminder Workflow
 * Sends reminders for quarterly portfolio reviews.
 */
export const QuarterlyReviewReminder = {
  name: 'quarterly_review_reminder',
  label: 'Quarterly Review Reminder',
  object: 'portfolio',
  description: 'Send quarterly review reminders to advisors for portfolio assessment',

  triggerType: 'scheduled',
  schedule: {
    frequency: 'monthly',
    time: '09:00',
    timezone: 'UTC'
  },

  condition: 'DAYS_BETWEEN(last_review_date, TODAY()) >= 90',

  actions: [
    {
      type: 'emailAlert',
      template: 'quarterly_review_reminder',
      recipients: ['${wealth_account.advisor_id.email}']
    },
    {
      type: 'taskCreation',
      subject: 'Quarterly review due: ${name}',
      description: 'Portfolio quarterly review is due. Schedule meeting with client.',
      assignee: '${wealth_account.advisor_id}',
      dueDate: 'TODAY() + 14',
      priority: 'medium',
      status: 'not_started'
    }
  ],

  active: true
};

export const PortfolioRebalanceWorkflows = {
  driftDetection: PortfolioDriftDetection,
  autoRebalance: AutoRebalanceExecution,
  quarterlyReview: QuarterlyReviewReminder
};

export default PortfolioRebalanceWorkflows;

// Spec-validated workflow definitions
export const ValidatedWorkflows = {
  portfolioDriftDetection: WorkflowRuleSchema.parse({
    name: 'portfolio_drift_detection',
    objectName: 'portfolio',
    triggerType: 'schedule',
    active: true,
    actions: [{ type: 'field_update', name: 'set_rebalance_flag', field: 'rebalance_flag', value: 'true' }],
    executionOrder: 1,
    reevaluateOnChange: false,
  } satisfies WorkflowRule),

  autoRebalanceExecution: WorkflowRuleSchema.parse({
    name: 'auto_rebalance_execution',
    objectName: 'portfolio',
    triggerType: 'on_create_or_update',
    active: true,
    actions: [{ type: 'field_update', name: 'clear_rebalance_flag', field: 'rebalance_flag', value: 'false' }],
    executionOrder: 2,
    reevaluateOnChange: false,
  } satisfies WorkflowRule),

  quarterlyReviewReminder: WorkflowRuleSchema.parse({
    name: 'quarterly_review_reminder',
    objectName: 'portfolio',
    triggerType: 'schedule',
    active: true,
    actions: [{ type: 'field_update', name: 'set_review_task', field: 'last_review_reminder', value: 'NOW()' }],
    executionOrder: 3,
    reevaluateOnChange: false,
  } satisfies WorkflowRule),
};

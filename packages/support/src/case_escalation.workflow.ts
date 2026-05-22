// Workflow rules for Case escalation automation
import { WorkflowRuleSchema, type WorkflowRule } from '@objectstack/spec/automation';

/**
 * Case Auto-Escalation Workflow
 * When a case is unresolved and exceeds SLA resolution target, escalate priority
 */
export const CaseAutoEscalation = {
  name: 'case_auto_escalation',
  label: 'Auto Escalate SLA Breached Cases',
  objectName: 'case',
  description: 'Automatically escalate case priority when SLA resolution target is exceeded',

  // Trigger: When case is updated
  triggerType: 'on_update',

  // Condition: SLA violated and case is still open
  condition: 'is_sla_violated = true AND status != "closed" AND status != "resolved" AND is_escalated = false',

  // Actions to execute
  actions: [
    // 1. Escalate priority
    {
      type: 'field_update',
      field: 'priority',
      formula: `
        CASE
          WHEN priority = 'low' THEN 'medium'
          WHEN priority = 'medium' THEN 'high'
          WHEN priority = 'high' THEN 'critical'
          ELSE priority
        END
      `
    },

    // 2. Mark as escalated
    {
      type: 'field_update',
      field: 'is_escalated',
      value: true
    },

    // 3. Set escalation date
    {
      type: 'field_update',
      field: 'escalated_date',
      value: 'NOW()'
    },

    // 4. Set escalation reason
    {
      type: 'field_update',
      field: 'escalation_reason',
      value: 'SLA resolution target exceeded'
    },

    // 5. Notify support manager
    {
      type: 'email_alert',
      template: 'case_sla_escalation',
      recipients: ['${owner_id}'],
      cc: ['${owner_id.manager_email}'],
      description: 'Alert support manager of SLA breach escalation'
    },

    // 6. Post to Slack
    {
      type: 'http_call',
      method: 'POST',
      url: '${env.SLACK_WEBHOOK_URL}',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        text: '🚨 Case SLA Escalation',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Case Escalated - SLA Breach*\n\n*Case:* ${case_number}\n*Subject:* ${subject}\n*Priority:* ${priority}\n*Account:* ${account_id.name}\n*Owner:* ${owner_id.name}'
            }
          }
        ]
      }
    }
  ],

  executionOrder: 1,
  active: true
};

/**
 * Case High Priority Alert Workflow
 * When case priority is set to Critical, notify support manager via email
 */
export const CaseHighPriorityAlert = {
  name: 'case_high_priority_alert',
  label: 'Critical Case Alert',
  objectName: 'case',
  description: 'Notify support manager immediately when a case is set to Critical priority',

  // Trigger: When case is created or updated
  triggerType: 'on_create_or_update',

  // Condition: Priority is Critical
  condition: 'priority = "critical" AND ISCHANGED(priority)',

  actions: [
    // 1. Send alert to support manager
    {
      type: 'email_alert',
      template: 'critical_case_alert',
      recipients: ['${owner_id}', '${owner_id.manager_email}'],
      description: 'Immediate notification for critical priority cases'
    },

    // 2. Create urgent follow-up task
    {
      type: 'task_creation',
      subject: 'URGENT: Critical case requires immediate attention - ${case_number}',
      description: 'Case ${case_number} has been escalated to Critical priority.\nSubject: ${subject}\nAccount: ${account_id.name}',
      assignee: '${owner_id}',
      dueDate: 'NOW() + 0.125',
      priority: 'critical',
      status: 'not_started'
    },

    // 3. Post to Slack urgent channel
    {
      type: 'http_call',
      method: 'POST',
      url: '${env.SLACK_WEBHOOK_URL}',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        text: '🔴 Critical Case Alert',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Critical Case Created*\n\n*Case:* ${case_number}\n*Subject:* ${subject}\n*Account:* ${account_id.name}\n*Contact:* ${contact_id.name}\n*Origin:* ${origin}'
            }
          }
        ]
      }
    }
  ],

  executionOrder: 2,
  active: true
};

/**
 * Case Stale Check Workflow
 * Scheduled daily - when case has no updates in 3 days and is In Progress, create follow-up task
 */
export const CaseStaleCheck = {
  name: 'case_stale_check',
  label: 'Stale Case Follow-Up',
  objectName: 'case',
  description: 'Create follow-up task for cases with no activity in 3 days',

  // Trigger: Scheduled daily
  triggerType: 'schedule',
  schedule: {
    frequency: 'daily',
    time: '08:00',
    timezone: 'UTC'
  },

  // Condition: Case is in progress with no updates in 3 days
  condition: 'status = "in_progress" AND modified_date < TODAY() - 3',

  actions: [
    // 1. Create follow-up task for case owner
    {
      type: 'task_creation',
      subject: 'Follow up on stale case: ${case_number}',
      description: 'Case ${case_number} (${subject}) has had no updates in 3+ days. Please review and provide an update or resolution.',
      assignee: '${owner_id}',
      dueDate: 'TODAY() + 1',
      priority: 'high',
      status: 'not_started'
    },

    // 2. Send reminder email to case owner
    {
      type: 'email_alert',
      template: 'stale_case_reminder',
      recipients: ['${owner_id}'],
      description: 'Remind case owner of stale case needing attention'
    }
  ],

  executionOrder: 3,
  active: true
};

/**
 * Case First Response SLA Workflow
 * When a new case is created, create task for first response within SLA window
 */
export const CaseFirstResponseSLA = {
  name: 'case_first_response_sla',
  label: 'First Response SLA Task',
  objectName: 'case',
  description: 'Create a task to ensure first response is made within the SLA window',

  // Trigger: When a new case is created
  triggerType: 'on_create',

  // Condition: Case has a response due date set
  condition: 'response_due_date != NULL AND status = "new"',

  actions: [
    // 1. Create first response task
    {
      type: 'task_creation',
      subject: 'First response required: ${case_number} - ${subject}',
      description: 'Provide first response to case before SLA deadline.\nAccount: ${account_id.name}\nPriority: ${priority}\nSLA Deadline: ${response_due_date}',
      assignee: '${owner_id}',
      dueDate: '${response_due_date}',
      priority: '${priority}',
      status: 'not_started'
    },

    // 2. Send assignment notification
    {
      type: 'email_alert',
      template: 'case_first_response_assignment',
      recipients: ['${owner_id}'],
      description: 'Notify assignee of new case requiring first response'
    },

    // 3. Update case status to indicate it is being worked
    {
      type: 'field_update',
      field: 'status',
      value: 'in_progress'
    }
  ],

  executionOrder: 4,
  active: true
};

export const CaseEscalationWorkflows = {
  autoEscalation: CaseAutoEscalation,
  highPriorityAlert: CaseHighPriorityAlert,
  staleCheck: CaseStaleCheck,
  firstResponseSLA: CaseFirstResponseSLA
};

export default CaseEscalationWorkflows;

// Spec-validated workflow definitions
export const ValidatedWorkflows = {
  caseAutoEscalation: WorkflowRuleSchema.parse({
    name: 'case_auto_escalation',
    objectName: 'case',
    triggerType: 'on_update',
    active: true,
    actions: [{ type: 'field_update', name: 'escalate_priority', field: 'priority', value: 'critical' }],
    executionOrder: 1,
    reevaluateOnChange: false,
  } satisfies WorkflowRule),

  caseHighPriorityAlert: WorkflowRuleSchema.parse({
    name: 'case_high_priority_alert',
    objectName: 'case',
    triggerType: 'on_create_or_update',
    active: true,
    actions: [{ type: 'email_alert', name: 'alert_manager', template: 'critical_case_alert', recipients: ['owner_id'] }],
    executionOrder: 2,
    reevaluateOnChange: false,
  } satisfies WorkflowRule),

  caseStaleCheck: WorkflowRuleSchema.parse({
    name: 'case_stale_check',
    objectName: 'case',
    triggerType: 'schedule',
    active: true,
    actions: [{ type: 'task_creation', name: 'create_followup', taskObject: 'task', subject: 'Follow up on stale case' }],
    executionOrder: 3,
    reevaluateOnChange: false,
  } satisfies WorkflowRule),

  caseFirstResponseSLA: WorkflowRuleSchema.parse({
    name: 'case_first_response_sla',
    objectName: 'case',
    triggerType: 'on_create',
    active: true,
    actions: [{ type: 'field_update', name: 'set_in_progress', field: 'status', value: 'in_progress' }],
    executionOrder: 4,
    reevaluateOnChange: false,
  } satisfies WorkflowRule),
};

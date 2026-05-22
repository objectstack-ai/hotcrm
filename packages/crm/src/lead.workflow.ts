// Workflow rules for Lead automation
import { WorkflowRuleSchema, type WorkflowRule } from '@objectstack/spec/automation';

/**
 * Lead Auto-Assignment Workflow
 * Automatically assigns new leads to available sales reps based on territory and workload
 */
export const LeadAutoAssignment = {
  name: 'lead_auto_assignment',
  label: 'Auto Assign New Leads',
  objectName: 'lead',
  description: 'Automatically assign new leads to the next available sales rep in the territory',

  // Trigger: When a new lead is created
  triggerType: 'on_create',

  // Condition: Only auto-assign if owner is not set and status is New
  condition: 'status = "new" AND owner = NULL',

  // Actions to execute
  actions: [
    // 1. Assign to next available rep
    {
      type: 'field_update',
      field: 'owner_id',
      formula: 'getNextAvailableRep(territory, industry)',
      description: 'Assign to next rep in round-robin'
    },

    // 2. Set assignment date
    {
      type: 'field_update',
      field: 'assigned_date',
      value: 'NOW()'
    },

    // 3. Send email notification to assigned rep
    {
      type: 'email_alert',
      template: 'new_lead_assigned',
      recipients: ['owner_id'],
      cc: ['${owner.manager_email}']
    },

    // 4. Create follow-up task
    {
      type: 'task_creation',
      subject: 'Follow up with new lead: ${name}',
      description: 'Initial contact and qualification',
      assignee: '${owner_id}',
      dueDate: 'TODAY() + 1',
      priority: 'high',
      status: 'not_started'
    },

    // 5. Log to Slack (via webhook)
    {
      type: 'http_call',
      method: 'POST',
      url: '${env.SLACK_WEBHOOK_URL}',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        text: '🎯 New lead assigned',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*New Lead Assigned*\n\n*Lead:* ${name}\n*Company:* ${company}\n*Assigned to:* ${owner.name}\n*Industry:* ${industry}'
            }
          }
        ]
      }
    }
  ],

  // Execution order (if multiple workflows)
  executionOrder: 1,

  // Active status
  active: true
};

/**
 * Lead Scoring Workflow
 * Automatically score leads when key fields are updated
 */
export const LeadAutoScoring = {
  name: 'lead_auto_scoring',
  label: 'Auto Score Leads',
  objectName: 'lead',
  description: 'Automatically calculate lead score when key fields change',

  // Trigger: When lead is created or updated
  triggerType: 'on_create_or_update',

  // Condition: Re-score if key fields changed
  condition: 'ISCHANGED(industry) OR ISCHANGED(company) OR ISCHANGED(title) OR ISCHANGED(employees) OR ISCHANGED(annual_revenue)',

  actions: [
    // Calculate and update lead score
    {
      type: 'customAction',
      handler: 'calculateLeadScore',
      parameters: {
        lead_id: '${id}',
        factors: ['industry_fit', 'company_size', 'title_seniority', 'engagement']
      }
    },

    // Update rating based on score
    {
      type: 'field_update',
      field: 'rating',
      formula: `
        CASE
          WHEN lead_score >= 80 THEN 'Hot'
          WHEN lead_score >= 60 THEN 'Warm'
          WHEN lead_score >= 40 THEN 'Cold'
          ELSE 'unqualified'
        END
      `
    },

    // Notify rep if lead becomes hot
    {
      type: 'email_alert',
      template: 'hot_lead_alert',
      recipients: ['owner_id'],
      condition: 'rating = "Hot" AND ISCHANGED(rating)'
    }
  ],

  executionOrder: 2,
  active: true
};

/**
 * Lead Nurturing Workflow
 * Send automated nurture emails to leads based on their status
 */
export const LeadNurturing = {
  name: 'lead_nurturing',
  label: 'Lead Nurturing Automation',
  objectName: 'lead',
  description: 'Send automated nurture emails to keep leads engaged',

  triggerType: 'schedule',
  schedule: {
    frequency: 'daily',
    time: '09:00',
    timezone: 'UTC'
  },

  // Condition: Leads that haven't been contacted in 7 days
  condition: 'status = "Working" AND last_contact_date < TODAY() - 7 AND do_not_email = false',

  actions: [
    {
      type: 'email_alert',
      template: 'lead_nurture_week_1',
      recipients: ['email'],
      condition: 'DAYS_BETWEEN(created_date, TODAY()) BETWEEN 7 AND 14'
    },
    {
      type: 'email_alert',
      template: 'lead_nurture_week_2',
      recipients: ['email'],
      condition: 'DAYS_BETWEEN(created_date, TODAY()) BETWEEN 14 AND 21'
    },
    {
      type: 'email_alert',
      template: 'lead_nurture_month_1',
      recipients: ['email'],
      condition: 'DAYS_BETWEEN(created_date, TODAY()) >= 30'
    },
    {
      type: 'field_update',
      field: 'last_nurture_date',
      value: 'NOW()'
    }
  ],

  active: true
};

/**
 * Lead Data Enrichment Workflow
 * Enrich lead data from external sources
 */
export const LeadEnrichment = {
  name: 'lead_data_enrichment',
  label: 'Lead Data Enrichment',
  objectName: 'lead',
  description: 'Automatically enrich lead data using external data sources',

  triggerType: 'on_create',

  condition: 'email != NULL',

  actions: [
    // Call external enrichment API
    {
      type: 'customAction',
      handler: 'enrichLeadData',
      parameters: {
        lead_id: '${id}',
        email: '${email}',
        company: '${company}'
      }
    },

    // Update enrichment timestamp
    {
      type: 'field_update',
      field: 'data_enriched_date',
      value: 'NOW()'
    }
  ],

  active: true
};

export const LeadWorkflows = {
  autoAssignment: LeadAutoAssignment,
  autoScoring: LeadAutoScoring,
  nurturing: LeadNurturing,
  enrichment: LeadEnrichment
};

export default LeadWorkflows;

// Spec-validated workflow definitions
export const ValidatedWorkflows = {
  leadAutoAssignment: WorkflowRuleSchema.parse({
    name: 'lead_auto_assignment',
    objectName: 'lead',
    triggerType: 'on_create',
    active: true,
    actions: [{ type: 'field_update', name: 'assign_owner', field: 'owner_id', value: 'next_available_rep' }],
    executionOrder: 1,
    reevaluateOnChange: false,
  } satisfies WorkflowRule),

  leadAutoScoring: WorkflowRuleSchema.parse({
    name: 'lead_auto_scoring',
    objectName: 'lead',
    triggerType: 'on_create_or_update',
    active: true,
    actions: [{ type: 'field_update', name: 'update_rating', field: 'rating', value: 'calculated' }],
    executionOrder: 2,
    reevaluateOnChange: false,
  } satisfies WorkflowRule),

  leadNurturing: WorkflowRuleSchema.parse({
    name: 'lead_nurturing',
    objectName: 'lead',
    triggerType: 'schedule',
    active: true,
    actions: [{ type: 'field_update', name: 'set_nurture_date', field: 'last_nurture_date', value: 'NOW()' }],
    executionOrder: 3,
    reevaluateOnChange: false,
  } satisfies WorkflowRule),

  leadEnrichment: WorkflowRuleSchema.parse({
    name: 'lead_data_enrichment',
    objectName: 'lead',
    triggerType: 'on_create',
    active: true,
    actions: [{ type: 'field_update', name: 'set_enriched_date', field: 'data_enriched_date', value: 'NOW()' }],
    executionOrder: 4,
    reevaluateOnChange: false,
  } satisfies WorkflowRule),
};

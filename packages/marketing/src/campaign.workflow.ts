// Workflow rules for Campaign automation

/**
 * Campaign Auto-Activation Workflow
 * When start_date is today and status is 'planned', auto-activate the campaign
 */
export const CampaignAutoActivation = {
  name: 'campaign_auto_activation',
  label: 'Auto Activate Campaigns',
  object: 'campaign',
  description: 'Automatically activate campaigns when their start date arrives',

  // Trigger: Scheduled daily to check for campaigns ready to launch
  triggerType: 'scheduled',
  schedule: {
    frequency: 'daily',
    time: '00:15',
    timezone: 'UTC'
  },

  // Condition: Campaign is planned and start_date is today
  condition: 'status = "planned" AND start_date = TODAY()',

  // Actions to execute
  actions: [
    // 1. Update status to In Progress
    {
      type: 'fieldUpdate',
      field: 'status',
      value: 'in_progress'
    },

    // 2. Mark campaign as active
    {
      type: 'fieldUpdate',
      field: 'is_active',
      value: true
    },

    // 3. Notify campaign owner
    {
      type: 'emailAlert',
      template: 'campaign_activated',
      recipients: ['${created_by}'],
      description: 'Notify owner that campaign is now live'
    }
  ],

  executionOrder: 1,
  active: true
};

/**
 * Campaign Budget Alert Workflow
 * When actual_cost exceeds 80% of budgeted_cost, send alert to campaign owner
 */
export const CampaignBudgetAlert = {
  name: 'campaign_budget_alert',
  label: 'Campaign Budget Alert',
  object: 'campaign',
  description: 'Alert campaign owner when actual cost exceeds 80% of budgeted cost',

  // Trigger: When campaign is updated (cost fields change)
  triggerType: 'onCreateOrUpdate',

  // Condition: Actual cost exceeds 80% of budget
  condition: 'actual_cost > (budgeted_cost * 0.8) AND budgeted_cost > 0 AND status = "in_progress"',

  actions: [
    // 1. Send budget alert email
    {
      type: 'emailAlert',
      template: 'campaign_budget_warning',
      recipients: ['${created_by}'],
      cc: ['${created_by.manager_email}'],
      description: 'Alert that campaign has exceeded 80% of budget'
    },

    // 2. Post to Slack
    {
      type: 'httpCall',
      method: 'POST',
      url: '${env.SLACK_WEBHOOK_URL}',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        text: '⚠️ Campaign Budget Alert',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Campaign Budget Warning*\n\n*Campaign:* ${name}\n*Budgeted:* ${budgeted_cost}\n*Actual:* ${actual_cost}\n*Usage:* ${ROUND(actual_cost / budgeted_cost * 100, 1)}%'
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
 * Campaign Completion Check Workflow
 * Scheduled daily - auto-complete campaigns whose end_date has passed
 */
export const CampaignCompletionCheck = {
  name: 'campaign_completion_check',
  label: 'Auto Complete Expired Campaigns',
  object: 'campaign',
  description: 'Automatically complete campaigns whose end date has passed',

  // Trigger: Scheduled daily
  triggerType: 'scheduled',
  schedule: {
    frequency: 'daily',
    time: '01:00',
    timezone: 'UTC'
  },

  // Condition: End date has passed and campaign is still active
  condition: 'end_date < TODAY() AND status = "in_progress"',

  actions: [
    // 1. Update status to Completed
    {
      type: 'fieldUpdate',
      field: 'status',
      value: 'completed'
    },

    // 2. Deactivate the campaign
    {
      type: 'fieldUpdate',
      field: 'is_active',
      value: false
    },

    // 3. Calculate final ROI
    {
      type: 'customAction',
      handler: 'calculateCampaignROI',
      parameters: {
        campaign_id: '${id}',
        metrics: ['actual_cost', 'actual_revenue', 'expected_revenue']
      }
    },

    // 4. Notify owner of completion
    {
      type: 'emailAlert',
      template: 'campaign_completed_summary',
      recipients: ['${created_by}'],
      description: 'Send campaign completion summary with ROI metrics'
    }
  ],

  executionOrder: 3,
  active: true
};

/**
 * Campaign Member Welcome Workflow
 * When a new campaign_member is created, send welcome email
 */
export const CampaignMemberWelcome = {
  name: 'campaign_member_welcome',
  label: 'Welcome New Campaign Members',
  object: 'campaign_member',
  description: 'Send a welcome email when a new member is added to a campaign',

  // Trigger: When a new campaign member is created
  triggerType: 'onCreate',

  // Condition: Member has a valid contact or lead reference
  condition: 'contact != NULL OR lead != NULL',

  actions: [
    // 1. Send welcome email
    {
      type: 'emailAlert',
      template: 'campaign_member_welcome',
      recipients: ['${contact.email}', '${lead.email}'],
      description: 'Send welcome email to new campaign member'
    },

    // 2. Update member status
    {
      type: 'fieldUpdate',
      field: 'status',
      value: 'sent'
    },

    // 3. Create follow-up task for campaign owner
    {
      type: 'taskCreation',
      subject: 'Follow up with new campaign member: ${contact.name || lead.name}',
      description: 'New member added to campaign ${campaign.name}. Review engagement.',
      assignee: '${campaign.created_by}',
      dueDate: 'TODAY() + 3',
      priority: 'normal',
      status: 'not_started'
    }
  ],

  executionOrder: 4,
  active: true
};

export const CampaignWorkflows = {
  autoActivation: CampaignAutoActivation,
  budgetAlert: CampaignBudgetAlert,
  completionCheck: CampaignCompletionCheck,
  memberWelcome: CampaignMemberWelcome
};

export default CampaignWorkflows;

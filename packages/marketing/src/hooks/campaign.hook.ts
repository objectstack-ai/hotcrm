import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Campaign Lifecycle and ROI Management Trigger
 * 
 * Automatically handles:
 * 1. ROI calculation based on actual revenue and cost
 * 2. Budget tracking and overspend warnings
 * 3. Campaign status lifecycle automation
 * 4. Performance metrics aggregation
 */
const CampaignROICalculationTrigger: Hook = {
  name: 'CampaignROICalculationTrigger',
  object: 'campaign',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const campaign = ctx.input;

      // Calculate ROI: (ActualRevenue - ActualCost) / ActualCost * 100
      const actualRevenue = campaign.actual_revenue || 0;
      const actualCost = campaign.actual_cost || 0;

      if (actualCost > 0) {
        campaign.roi = ((actualRevenue - actualCost) / actualCost) * 100;
        console.log(`📊 Campaign ROI calculated: ${campaign.roi.toFixed(2)}%`);
      } else if (actualRevenue > 0 && actualCost === 0) {
        // Infinite ROI - revenue with no cost
        campaign.roi = 999.99;
        console.log(`📊 Campaign ROI: Infinite (revenue with zero cost)`);
      } else {
        campaign.roi = 0;
      }

      // Calculate budget utilization percentage
      const budgetedCost = campaign.budgeted_cost || 0;
      if (budgetedCost > 0) {
        campaign.budget_utilization = (actualCost / budgetedCost) * 100;
        console.log(`💰 Budget utilization: ${campaign.budget_utilization.toFixed(1)}%`);
      }

    } catch (error) {
      console.error('❌ Error in CampaignROICalculationTrigger:', error);
    }
  }
};

/**
 * Campaign Budget Tracking Trigger
 * 
 * Monitors spending and sends warnings:
 * - Alert at 80% of budget
 * - Alert at 100% of budget
 * - Track variance from budget
 */
const CampaignBudgetTrackingTrigger: Hook = {
  name: 'CampaignBudgetTrackingTrigger',
  object: 'campaign',
  events: ['beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const campaign = ctx.input;
      const oldCampaign = ctx.previous;

      // Only process if actual cost changed
      if (!oldCampaign || oldCampaign.actual_cost === campaign.actual_cost) {
        return;
      }

      const budgeted = campaign.budgeted_cost || 0;
      const actual = campaign.actual_cost || 0;

      if (budgeted > 0) {
        const percentSpent = (actual / budgeted) * 100;

        // Warn at 80%
        if (percentSpent >= 80 && percentSpent < 100) {
          console.warn(`⚠️ Campaign "${campaign.name}" has spent ${percentSpent.toFixed(1)}% of budget!`);
          // TODO: Create notification/task for campaign manager
        }

        // Alert at 100%
        if (percentSpent >= 100) {
          console.error(`🚨 Campaign "${campaign.name}" has exceeded budget! (${percentSpent.toFixed(1)}%)`);
          // TODO: Create urgent notification
        }

        console.log(`💰 Budget status: $${actual.toLocaleString()} / $${budgeted.toLocaleString()} (${percentSpent.toFixed(1)}%)`);
      }

    } catch (error) {
      console.error('❌ Error in CampaignBudgetTrackingTrigger:', error);
    }
  }
};

/**
 * Campaign Status Change Automation Trigger
 * 
 * Handles automation when campaign status changes:
 * - Start campaign: Activate members, send notifications
 * - Complete campaign: Calculate final metrics, archive
 * - Abort campaign: Cleanup and logging
 */
const CampaignStatusChangeTrigger: Hook = {
  name: 'CampaignStatusChangeTrigger',
  object: 'campaign',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const campaign = ctx.input;
      const oldCampaign = ctx.previous;

      // Check if status changed
      if (!oldCampaign || oldCampaign.status === campaign.status) {
        return;
      }

      console.log(`🔄 Campaign status changed: ${oldCampaign.status} → ${campaign.status}`);

      switch (campaign.status) {
        case 'In Progress':
          await handleInProgressStatus(campaign, ctx);
          break;
        case 'Completed':
          await handleCompletedStatus(campaign, ctx);
          break;
        case 'Aborted':
          await handleAbortedStatus(campaign, ctx);
          break;
      }

    } catch (error) {
      console.error('❌ Error in CampaignStatusChangeTrigger:', error);
    }
  }
};

/**
 * Handle campaign transition to In Progress
 */
async function handleInProgressStatus(campaign: any, ctx: HookContext): Promise<void> {
  console.log(`🚀 Campaign "${campaign.name}" started`);
  
  // TODO: Send notifications to campaign members
  // TODO: Activate automated workflows
  // TODO: Log campaign start event
}

/**
 * Handle campaign completion
 */
async function handleCompletedStatus(campaign: any, ctx: HookContext): Promise<void> {
  console.log(`✅ Campaign "${campaign.name}" completed`);
  
  // TODO: Calculate final performance metrics
  // TODO: Generate campaign report
  // TODO: Archive campaign data
  // TODO: Send completion notification to stakeholders
}

/**
 * Handle campaign abortion
 */
async function handleAbortedStatus(campaign: any, ctx: HookContext): Promise<void> {
  console.log(`❌ Campaign "${campaign.name}" was aborted`);
  
  // TODO: Log abort reason
  // TODO: Cleanup scheduled activities
  // TODO: Notify team members
}

/**
 * Campaign Date Validation Trigger
 * 
 * Ensures end date is after start date
 */
const CampaignDateValidationTrigger: Hook = {
  name: 'CampaignDateValidationTrigger',
  object: 'campaign',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const campaign = ctx.input;

      if (campaign.start_date && campaign.end_date) {
        const startDate = new Date(campaign.start_date);
        const endDate = new Date(campaign.end_date);

        if (endDate < startDate) {
          throw new Error('Campaign end date must be after start date');
        }

        // Calculate duration in days
        const durationMs = endDate.getTime() - startDate.getTime();
        const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
        campaign.duration_days = durationDays;
        
        console.log(`📅 Campaign duration: ${durationDays} days`);
      }

    } catch (error) {
      console.error('❌ Error in CampaignDateValidationTrigger:', error);
      throw error;
    }
  }
};

/**
 * Update campaign metrics from member engagement
 * Called by campaign_member hooks
 */
export async function updateCampaignMetrics(campaignId: string, ctx: HookContext): Promise<void> {
  try {
    console.log(`🔄 Updating campaign metrics for: ${campaignId}`);

    // Aggregate campaign member statistics
    const members = await ctx.ql.find('campaign_member', {
      filters: [['campaign', '=', campaignId]]
    });

    if (!members || members.length === 0) {
      return;
    }

    // Calculate engagement metrics
    const totalMembers = members.length;
    const opened = members.filter(m => 
      ['Opened', 'Clicked', 'Responded'].includes(m.status)
    ).length;
    const clicked = members.filter(m => 
      ['Clicked', 'Responded'].includes(m.status)
    ).length;
    const responded = members.filter(m => m.status === 'Responded').length;
    const unsubscribed = members.filter(m => m.status === 'Unsubscribed').length;

    // Calculate rates
    const openRate = totalMembers > 0 ? (opened / totalMembers) * 100 : 0;
    const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;
    const responseRate = totalMembers > 0 ? (responded / totalMembers) * 100 : 0;
    const unsubscribeRate = totalMembers > 0 ? (unsubscribed / totalMembers) * 100 : 0;

    // Update campaign with aggregated metrics
    await ctx.ql.update('campaign', campaignId, {
      total_members: totalMembers,
      total_opened: opened,
      total_clicked: clicked,
      total_responded: responded,
      total_unsubscribed: unsubscribed,
      open_rate: openRate,
      click_rate: clickRate,
      response_rate: responseRate,
      unsubscribe_rate: unsubscribeRate
    });

    console.log(`✅ Campaign metrics updated - Open: ${openRate.toFixed(1)}%, Click: ${clickRate.toFixed(1)}%, Response: ${responseRate.toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Error updating campaign metrics:', error);
  }
}

/**
 * Calculate cost per lead/opportunity/customer
 */
export async function calculateCostMetrics(campaignId: string, ctx: HookContext): Promise<any> {
  try {
    const campaign = await ctx.ql.findOne('campaign', {
      filters: [['id', '=', campaignId]]
    });

    if (!campaign) {
      return null;
    }

    const actualCost = campaign.actual_cost || 0;
    const totalMembers = campaign.total_members || 0;
    const totalResponded = campaign.total_responded || 0;

    // Calculate cost per metrics
    const costPerContact = totalMembers > 0 ? actualCost / totalMembers : 0;
    const costPerResponse = totalResponded > 0 ? actualCost / totalResponded : 0;

    return {
      costPerContact,
      costPerResponse,
      totalCost: actualCost,
      totalContacts: totalMembers,
      totalResponses: totalResponded
    };

  } catch (error) {
    console.error('❌ Error calculating cost metrics:', error);
    return null;
  }
}

// Export all hooks
export {
  CampaignROICalculationTrigger,
  CampaignBudgetTrackingTrigger,
  CampaignStatusChangeTrigger,
  CampaignDateValidationTrigger
};

export default [
  CampaignROICalculationTrigger,
  CampaignBudgetTrackingTrigger,
  CampaignStatusChangeTrigger,
  CampaignDateValidationTrigger
];

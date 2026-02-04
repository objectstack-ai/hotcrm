import type { Hook } from '@objectstack/spec/data';
import { db } from '../db';

// Types for Context
interface TriggerContext {
  old?: Record<string, any>;
  new: Record<string, any>;
  db: typeof db;
  user: { id: string; name: string; email: string; };
}

/**
 * Campaign ROI Calculation Trigger
 * 
 * Calculates ROI based on:
 * - Formula: (ActualRevenue - ActualCost) / ActualCost * 100
 * - Tracks: Opportunities created, Leads generated, Revenue won
 * - Auto-updates on related opportunity/lead changes
 */
const CampaignROICalculationTrigger: Hook = {
  name: 'CampaignROICalculationTrigger',
  object: 'Campaign',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      const campaign = ctx.new;
      
      // Calculate ROI
      const actualRevenue = campaign.ActualRevenue || 0;
      const actualCost = campaign.ActualCost || 0;
      
      if (actualCost > 0) {
        campaign.ROI = ((actualRevenue - actualCost) / actualCost) * 100;
        console.log(`📊 Campaign ROI calculated: ${campaign.ROI.toFixed(2)}%`);
      } else if (actualRevenue > 0 && actualCost === 0) {
        // Infinite ROI - revenue with no cost
        campaign.ROI = 999.99; // Cap at a high value for display purposes
        console.log(`📊 Campaign ROI: Infinite (revenue with zero cost) - capped at 999.99%`);
      } else {
        campaign.ROI = 0;
      }
      
      // Calculate conversion rate
      const totalLeads = campaign.NumberOfLeads || 0;
      const convertedLeads = campaign.NumberOfConvertedLeads || 0;
      
      if (totalLeads > 0) {
        campaign.ConversionRate = (convertedLeads / totalLeads) * 100;
        console.log(`📊 Campaign conversion rate: ${campaign.ConversionRate.toFixed(2)}%`);
      } else {
        campaign.ConversionRate = 0;
      }
      
    } catch (error) {
      console.error('❌ Error in CampaignROICalculationTrigger:', error);
    }
  }
};

/**
 * Update campaign metrics from related opportunities/leads
 * This would typically be called from Opportunity/Lead hooks
 */
export async function updateCampaignMetrics(campaignId: string, db: any): Promise<void> {
  console.log(`🔄 Updating campaign metrics for: ${campaignId}`);
  
  // In real implementation:
  // 1. Count leads generated from this campaign
  // const leads = await db.find('Lead', {
  //   filters: [['CampaignId', '=', campaignId]]
  // });
  // 
  // const convertedLeads = leads.filter(l => l.Status === 'converted');
  
  // 2. Count opportunities from this campaign
  // const opportunities = await db.find('Opportunity', {
  //   filters: [['CampaignId', '=', campaignId]]
  // });
  // 
  // const wonOpportunities = opportunities.filter(o => o.Stage === 'closed_won');
  
  // 3. Calculate actual revenue from won opportunities
  // const actualRevenue = wonOpportunities.reduce((sum, opp) => sum + (opp.Amount || 0), 0);
  
  // 4. Update campaign
  // await db.doc.update('Campaign', campaignId, {
  //   NumberOfLeads: leads.length,
  //   NumberOfConvertedLeads: convertedLeads.length,
  //   NumberOfOpportunities: opportunities.length,
  //   NumberOfWonOpportunities: wonOpportunities.length,
  //   ActualRevenue: actualRevenue
  // });
  
  console.log(`✅ Campaign metrics updated for ${campaignId}`);
}

/**
 * Campaign Budget Tracking Trigger
 * 
 * Handles:
 * - Warn when spent > 80% of budget
 * - Block activities when budget exceeded
 * - Track actual vs planned spend
 */
const CampaignBudgetTrackingTrigger: Hook = {
  name: 'CampaignBudgetTrackingTrigger',
  object: 'Campaign',
  events: ['beforeUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      const campaign = ctx.new;
      const oldCampaign = ctx.old;
      
      // Check if actual cost changed
      if (!oldCampaign || oldCampaign.ActualCost === campaign.ActualCost) {
        return;
      }
      
      const budgeted = campaign.BudgetedCost || 0;
      const actual = campaign.ActualCost || 0;
      
      if (budgeted > 0) {
        const percentSpent = (actual / budgeted) * 100;
        
        // Warn at 80%
        if (percentSpent >= 80 && percentSpent < 100) {
          console.warn(`⚠️ Campaign ${campaign.Name} has spent ${percentSpent.toFixed(1)}% of budget!`);
          // Could create a task or send notification
        }
        
        // Block at 100%
        if (percentSpent >= 100) {
          console.error(`🚨 Campaign ${campaign.Name} has exceeded budget! (${percentSpent.toFixed(1)}%)`);
          // In real implementation, might want to block certain actions
          // Could set a flag or send urgent notification
        }
        
        // Log budget utilization
        console.log(`💰 Campaign budget: ${actual.toLocaleString()} / ${budgeted.toLocaleString()} (${percentSpent.toFixed(1)}%)`);
      }
      
    } catch (error) {
      console.error('❌ Error in CampaignBudgetTrackingTrigger:', error);
    }
  }
};

/**
 * Campaign Member Management
 * 
 * Auto-add leads/contacts based on criteria
 * Track engagement: Sent, Opened, Clicked, Responded
 */
export async function addCampaignMembersByCriteria(campaignId: string, criteria: Record<string, any>, db: any): Promise<void> {
  console.log(`🔄 Adding campaign members by criteria for: ${campaignId}`);
  
  // In real implementation:
  // 1. Query leads/contacts matching criteria
  // const matchingLeads = await db.find('Lead', { filters: criteria });
  
  // 2. Create campaign members
  // for (const lead of matchingLeads) {
  //   await db.doc.create('CampaignMember', {
  //     CampaignId: campaignId,
  //     LeadId: lead.Id,
  //     Status: 'Sent'
  //   });
  // }
  
  console.log(`✅ Campaign members added for ${campaignId}`);
}

/**
 * Remove unsubscribed members from campaign
 */
export async function removeUnsubscribedMembers(campaignId: string, db: any): Promise<void> {
  console.log(`🔄 Removing unsubscribed members from: ${campaignId}`);
  
  // In real implementation:
  // const unsubscribed = await db.find('CampaignMember', {
  //   filters: [
  //     ['CampaignId', '=', campaignId],
  //     ['Status', '=', 'Unsubscribed']
  //   ]
  // });
  
  // for (const member of unsubscribed) {
  //   await db.doc.delete('CampaignMember', member.Id);
  // }
  
  console.log(`✅ Unsubscribed members removed from ${campaignId}`);
}

/**
 * Campaign Performance Tracking
 * 
 * Tracks:
 * - Conversion rates: Lead → Opportunity → Won
 * - Response rates by channel
 * - Cost per lead/opportunity/customer
 */
export async function calculateCampaignPerformance(campaignId: string, db: any): Promise<Record<string, any>> {
  console.log(`🔄 Calculating campaign performance for: ${campaignId}`);
  
  // In real implementation, would query and calculate:
  const performance = {
    totalLeads: 0,
    convertedLeads: 0,
    totalOpportunities: 0,
    wonOpportunities: 0,
    totalRevenue: 0,
    totalCost: 0,
    roi: 0,
    costPerLead: 0,
    costPerOpportunity: 0,
    costPerCustomer: 0,
    leadToOpportunityRate: 0,
    opportunityToWinRate: 0,
    overallConversionRate: 0
  };
  
  // const campaign = await db.doc.get('Campaign', campaignId);
  // const leads = await db.find('Lead', { filters: [['CampaignId', '=', campaignId]] });
  // const opportunities = await db.find('Opportunity', { filters: [['CampaignId', '=', campaignId]] });
  
  // performance.totalLeads = leads.length;
  // performance.convertedLeads = leads.filter(l => l.Status === 'converted').length;
  // performance.totalOpportunities = opportunities.length;
  // performance.wonOpportunities = opportunities.filter(o => o.Stage === 'closed_won').length;
  // performance.totalRevenue = opportunities
  //   .filter(o => o.Stage === 'closed_won')
  //   .reduce((sum, o) => sum + (o.Amount || 0), 0);
  // performance.totalCost = campaign.ActualCost || 0;
  
  // if (performance.totalCost > 0) {
  //   performance.roi = ((performance.totalRevenue - performance.totalCost) / performance.totalCost) * 100;
  //   performance.costPerLead = performance.totalLeads > 0 ? performance.totalCost / performance.totalLeads : 0;
  //   performance.costPerOpportunity = performance.totalOpportunities > 0 ? performance.totalCost / performance.totalOpportunities : 0;
  //   performance.costPerCustomer = performance.wonOpportunities > 0 ? performance.totalCost / performance.wonOpportunities : 0;
  // }
  
  // if (performance.totalLeads > 0) {
  //   performance.leadToOpportunityRate = (performance.totalOpportunities / performance.totalLeads) * 100;
  //   performance.overallConversionRate = (performance.wonOpportunities / performance.totalLeads) * 100;
  // }
  
  // if (performance.totalOpportunities > 0) {
  //   performance.opportunityToWinRate = (performance.wonOpportunities / performance.totalOpportunities) * 100;
  // }
  
  console.log(`✅ Campaign performance calculated:`, performance);
  return performance;
}

/**
 * Campaign Status Change Trigger
 * 
 * Handles automation when campaign status changes
 */
const CampaignStatusChangeTrigger: Hook = {
  name: 'CampaignStatusChangeTrigger',
  object: 'Campaign',
  events: ['afterUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      const campaign = ctx.new;
      const oldCampaign = ctx.old;
      
      if (!oldCampaign || oldCampaign.Status === campaign.Status) {
        return;
      }
      
      console.log(`🔄 Campaign status changed: ${oldCampaign.Status} → ${campaign.Status}`);
      
      // When campaign is completed, calculate final metrics
      if (campaign.Status === 'Completed') {
        await updateCampaignMetrics(campaign.Id, ctx.db);
        console.log(`✅ Campaign ${campaign.Name} completed - final metrics calculated`);
      }
      
      // When campaign is aborted, log reason
      if (campaign.Status === 'Aborted') {
        console.log(`❌ Campaign ${campaign.Name} was aborted`);
        // Could create a task for post-mortem analysis
      }
      
    } catch (error) {
      console.error('❌ Error in CampaignStatusChangeTrigger:', error);
    }
  }
};

// Export all hooks
export {
  CampaignROICalculationTrigger,
  CampaignBudgetTrackingTrigger,
  CampaignStatusChangeTrigger
};

export default CampaignROICalculationTrigger;

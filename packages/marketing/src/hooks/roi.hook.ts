import type { Hook } from '@objectstack/spec/data';
import { db } from '../db';

/**
 * Campaign ROI Calculator
 * 
 * Updates Campaign Actual Revenue when Opportunities are closed.
 */
const CampaignROIHook: Hook = {
  name: 'CampaignROIHook',
  object: 'opportunity', // Listening to Opportunity events from Marketing package
  events: ['afterUpdate'],
  handler: async (ctx: any) => {
    const newOpp = ctx.new;
    const oldOpp = ctx.old;

    // Check if Campaign is linked
    if (!newOpp.campaign_id) return;
    
    const isWon = newOpp.stage_name === 'closed_won';
    const wasWon = oldOpp.stage_name === 'closed_won';
    
    let delta = 0;

    // Case 1: Just Won
    if (isWon && !wasWon) {
      delta = newOpp.amount || 0;
    }
    // Case 2: Just Lost (or moved out of Won)
    else if (!isWon && wasWon) {
      delta = -(oldOpp.amount || 0);
    }
    // Case 3: Amount changed while Won
    else if (isWon && wasWon && newOpp.amount !== oldOpp.amount) {
      delta = (newOpp.amount || 0) - (oldOpp.amount || 0);
    }

    if (delta !== 0) {
      console.log(`💰 Updating Campaign ${newOpp.campaign_id} Revenue by ${delta}`);
      
      // Fetch current campaign to get current revenue
      // Note: In a real concurrent system, use $inc operator. 
      // objectstack/runtime usually supports partial updates.
      // If we can't use $inc, we risk race conditions, but for this prototype:
      const campaigns = await db.find('campaign', { filters: [['_id', '=', newOpp.campaign_id]] });
      if (campaigns && campaigns.length > 0) {
        const campaign: any = campaigns[0];
        const currentRevenue = campaign.actual_revenue || 0;
        
        await db.update('campaign', newOpp.campaign_id, {
          actual_revenue: currentRevenue + delta
        });
      }
    }
  }
};

export { CampaignROIHook };
export default [CampaignROIHook];

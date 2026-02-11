import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Touchpoint Recording Trigger
 * 
 * When creating a touchpoint:
 * - Set default attribution_weight based on attribution_model
 * - Set touchpoint_date to now if not provided
 * - Validate required fields (touchpoint_type, channel)
 */
const TouchpointRecordingTrigger: Hook = {
  name: 'TouchpointRecordingTrigger',
  object: 'touchpoint',
  events: ['beforeInsert'],
  handler: async (ctx: HookContext) => {
    try {
      const touchpoint = ctx.input.doc as Record<string, any>;

      // Validate required fields
      if (!touchpoint.touchpoint_type) {
        console.error(`❌ Touchpoint requires touchpoint_type`);
        return;
      }

      if (!touchpoint.channel) {
        console.error(`❌ Touchpoint requires channel`);
        return;
      }

      // Set touchpoint_date to now if not provided
      if (!touchpoint.touchpoint_date) {
        touchpoint.touchpoint_date = new Date().toISOString();
        console.log(`📅 Set touchpoint_date to ${touchpoint.touchpoint_date}`);
      }

      // Set default attribution_weight based on attribution_model
      if (!touchpoint.attribution_weight) {
        switch (touchpoint.attribution_model) {
          case 'first_touch':
            touchpoint.attribution_weight = 100;
            break;
          case 'last_touch':
            touchpoint.attribution_weight = 100;
            break;
          case 'linear':
            touchpoint.attribution_weight = 0; // Will be recalculated after insert
            break;
          case 'u_shaped':
            touchpoint.attribution_weight = 20; // Middle touches get 20%
            break;
          case 'w_shaped':
            touchpoint.attribution_weight = 10; // Non-key touches get 10%
            break;
          default:
            touchpoint.attribution_weight = 100; // Default to full weight
            break;
        }
        console.log(`⚖️ Set attribution_weight to ${touchpoint.attribution_weight} for model "${touchpoint.attribution_model || 'default'}"`);
      }

    } catch (error) {
      console.error(`[attribution.hook] touchpoint recording failed:`, error);
    }
  }
};

/**
 * Revenue Attribution Trigger
 * 
 * When a touchpoint is marked as conversion (is_conversion = true):
 * - If revenue_attributed is set, update the campaign's actual_revenue
 * - Find all touchpoints for the same campaign and recalculate attribution weights
 */
const RevenueAttributionTrigger: Hook = {
  name: 'RevenueAttributionTrigger',
  object: 'touchpoint',
  events: ['afterInsert', 'afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const touchpoint = ctx.result as Record<string, any>;

      // Only process conversion touchpoints
      if (!touchpoint.is_conversion) {
        return;
      }

      const campaignId = touchpoint.campaign;
      if (!campaignId) {
        return;
      }

      // Update campaign actual_revenue if revenue_attributed is set
      if (touchpoint.revenue_attributed) {
        const campaigns = await (ctx.ql as any).find('campaign', {
          filters: [['_id', '=', campaignId]]
        });

        if (campaigns && campaigns.length > 0) {
          const campaign: any = campaigns[0];
          const currentRevenue = campaign.actual_revenue || 0;

          await (ctx.ql as any).doc.update('campaign', campaignId, {
            actual_revenue: currentRevenue + touchpoint.revenue_attributed
          });

          console.log(`💰 Updated campaign ${campaignId} revenue by $${touchpoint.revenue_attributed}`);
        }
      }

      // Recalculate attribution weights for all touchpoints in the campaign
      const allTouchpoints = await (ctx.ql as any).find('touchpoint', {
        filters: [['campaign', '=', campaignId]]
      });

      if (allTouchpoints && allTouchpoints.length > 0) {
        const totalTouchpoints = allTouchpoints.length;

        for (const tp of allTouchpoints) {
          if (tp.attribution_model === 'linear') {
            const linearWeight = 100 / totalTouchpoints;
            await (ctx.ql as any).doc.update('touchpoint', tp._id || tp.id, {
              attribution_weight: linearWeight
            });
          }
        }

        console.log(`⚖️ Recalculated attribution weights for ${totalTouchpoints} touchpoints in campaign ${campaignId}`);
      }

    } catch (error) {
      console.error(`[attribution.hook] revenue attribution failed:`, error);
    }
  }
};

// Export all hooks
export {
  TouchpointRecordingTrigger,
  RevenueAttributionTrigger
};

export default [
  TouchpointRecordingTrigger,
  RevenueAttributionTrigger
] as Hook[];

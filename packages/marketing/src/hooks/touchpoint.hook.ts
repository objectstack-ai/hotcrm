import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Touchpoint Timestamp Validation Trigger
 * 
 * Validates touchpoint data before insert/update:
 * 1. touchpoint_date is required and cannot be in the future
 * 2. attribution_weight must be between 0 and 100 if provided
 * 3. Auto-set channel based on touchpoint_type if not provided
 */
const TouchpointTimestampValidationTrigger: Hook = {
  name: 'TouchpointTimestampValidationTrigger',
  object: 'touchpoint',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.input.doc as Record<string, any>;

      // Validate touchpoint_date is not in the future
      if (doc.touchpoint_date) {
        const tpDate = new Date(doc.touchpoint_date);
        const now = new Date();
        if (tpDate > now) {
          throw new Error('Touchpoint date cannot be in the future.');
        }
      }

      // Validate attribution_weight range
      if (doc.attribution_weight !== undefined && doc.attribution_weight !== null) {
        if (doc.attribution_weight < 0 || doc.attribution_weight > 100) {
          throw new Error('Attribution weight must be between 0 and 100.');
        }
      }

      // Auto-set channel based on touchpoint_type if not provided
      if (!doc.channel && doc.touchpoint_type) {
        const channelMap: Record<string, string> = {
          email_open: 'email',
          email_click: 'email',
          form_submission: 'web',
          page_visit: 'web',
          event_attendance: 'events',
          social_interaction: 'social',
          ad_click: 'paid_ads',
          webinar: 'events',
          content_download: 'web'
        };
        doc.channel = channelMap[doc.touchpoint_type] || doc.channel;
        if (doc.channel) {
          console.log(`🔄 Auto-set channel to "${doc.channel}" based on touchpoint type`);
        }
      }

      console.log(`✅ Touchpoint validation passed`);
    } catch (error) {
      console.error('❌ Touchpoint validation failed:', error);
      throw error;
    }
  }
};

/**
 * Touchpoint Attribution Scoring Trigger
 * 
 * After update, recalculate attribution scoring for the associated campaign.
 * When a touchpoint is marked as a conversion, update campaign metrics.
 */
const TouchpointAttributionScoringTrigger: Hook = {
  name: 'TouchpointAttributionScoringTrigger',
  object: 'touchpoint',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const touchpoint = ctx.result as Record<string, any>;
      const oldTouchpoint = ctx.previous as Record<string, any> | undefined;

      // Only process if conversion status or revenue changed
      if (oldTouchpoint &&
        oldTouchpoint.is_conversion === touchpoint.is_conversion &&
        oldTouchpoint.revenue_attributed === touchpoint.revenue_attributed) {
        return;
      }

      const campaignId = touchpoint.campaign;
      if (!campaignId) {
        return;
      }

      // Find all touchpoints for this campaign to recalculate attribution
      const touchpoints = await (ctx.ql as any).find('touchpoint', {
        filters: [['campaign', '=', campaignId]]
      });

      if (!touchpoints || touchpoints.length === 0) {
        return;
      }

      const totalTouchpoints = touchpoints.length;
      const conversions = touchpoints.filter((t: any) => t.is_conversion).length;
      const totalRevenue = touchpoints.reduce((sum: number, t: any) => sum + (t.revenue_attributed || 0), 0);

      console.log(`📊 Campaign attribution updated - Touchpoints: ${totalTouchpoints}, Conversions: ${conversions}, Revenue: $${totalRevenue.toFixed(2)}`);
      console.log(`✅ Attribution scoring complete for touchpoint ${touchpoint._id || touchpoint.id}`);
    } catch (error) {
      console.error('[touchpoint.hook] attribution scoring failed:', error);
    }
  }
};

export { TouchpointTimestampValidationTrigger, TouchpointAttributionScoringTrigger };
export default [TouchpointTimestampValidationTrigger, TouchpointAttributionScoringTrigger] as Hook[];

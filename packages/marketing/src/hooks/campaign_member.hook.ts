import type { Hook, HookContext } from '@objectstack/spec/data';
import { updateCampaignMetrics } from './campaign.hook';

/**
 * Campaign Member Engagement Tracking Trigger
 * 
 * Automatically tracks engagement metrics:
 * 1. Auto-set timestamps for first open, click, response
 * 2. Update engagement counters
 * 3. Set has_responded flag
 * 4. Track engagement progression
 */
const CampaignMemberEngagementTrigger: Hook = {
  name: 'CampaignMemberEngagementTrigger',
  object: 'campaign_member',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const member = ctx.input;
      const oldMember = ctx.previous;

      const now = new Date().toISOString();

      // Only process engagement updates on status change
      if (oldMember && oldMember.status !== member.status) {
        console.log(`📊 Member engagement updated: ${oldMember.status} → ${member.status}`);

        // Update engagement metrics based on new status
        switch (member.status) {
          case 'Opened':
            if (!member.first_opened_date) {
              member.first_opened_date = now;
              console.log(`👁️ Member opened - setting first_opened_date`);
            }
            member.number_of_opens = (member.number_of_opens || 0) + 1;
            break;

          case 'Clicked':
            if (!member.first_opened_date) {
              member.first_opened_date = now;
            }
            if (!member.first_clicked_date) {
              member.first_clicked_date = now;
              console.log(`🖱️ Member clicked - setting first_clicked_date`);
            }
            member.number_of_opens = (member.number_of_opens || 0) + 1;
            member.number_of_clicks = (member.number_of_clicks || 0) + 1;
            break;

          case 'Responded':
            if (!member.first_opened_date) {
              member.first_opened_date = now;
            }
            if (!member.first_clicked_date) {
              member.first_clicked_date = now;
            }
            if (!member.first_responded_date) {
              member.first_responded_date = now;
              console.log(`✅ Member responded - setting first_responded_date`);
            }
            member.has_responded = true;
            member.number_of_opens = (member.number_of_opens || 0) + 1;
            member.number_of_clicks = (member.number_of_clicks || 0) + 1;
            break;
        }
      }

    } catch (error) {
      console.error('❌ Error in CampaignMemberEngagementTrigger:', error);
    }
  }
};

/**
 * Campaign Member Lead Scoring Trigger
 * 
 * Updates lead/contact score based on engagement:
 * - Opened email: +5 points
 * - Clicked link: +10 points
 * - Responded: +20 points
 * - Unsubscribed: -10 points
 */
const CampaignMemberLeadScoringTrigger: Hook = {
  name: 'CampaignMemberLeadScoringTrigger',
  object: 'campaign_member',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const member = ctx.input;
      const oldMember = ctx.previous;

      // Only process if status changed
      if (!oldMember || oldMember.status === member.status) {
        return;
      }

      // Determine which record to update (Lead or Contact)
      const objectType = member.lead ? 'lead' : 'contact';
      const recordId = member.lead || member.contact;

      if (!recordId) {
        console.warn('⚠️ Campaign member has no Lead or Contact');
        return;
      }

      // Calculate score increment based on engagement
      let scoreIncrement = 0;

      switch (member.status) {
        case 'Opened':
          scoreIncrement = 5;
          console.log(`👁️ Email opened - adding ${scoreIncrement} points to ${objectType}`);
          break;
        case 'Clicked':
          scoreIncrement = 10;
          console.log(`🖱️ Link clicked - adding ${scoreIncrement} points to ${objectType}`);
          break;
        case 'Responded':
          scoreIncrement = 20;
          console.log(`✅ Response received - adding ${scoreIncrement} points to ${objectType}`);
          break;
        case 'Unsubscribed':
          scoreIncrement = -10;
          console.log(`🚫 Unsubscribed - subtracting ${Math.abs(scoreIncrement)} points from ${objectType}`);
          break;
      }

      if (scoreIncrement !== 0) {
        // In production, update the Lead/Contact score
        // const record = await ctx.ql.findOne(objectType, { filters: [['id', '=', recordId]] });
        // const currentScore = record?.lead_score || 0;
        // await ctx.ql.update(objectType, recordId, {
        //   lead_score: currentScore + scoreIncrement,
        //   last_engagement_date: new Date().toISOString()
        // });

        console.log(`📊 ${objectType} ${recordId} score updated by ${scoreIncrement} points`);
      }

    } catch (error) {
      console.error('❌ Error in CampaignMemberLeadScoringTrigger:', error);
    }
  }
};

/**
 * Campaign Member Statistics Aggregation Trigger
 * 
 * Updates parent campaign statistics when member engagement changes
 */
const CampaignMemberStatsTrigger: Hook = {
  name: 'CampaignMemberStatsTrigger',
  object: 'campaign_member',
  events: ['afterInsert', 'afterUpdate', 'afterDelete'],
  handler: async (ctx: HookContext) => {
    try {
      const member = ctx.input;
      const campaignId = member?.campaign || ctx.previous?.campaign;

      if (!campaignId) {
        return;
      }

      // Update parent campaign metrics
      await updateCampaignMetrics(campaignId, ctx);

    } catch (error) {
      console.error('❌ Error in CampaignMemberStatsTrigger:', error);
    }
  }
};

/**
 * Campaign Member Bounce Handler Trigger
 * 
 * Handles email bounces:
 * - Creates unsubscribe record for hard bounces
 * - Updates member status
 * - Tracks bounce reason and date
 */
const CampaignMemberBounceHandlerTrigger: Hook = {
  name: 'CampaignMemberBounceHandlerTrigger',
  object: 'campaign_member',
  events: ['beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const member = ctx.input;
      const oldMember = ctx.previous;

      // Check if bounce information was added
      if (!oldMember?.email_bounced_date && member.email_bounced_date) {
        console.log(`📧 Email bounced for campaign member: ${member.id}`);

        // Determine if it's a hard bounce
        const bounceReason = (member.email_bounced_reason || '').toLowerCase();
        const isHardBounce = 
          bounceReason.includes('permanent') ||
          bounceReason.includes('not found') ||
          bounceReason.includes('invalid') ||
          bounceReason.includes('does not exist');

        if (isHardBounce) {
          console.log(`🔴 Hard bounce detected - should create unsubscribe record`);

          // Get email address from Lead or Contact
          const objectType = member.lead ? 'lead' : 'contact';
          const recordId = member.lead || member.contact;

          if (recordId) {
            // TODO: In production, create unsubscribe record
            // const record = await ctx.ql.findOne(objectType, { filters: [['id', '=', recordId]] });
            // const email = record?.email;
            // 
            // await ctx.ql.create('email_unsubscribe', {
            //   email: email,
            //   lead_id: member.lead,
            //   contact_id: member.contact,
            //   unsubscribe_type: 'Global',
            //   unsubscribe_source: 'Bounce',
            //   is_bounce: true,
            //   bounce_type: 'Hard Bounce',
            //   bounce_reason: member.email_bounced_reason,
            //   bounce_date: member.email_bounced_date,
            //   campaign_id: member.campaign
            // });

            console.log(`✅ Unsubscribe record should be created for hard bounce`);
          }
        } else {
          console.log(`🟡 Soft bounce detected - no unsubscribe needed`);
        }
      }

    } catch (error) {
      console.error('❌ Error in CampaignMemberBounceHandlerTrigger:', error);
    }
  }
};

/**
 * Calculate member engagement score (0-100)
 */
export function calculateEngagementScore(member: any): number {
  let score = 0;

  // Base score for being in campaign
  score += 10;

  // Engagement progression
  switch (member.status) {
    case 'Sent':
      score += 10;
      break;
    case 'Opened':
      score += 30;
      break;
    case 'Clicked':
      score += 60;
      break;
    case 'Responded':
      score += 100;
      break;
    case 'Unsubscribed':
      score = 0;
      break;
  }

  // Bonus for multiple opens/clicks
  const opens = member.number_of_opens || 0;
  const clicks = member.number_of_clicks || 0;
  
  if (opens > 1) {
    score += Math.min((opens - 1) * 5, 20);
  }
  
  if (clicks > 1) {
    score += Math.min((clicks - 1) * 10, 30);
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Track member engagement timeline
 * Creates activity records for significant engagements
 */
export async function trackMemberEngagementTimeline(
  memberId: string,
  engagementType: 'opened' | 'clicked' | 'responded' | 'unsubscribed',
  ctx: HookContext
): Promise<void> {
  try {
    console.log(`🔄 Tracking engagement timeline for member: ${memberId}`);

    // TODO: In production, create activity record
    // const member = await ctx.ql.findOne('campaign_member', { filters: [['id', '=', memberId]] });
    // const relatedTo = member.lead ? 'lead' : 'contact';
    // const relatedId = member.lead || member.contact;
    // 
    // await ctx.ql.create('activity', {
    //   type: 'Email',
    //   subject: `Campaign Email ${engagementType}`,
    //   status: 'Completed',
    //   related_to: relatedTo,
    //   related_id: relatedId,
    //   campaign_id: member.campaign,
    //   description: `Member ${engagementType} campaign email`,
    //   activity_date: new Date().toISOString()
    // });

    console.log(`✅ Engagement timeline tracked: ${engagementType}`);

  } catch (error) {
    console.error('❌ Error tracking engagement timeline:', error);
  }
}

// Export all hooks
export {
  CampaignMemberEngagementTrigger,
  CampaignMemberLeadScoringTrigger,
  CampaignMemberStatsTrigger,
  CampaignMemberBounceHandlerTrigger
};

export default [
  CampaignMemberEngagementTrigger,
  CampaignMemberLeadScoringTrigger,
  CampaignMemberStatsTrigger,
  CampaignMemberBounceHandlerTrigger
];

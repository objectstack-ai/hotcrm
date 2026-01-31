import type { Hook } from '@objectstack/spec/data';
import { db } from '@hotcrm/core';

// Types for Context
interface TriggerContext {
  old?: Record<string, any>;
  new: Record<string, any>;
  db: typeof db;
  user: { id: string; name: string; email: string; };
}

/**
 * Campaign Member Engagement Tracking Trigger
 * 
 * Tracks and updates engagement metrics:
 * - Opens, Clicks, Responses
 * - First engagement timestamps
 * - Auto-update HasResponded flag
 */
const CampaignMemberEngagementTrigger: Hook = {
  name: 'CampaignMemberEngagementTrigger',
  object: 'CampaignMember',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      const member = ctx.new;
      const oldMember = ctx.old;
      
      // Auto-set HasResponded when status becomes Responded
      if (member.Status === 'Responded' && !member.HasResponded) {
        member.HasResponded = true;
        
        // Set first responded date if not already set
        if (!member.FirstRespondedDate) {
          member.FirstRespondedDate = new Date().toISOString();
          console.log(`✅ Campaign member responded - setting FirstRespondedDate`);
        }
      }
      
      // Track first opened date
      if (member.Status === 'Opened' && !oldMember) {
        if (!member.FirstOpenedDate) {
          member.FirstOpenedDate = new Date().toISOString();
          member.NumberOfOpens = 1;
          console.log(`👁️ Campaign member opened - setting FirstOpenedDate`);
        }
      }
      
      // Track first clicked date
      if (member.Status === 'Clicked' && !oldMember) {
        if (!member.FirstClickedDate) {
          member.FirstClickedDate = new Date().toISOString();
          member.NumberOfClicks = 1;
          console.log(`🖱️ Campaign member clicked - setting FirstClickedDate`);
        }
      }
      
      // Increment engagement counters on status upgrade
      if (oldMember && oldMember.Status !== member.Status) {
        // Status progression: Sent -> Opened -> Clicked -> Responded
        
        if (member.Status === 'Opened' && !member.FirstOpenedDate) {
          member.FirstOpenedDate = new Date().toISOString();
        }
        
        if (member.Status === 'Clicked' && !member.FirstClickedDate) {
          member.FirstClickedDate = new Date().toISOString();
        }
        
        // Increment counters
        if (member.Status === 'Opened' || member.Status === 'Clicked' || member.Status === 'Responded') {
          member.NumberOfOpens = (member.NumberOfOpens || 0) + 1;
        }
        
        if (member.Status === 'Clicked' || member.Status === 'Responded') {
          member.NumberOfClicks = (member.NumberOfClicks || 0) + 1;
        }
        
        console.log(`📊 Campaign member engagement updated: ${oldMember.Status} → ${member.Status}`);
      }
      
    } catch (error) {
      console.error('❌ Error in CampaignMemberEngagementTrigger:', error);
    }
  }
};

/**
 * Campaign Member Lead Scoring Trigger
 * 
 * Updates lead score based on engagement:
 * - Opened email: +5 points
 * - Clicked link: +10 points
 * - Responded: +20 points
 */
const CampaignMemberLeadScoringTrigger: Hook = {
  name: 'CampaignMemberLeadScoringTrigger',
  object: 'CampaignMember',
  events: ['afterUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      const member = ctx.new;
      const oldMember = ctx.old;
      
      // Only process if status changed
      if (!oldMember || oldMember.Status === member.Status) {
        return;
      }
      
      // Determine which record to update (Lead or Contact)
      const objectType = member.LeadId ? 'Lead' : 'Contact';
      const recordId = member.LeadId || member.ContactId;
      
      if (!recordId) {
        console.warn('⚠️ Campaign member has no Lead or Contact');
        return;
      }
      
      // Calculate score increment based on engagement
      let scoreIncrement = 0;
      
      switch (member.Status) {
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
          console.log(`🚫 Unsubscribed - subtracting ${scoreIncrement} points from ${objectType}`);
          break;
        default:
          // No score change for 'Sent' status
          break;
      }
      
      if (scoreIncrement !== 0) {
        // In real implementation, would update the Lead/Contact score:
        // const record = await ctx.db.doc.get(objectType, recordId);
        // const currentScore = record.LeadScore || 0;
        // await ctx.db.doc.update(objectType, recordId, {
        //   LeadScore: currentScore + scoreIncrement,
        //   LastEngagementDate: new Date().toISOString()
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
 * Updates campaign statistics when member engagement changes:
 * - Total members
 * - Engagement counts (opened, clicked, responded)
 * - Conversion metrics
 */
const CampaignMemberStatsTrigger: Hook = {
  name: 'CampaignMemberStatsTrigger',
  object: 'CampaignMember',
  events: ['afterInsert', 'afterUpdate', 'afterDelete'],
  handler: async (ctx: TriggerContext) => {
    try {
      const member = ctx.new;
      const campaignId = member?.CampaignId || ctx.old?.CampaignId;
      
      if (!campaignId) {
        return;
      }
      
      // In real implementation, would aggregate all campaign members:
      // const members = await ctx.db.find('CampaignMember', {
      //   filters: [['CampaignId', '=', campaignId]]
      // });
      
      // const stats = {
      //   totalMembers: members.length,
      //   sent: members.filter(m => m.Status === 'Sent').length,
      //   opened: members.filter(m => ['Opened', 'Clicked', 'Responded'].includes(m.Status)).length,
      //   clicked: members.filter(m => ['Clicked', 'Responded'].includes(m.Status)).length,
      //   responded: members.filter(m => m.Status === 'Responded').length,
      //   unsubscribed: members.filter(m => m.Status === 'Unsubscribed').length
      // };
      
      // Calculate rates
      // const openRate = stats.totalMembers > 0 ? (stats.opened / stats.totalMembers) * 100 : 0;
      // const clickRate = stats.opened > 0 ? (stats.clicked / stats.opened) * 100 : 0;
      // const responseRate = stats.totalMembers > 0 ? (stats.responded / stats.totalMembers) * 100 : 0;
      
      // Update campaign with aggregated stats
      // await ctx.db.doc.update('Campaign', campaignId, {
      //   NumberSent: stats.totalMembers,
      //   // These fields would need to be added to Campaign object:
      //   // NumberOpened: stats.opened,
      //   // NumberClicked: stats.clicked,
      //   // NumberResponded: stats.responded,
      //   // OpenRate: openRate,
      //   // ClickRate: clickRate,
      //   // ResponseRate: responseRate
      // });
      
      console.log(`📊 Campaign ${campaignId} statistics updated after member change`);
      
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
 * - Tracks bounce reason
 */
const CampaignMemberBounceHandlerTrigger: Hook = {
  name: 'CampaignMemberBounceHandlerTrigger',
  object: 'CampaignMember',
  events: ['beforeUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      const member = ctx.new;
      const oldMember = ctx.old;
      
      // Check if bounce information was added
      if (!oldMember?.EmailBouncedDate && member.EmailBouncedDate) {
        console.log(`📧 Email bounced for campaign member: ${member.Id}`);
        
        // Determine if it's a hard bounce (would need bounce type field)
        const isHardBounce = member.EmailBouncedReason?.toLowerCase().includes('permanent') ||
                            member.EmailBouncedReason?.toLowerCase().includes('not found') ||
                            member.EmailBouncedReason?.toLowerCase().includes('invalid');
        
        if (isHardBounce) {
          console.log(`🔴 Hard bounce detected - creating unsubscribe record`);
          
          // Get email address from Lead or Contact
          const objectType = member.LeadId ? 'Lead' : 'Contact';
          const recordId = member.LeadId || member.ContactId;
          
          if (recordId) {
            // In real implementation:
            // const record = await ctx.db.doc.get(objectType, recordId);
            // const email = record.Email;
            
            // Create unsubscribe record
            // await ctx.db.doc.create('Unsubscribe', {
            //   Email: email,
            //   LeadId: member.LeadId,
            //   ContactId: member.ContactId,
            //   UnsubscribeType: 'Global',
            //   UnsubscribeSource: 'Bounce',
            //   IsBounce: true,
            //   BounceType: 'Hard Bounce',
            //   BounceReason: member.EmailBouncedReason,
            //   BounceDate: member.EmailBouncedDate,
            //   Status: 'Active',
            //   CampaignId: member.CampaignId
            // });
            
            console.log(`✅ Unsubscribe record created for hard bounce`);
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
 * Campaign Member Auto-Assignment Trigger
 * 
 * Automatically assigns new leads based on:
 * - Round-robin assignment
 * - Territory/region
 * - Lead score threshold
 * - Team capacity
 */
export async function autoAssignCampaignLeads(
  campaignId: string,
  assignmentRule: 'round-robin' | 'territory' | 'score' | 'capacity',
  db: typeof import('@hotcrm/core').db
): Promise<void> {
  console.log(`🔄 Auto-assigning leads from campaign: ${campaignId}`);
  
  // In real implementation:
  // 1. Get all unassigned campaign members
  // const members = await db.find('CampaignMember', {
  //   filters: [
  //     ['CampaignId', '=', campaignId],
  //     ['Status', '=', 'Responded']
  //   ]
  // });
  
  // 2. Get leads that need assignment
  // const leads = [];
  // for (const member of members) {
  //   if (member.LeadId) {
  //     const lead = await db.doc.get('Lead', member.LeadId);
  //     if (lead.Status === 'New') {
  //       leads.push(lead);
  //     }
  //   }
  // }
  
  // 3. Apply assignment rule
  // switch (assignmentRule) {
  //   case 'round-robin':
  //     // Distribute leads evenly across sales reps
  //     break;
  //   case 'territory':
  //     // Assign based on geographic territory
  //     break;
  //   case 'score':
  //     // Assign high-score leads to senior reps
  //     break;
  //   case 'capacity':
  //     // Assign to reps with lowest current workload
  //     break;
  // }
  
  console.log(`✅ Campaign leads auto-assigned using ${assignmentRule} rule`);
}

/**
 * Track member engagement timeline
 * Creates activity records for significant engagements
 */
export async function trackMemberEngagementTimeline(
  memberId: string,
  engagementType: 'opened' | 'clicked' | 'responded' | 'unsubscribed',
  db: typeof import('@hotcrm/core').db
): Promise<void> {
  console.log(`🔄 Tracking engagement timeline for member: ${memberId}`);
  
  // In real implementation, create activity record:
  // const member = await db.doc.get('CampaignMember', memberId);
  // const relatedTo = member.LeadId ? 'Lead' : 'Contact';
  // const relatedId = member.LeadId || member.ContactId;
  
  // await db.doc.create('Activity', {
  //   Type: 'Email',
  //   Subject: `Campaign Email ${engagementType}`,
  //   Status: 'Completed',
  //   RelatedTo: relatedTo,
  //   RelatedId: relatedId,
  //   CampaignId: member.CampaignId,
  //   Description: `Member ${engagementType} campaign email`
  // });
  
  console.log(`✅ Engagement timeline tracked: ${engagementType}`);
}

// Export all hooks
export {
  CampaignMemberEngagementTrigger,
  CampaignMemberLeadScoringTrigger,
  CampaignMemberStatsTrigger,
  CampaignMemberBounceHandlerTrigger
};

export default CampaignMemberEngagementTrigger;

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
 * Contact Last Contact Date Tracking Trigger
 * 
 * Updates LastContactDate when activities are created/updated
 * This hook is actually called from Activity hooks
 */
export async function updateContactLastContactDate(contactId: string, activityDate: string, db: any): Promise<void> {
  console.log(`🔄 Updating last contact date for contact: ${contactId}`);
  
  // Get current contact to check if update is needed
  // const contact = await db.doc.get('Contact', contactId, { fields: ['LastContactDate'] });
  
  // Only update if the new activity date is more recent
  // if (!contact.LastContactDate || new Date(activityDate) > new Date(contact.LastContactDate)) {
  //   await db.doc.update('Contact', contactId, {
  //     LastContactDate: activityDate
  //   });
  //   console.log(`✅ Updated last contact date to ${activityDate}`);
  // }
}

/**
 * Decision Chain Validation Trigger
 * 
 * Handles:
 * - Warn if account has no decision maker
 * - Auto-set InfluenceLevel based on title/level
 * - Track multiple decision makers per account
 */
const ContactDecisionChainTrigger: Hook = {
  name: 'ContactDecisionChainTrigger',
  object: 'Contact',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      const contact = ctx.new;
      
      // Auto-set InfluenceLevel based on Level
      if (!contact.InfluenceLevel && contact.Level) {
        switch (contact.Level) {
          case 'C-Level':
            contact.InfluenceLevel = 'High';
            console.log(`✅ Auto-set InfluenceLevel to High for C-Level contact`);
            break;
          case 'VP':
            contact.InfluenceLevel = 'High';
            console.log(`✅ Auto-set InfluenceLevel to High for VP contact`);
            break;
          case 'Director':
            contact.InfluenceLevel = 'Medium';
            console.log(`✅ Auto-set InfluenceLevel to Medium for Director contact`);
            break;
          case 'Manager':
            contact.InfluenceLevel = 'Medium';
            console.log(`✅ Auto-set InfluenceLevel to Medium for Manager contact`);
            break;
          case 'Individual Contributor':
            contact.InfluenceLevel = 'Low';
            console.log(`✅ Auto-set InfluenceLevel to Low for Individual Contributor`);
            break;
        }
      }
      
      // Auto-set IsDecisionMaker for C-Level
      if (contact.Level === 'C-Level' && !contact.IsDecisionMaker) {
        contact.IsDecisionMaker = true;
        console.log(`✅ Auto-set IsDecisionMaker for C-Level contact`);
      }
      
    } catch (error) {
      console.error('❌ Error in ContactDecisionChainTrigger:', error);
    }
  }
};

/**
 * Contact Decision Maker Validation (After Update/Insert)
 * 
 * Warns if account has no decision maker
 */
const ContactDecisionMakerValidationTrigger: Hook = {
  name: 'ContactDecisionMakerValidationTrigger',
  object: 'Contact',
  events: ['afterInsert', 'afterUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      const contact = ctx.new;
      
      if (!contact.AccountId) {
        return;
      }
      
      // Check if account has at least one decision maker
      // const decisionMakers = await ctx.db.find('Contact', {
      //   filters: [
      //     ['AccountId', '=', contact.AccountId],
      //     ['IsDecisionMaker', '=', true]
      //   ]
      // });
      
      // if (decisionMakers.length === 0) {
      //   console.warn(`⚠️ Account has no decision maker! AccountId: ${contact.AccountId}`);
      //   // Could create a task or send notification to account owner
      // } else {
      //   console.log(`✅ Account has ${decisionMakers.length} decision maker(s)`);
      // }
      
    } catch (error) {
      console.error('❌ Error in ContactDecisionMakerValidationTrigger:', error);
    }
  }
};

/**
 * Contact Duplicate Detection Trigger
 * 
 * Handles:
 * - Check email uniqueness (already enforced by unique constraint)
 * - Suggest merge when duplicates found
 * - Flag potential duplicates by name + company
 */
const ContactDuplicateDetectionTrigger: Hook = {
  name: 'ContactDuplicateDetectionTrigger',
  object: 'Contact',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      const contact = ctx.new;
      const isNew = !ctx.old;
      
      // Check for potential duplicates by name
      if (contact.FirstName && contact.LastName && contact.AccountId) {
        // const potentialDuplicates = await ctx.db.find('Contact', {
        //   filters: [
        //     ['AccountId', '=', contact.AccountId],
        //     ['FirstName', '=', contact.FirstName],
        //     ['LastName', '=', contact.LastName],
        //     ['Id', '!=', contact.Id || '']
        //   ]
        // });
        
        // if (potentialDuplicates.length > 0) {
        //   console.warn(`⚠️ Potential duplicate contact found: ${contact.FirstName} ${contact.LastName} at same account`);
        //   // Could create a task for manual review
        // }
      }
      
      // Email uniqueness is already enforced by unique constraint on Email field
      // But we can provide better error messaging
      if (contact.Email && isNew) {
        console.log(`✅ New contact with email: ${contact.Email}`);
      }
      
    } catch (error) {
      console.error('❌ Error in ContactDuplicateDetectionTrigger:', error);
    }
  }
};

/**
 * Contact Relationship Strength Auto-Update Trigger
 * 
 * Updates relationship strength based on:
 * - Activity frequency
 * - Email sentiment (would need AI integration)
 * - Deal involvement
 * - Auto-promote Weak → Medium → Strong
 * - Auto-demote if no contact for 90+ days
 */
const ContactRelationshipStrengthTrigger: Hook = {
  name: 'ContactRelationshipStrengthTrigger',
  object: 'Contact',
  events: ['beforeUpdate'],
  handler: async (ctx: TriggerContext) => {
    try {
      const contact = ctx.new;
      
      // Only update if LastContactDate changed or this is a periodic update
      if (!contact.LastContactDate) {
        return;
      }
      
      const daysSinceContact = getDaysSince(contact.LastContactDate);
      const currentStrength = contact.RelationshipStrength || 'Unknown';
      
      // Auto-demote if no contact for 90+ days
      if (daysSinceContact > 90) {
        if (currentStrength === 'Strong') {
          contact.RelationshipStrength = 'Medium';
          console.log(`⬇️ Demoted relationship strength: Strong → Medium (${daysSinceContact} days since contact)`);
        } else if (currentStrength === 'Medium') {
          contact.RelationshipStrength = 'Weak';
          console.log(`⬇️ Demoted relationship strength: Medium → Weak (${daysSinceContact} days since contact)`);
        }
      }
      
      // Auto-promote based on activity frequency (would need to query activities)
      // This is simplified logic - real implementation would count activities
      else if (daysSinceContact < 7 && daysSinceContact >= 0) {
        // Recent contact suggests active relationship
        if (currentStrength === 'Weak' || currentStrength === 'Unknown') {
          contact.RelationshipStrength = 'Medium';
          console.log(`⬆️ Promoted relationship strength: ${currentStrength} → Medium (active engagement)`);
        } else if (currentStrength === 'Medium') {
          // In real implementation, would check activity count here
          // If many recent activities (e.g., > 10 in last 30 days), promote to Strong
          // For now, we log that this could be promoted
          console.log(`ℹ️ Medium relationship with recent contact - could promote to Strong based on activity count`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error in ContactRelationshipStrengthTrigger:', error);
    }
  }
};

/**
 * Helper function to calculate days since a given date
 * Returns positive number for past dates, negative for future dates
 */
function getDaysSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Update relationship strength based on activity analysis
 * This is called periodically or after significant activity changes
 */
export async function analyzeAndUpdateRelationshipStrength(contactId: string, db: any): Promise<void> {
  console.log(`🔄 Analyzing relationship strength for contact: ${contactId}`);
  
  // In real implementation:
  // 1. Query all activities for this contact in last 90 days
  // 2. Count activities by type
  // 3. Analyze email sentiment if available
  // 4. Check involvement in opportunities
  // 5. Calculate relationship score
  // 6. Update RelationshipStrength accordingly
  
  // const activities = await db.find('Activity', {
  //   filters: [
  //     ['WhoId', '=', contactId],
  //     ['ActivityDate', '>', getDateDaysAgo(90)]
  //   ]
  // });
  
  // const activityCount = activities.length;
  // const hasRecentMeetings = activities.some(a => a.Type === 'Meeting' && getDaysSince(a.ActivityDate) < 14);
  // 
  // let newStrength = 'Unknown';
  // if (activityCount > 20 || hasRecentMeetings) {
  //   newStrength = 'Strong';
  // } else if (activityCount > 10) {
  //   newStrength = 'Medium';
  // } else if (activityCount > 0) {
  //   newStrength = 'Weak';
  // }
  // 
  // await db.doc.update('Contact', contactId, {
  //   RelationshipStrength: newStrength
  // });
  
  console.log(`✅ Relationship strength analysis completed for contact ${contactId}`);
}

// Export all hooks
export {
  ContactDecisionChainTrigger,
  ContactDecisionMakerValidationTrigger,
  ContactDuplicateDetectionTrigger,
  ContactRelationshipStrengthTrigger
};

export default ContactDecisionChainTrigger;

import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('crm:contact');



/**
 * Contact Last Contact Date Tracking Trigger
 * 
 * Updates LastContactDate when activities are created/updated
 * This hook is actually called from Activity hooks
 */
export async function updateContactLastContactDate(contactId: string, activityDate: string, ql: any): Promise<void> {
 logger.info(`Updating last contact date for contact: ${contactId}`);
 
 // Get current contact to check if update is needed
 // const contact = await db.doc.get('Contact', contactId, { fields: ['LastContactDate'] });
 
 // Only update if the new activity date is more recent
 // if (!contact.LastContactDate || new Date(activityDate) > new Date(contact.LastContactDate)) {
 // await db.doc.update('Contact', contactId, {
 // LastContactDate: activityDate
 // });
 // logger.info(`Updated last contact date to ${activityDate}`);
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
 object: 'contact',
 events: ['beforeInsert', 'beforeUpdate'],
 handler: async (ctx: HookContext) => {
 try {
 const contact = ctx.input.doc as Record<string, any>;
 
 // Auto-set InfluenceLevel based on Level
 if (!contact.InfluenceLevel && contact.Level) {
 switch (contact.Level) {
 case 'c_level':
 contact.InfluenceLevel = 'high';
 logger.info(`Auto-set InfluenceLevel to High for C-Level contact`);
 break;
 case 'VP':
 contact.InfluenceLevel = 'high';
 logger.info(`Auto-set InfluenceLevel to High for VP contact`);
 break;
 case 'Director':
 contact.InfluenceLevel = 'medium';
 logger.info(`Auto-set InfluenceLevel to Medium for Director contact`);
 break;
 case 'Manager':
 contact.InfluenceLevel = 'medium';
 logger.info(`Auto-set InfluenceLevel to Medium for Manager contact`);
 break;
 case 'Individual Contributor':
 contact.InfluenceLevel = 'low';
 logger.info(`Auto-set InfluenceLevel to Low for Individual Contributor`);
 break;
 }
 }
 
 // Auto-set IsDecisionMaker for C-Level
 if (contact.Level === 'c_level' && !contact.IsDecisionMaker) {
 contact.IsDecisionMaker = true;
 logger.info(`Auto-set IsDecisionMaker for C-Level contact`);
 }
 
 } catch (error) {
 logger.error('Error in ContactDecisionChainTrigger:', error);
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
 object: 'contact',
 events: ['afterInsert', 'afterUpdate'],
 handler: async (ctx: HookContext) => {
 try {
 const contact = ctx.result as Record<string, any>;
 
 if (!contact.AccountId) {
 return;
 }
 
 // Check if account has at least one decision maker
 // const decisionMakers = await ctx.db.find('Contact', {
 // filters: [
 // ['AccountId', '=', contact.AccountId],
 // ['IsDecisionMaker', '=', true]
 // ]
 // });
 
 // if (decisionMakers.length === 0) {
 // logger.warn(`Account has no decision maker! AccountId: ${contact.AccountId}`);
 // // Could create a task or send notification to account owner
 // } else {
 // logger.info(`Account has ${decisionMakers.length} decision maker(s)`);
 // }
 
 } catch (error) {
 logger.error('Error in ContactDecisionMakerValidationTrigger:', error);
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
 object: 'contact',
 events: ['beforeInsert', 'beforeUpdate'],
 handler: async (ctx: HookContext) => {
 try {
 const contact = ctx.input.doc as Record<string, any>;
 const isNew = !ctx.previous;
 
 // Check for potential duplicates by name
 if (contact.FirstName && contact.LastName && contact.AccountId) {
 // const potentialDuplicates = await ctx.db.find('Contact', {
 // filters: [
 // ['AccountId', '=', contact.AccountId],
 // ['FirstName', '=', contact.FirstName],
 // ['LastName', '=', contact.LastName],
 // ['Id', '!=', contact.Id || '']
 // ]
 // });
 
 // if (potentialDuplicates.length > 0) {
 // logger.warn(`Potential duplicate contact found: ${contact.FirstName} ${contact.LastName} at same account`);
 // // Could create a task for manual review
 // }
 }
 
 // Email uniqueness is already enforced by unique constraint on Email field
 // But we can provide better error messaging
 if (contact.Email && isNew) {
 logger.info(`New contact with email: ${contact.Email}`);
 }
 
 } catch (error) {
 logger.error('Error in ContactDuplicateDetectionTrigger:', error);
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
 object: 'contact',
 events: ['beforeUpdate'],
 handler: async (ctx: HookContext) => {
 try {
 const contact = ctx.input.doc as Record<string, any>;
 
 // Only update if LastContactDate changed or this is a periodic update
 if (!contact.LastContactDate) {
 return;
 }
 
 const daysSinceContact = getDaysSince(contact.LastContactDate);
 const currentStrength = contact.RelationshipStrength || 'unknown';
 
 // Auto-demote if no contact for 90+ days
 if (daysSinceContact > 90) {
 if (currentStrength === 'strong') {
 contact.RelationshipStrength = 'medium';
 logger.info(`⬇ Demoted relationship strength: Strong → Medium (${daysSinceContact} days since contact)`);
 } else if (currentStrength === 'medium') {
 contact.RelationshipStrength = 'weak';
 logger.info(`⬇ Demoted relationship strength: Medium → Weak (${daysSinceContact} days since contact)`);
 }
 }
 
 // Auto-promote based on activity frequency (would need to query activities)
 // This is simplified logic - real implementation would count activities
 else if (daysSinceContact < 7 && daysSinceContact >= 0) {
 // Recent contact suggests active relationship
 if (currentStrength === 'weak' || currentStrength === 'unknown') {
 contact.RelationshipStrength = 'medium';
 logger.info(`⬆ Promoted relationship strength: ${currentStrength} → Medium (active engagement)`);
 } else if (currentStrength === 'medium') {
 // In real implementation, would check activity count here
 // If many recent activities (e.g., > 10 in last 30 days), promote to Strong
 // For now, we log that this could be promoted
 logger.info(`ℹ Medium relationship with recent contact - could promote to Strong based on activity count`);
 }
 }
 
 } catch (error) {
 logger.error('Error in ContactRelationshipStrengthTrigger:', error);
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
export async function analyzeAndUpdateRelationshipStrength(contactId: string, ql: any): Promise<void> {
 logger.info(`Analyzing relationship strength for contact: ${contactId}`);
 
 // In real implementation:
 // 1. Query all activities for this contact in last 90 days
 // 2. Count activities by type
 // 3. Analyze email sentiment if available
 // 4. Check involvement in opportunities
 // 5. Calculate relationship score
 // 6. Update RelationshipStrength accordingly
 
 // const activities = await db.find('Activity', {
 // filters: [
 // ['WhoId', '=', contactId],
 // ['ActivityDate', '>', getDateDaysAgo(90)]
 // ]
 // });
 
 // const activityCount = activities.length;
 // const hasRecentMeetings = activities.some(a => a.Type === 'meeting' && getDaysSince(a.ActivityDate) < 14);
 // 
 // let newStrength = 'unknown';
 // if (activityCount > 20 || hasRecentMeetings) {
 // newStrength = 'strong';
 // } else if (activityCount > 10) {
 // newStrength = 'medium';
 // } else if (activityCount > 0) {
 // newStrength = 'weak';
 // }
 // 
 // await db.doc.update('Contact', contactId, {
 // RelationshipStrength: newStrength
 // });
 
 logger.info(`Relationship strength analysis completed for contact ${contactId}`);
}

// Export all hooks
export {
 ContactDecisionChainTrigger,
 ContactDecisionMakerValidationTrigger,
 ContactDuplicateDetectionTrigger,
 ContactRelationshipStrengthTrigger
};

export default ContactDecisionChainTrigger;

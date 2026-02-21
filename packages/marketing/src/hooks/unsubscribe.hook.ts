import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('marketing:unsubscribe');

/**
 * Unsubscribe Compliance Trigger
 * 
 * After an unsubscribe record is created, find all active marketing_list
 * memberships for the email/contact and update them to inactive status.
 * Enforces CAN-SPAM/GDPR compliance.
 */
const UnsubscribeComplianceTrigger: Hook = {
 name: 'UnsubscribeComplianceTrigger',
 object: 'unsubscribe',
 events: ['afterInsert'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.result as Record<string, any>;
 try {
 const email = doc.email;
 const contactId = doc.contact_id;

 // Find all active marketing lists that have this email/contact as members
 const filters: any[][] = [['status', '=', 'active']];

 const activeLists = await (ctx.ql as any).find('marketing_list', {
 filters
 });

 if (!activeLists || activeLists.length === 0) {
 logger.info(`No active marketing lists found for suppression`);
 return;
 }

 let suppressedCount = 0;

 for (const list of activeLists) {
 const listId = list._id || list.id;
 let listSuppressedCount = 0;

 // Build membership query filters
 const memberFilters: any[][] = [];

 if (email) {
 memberFilters.push(['email', '=', email]);
 } else if (contactId) {
 memberFilters.push(['contact', '=', contactId]);
 }

 if (memberFilters.length === 0) continue;

 // Find campaign members linked to this list's campaign
 if (list.campaign_id) {
 const members = await (ctx.ql as any).find('campaign_member', {
 filters: [
 ['campaign', '=', list.campaign_id],
 ...memberFilters
 ]
 });

 if (members && members.length > 0) {
 for (const member of members) {
 const memberId = member._id || member.id;
 await (ctx.ql as any).doc.update('campaign_member', memberId, {
 status: 'unsubscribed'
 });
 listSuppressedCount++;
 suppressedCount++;
 }
 }
 }

 // Update marketing list unsubscribed member count with actual suppressed count
 if (listSuppressedCount > 0) {
 await (ctx.ql as any).doc.update('marketing_list', listId, {
 unsubscribed_members: (list.unsubscribed_members || 0) + listSuppressedCount
 });
 }
 }

 logger.info(`CAN-SPAM/GDPR compliance: suppressed ${suppressedCount} memberships for ${email || contactId}`);
 logger.info(`Unsubscribe suppression completed for record ${doc._id || doc.id}`);

 } catch (err) {
 logger.error('Error in UnsubscribeComplianceTrigger:', err);
 }
 }
};

/**
 * Unsubscribe Validation Trigger
 * 
 * Validates unsubscribe records before insert/update:
 * - Either email or contact_id must be provided
 * - Auto-set unsubscribe_date to current date if not provided
 * - Validate that unsubscribe_reason is provided
 */
const UnsubscribeValidationTrigger: Hook = {
 name: 'UnsubscribeValidationTrigger',
 object: 'unsubscribe',
 events: ['beforeInsert', 'beforeUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;
 try {
 // Validate that either email or contact_id is provided
 if (!doc.email && !doc.contact_id) {
 throw new Error('Either email or contact_id must be provided for an unsubscribe record');
 }

 // Auto-set unsubscribe_date if not provided
 if (!doc.unsubscribe_date) {
 doc.unsubscribe_date = new Date().toISOString();
 logger.info(`Auto-set unsubscribe_date to ${doc.unsubscribe_date}`);
 }

 // Validate reason is provided
 if (!doc.unsubscribe_reason) {
 throw new Error('Unsubscribe reason is required for compliance tracking');
 }

 } catch (err) {
 logger.error('Error in UnsubscribeValidationTrigger:', err);
 throw err;
 }
 }
};

/**
 * Global Suppression Trigger
 * 
 * When unsubscribe_type is 'global', log that the contact is globally
 * suppressed from all marketing communications.
 */
const GlobalSuppressionTrigger: Hook = {
 name: 'GlobalSuppressionTrigger',
 object: 'unsubscribe',
 events: ['afterInsert'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.result as Record<string, any>;
 try {
 if (doc.unsubscribe_type !== 'global') {
 return;
 }

 const identifier = doc.email || doc.contact_id;
 logger.info(`🌐 GLOBAL SUPPRESSION: Contact ${identifier} is now globally suppressed from all marketing communications`);
 logger.info(`🔒 Suppression details - Source: ${doc.unsubscribe_source || 'unknown'}, GDPR: ${doc.is_gdpr_request ? 'Yes' : 'No'}, Date: ${doc.unsubscribe_date}`);

 } catch (err) {
 logger.error('Error in GlobalSuppressionTrigger:', err);
 }
 }
};

export {
 UnsubscribeComplianceTrigger,
 UnsubscribeValidationTrigger,
 GlobalSuppressionTrigger
};

export default [
 UnsubscribeComplianceTrigger,
 UnsubscribeValidationTrigger,
 GlobalSuppressionTrigger
] as Hook[];

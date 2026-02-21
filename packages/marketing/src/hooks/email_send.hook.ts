import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('marketing:email_send');

/**
 * Email Send Tracking Trigger
 * 
 * When email_send status changes (e.g., to 'opened', 'clicked', 'bounced'):
 * - Update campaign metrics by finding the linked campaign and incrementing counters
 * - Calculate campaign open_rate, click_rate, bounce_rate
 * - Log the engagement event
 */
const EmailSendTrackingTrigger: Hook = {
 name: 'EmailSendTrackingTrigger',
 object: 'email_send',
 events: ['afterUpdate'],
 handler: async (ctx: HookContext) => {
 try {
 const emailSend = ctx.result as Record<string, any>;
 const oldEmailSend = ctx.previous as Record<string, any> | undefined;

 // Only process if status changed
 if (!oldEmailSend || oldEmailSend.status === emailSend.status) {
 return;
 }

 logger.info(`Email send status changed: ${oldEmailSend.status} → ${emailSend.status}`);

 const campaignId = emailSend.campaign;
 if (!campaignId) {
 return;
 }

 // Find all email sends for this campaign to recalculate metrics
 const emailSends = await (ctx.ql as any).find('email_send', {
 filters: [['campaign', '=', campaignId]]
 });

 if (!emailSends || emailSends.length === 0) {
 return;
 }

 const totalSends = emailSends.length;
 const opened = emailSends.filter((s: any) =>
 ['opened', 'clicked'].includes(s.status)
 ).length;
 const clicked = emailSends.filter((s: any) => s.status === 'clicked').length;
 const bounced = emailSends.filter((s: any) => s.status === 'bounced').length;

 const openRate = totalSends > 0 ? (opened / totalSends) * 100 : 0;
 const clickRate = totalSends > 0 ? (clicked / totalSends) * 100 : 0;
 const bounceRate = totalSends > 0 ? (bounced / totalSends) * 100 : 0;

 await (ctx.ql as any).doc.update('campaign', campaignId, {
 total_sent: totalSends,
 total_opened: opened,
 total_clicked: clicked,
 total_bounced: bounced,
 open_rate: openRate,
 click_rate: clickRate,
 bounce_rate: bounceRate
 });

 logger.info(`Campaign metrics updated - Open: ${openRate.toFixed(1)}%, Click: ${clickRate.toFixed(1)}%, Bounce: ${bounceRate.toFixed(1)}%`);
 logger.info(`Engagement event logged: ${emailSend.status} for email send ${emailSend._id || emailSend.id}`);

 } catch (error) {
 logger.error(`[email_send.hook] tracking failed:`, error);
 }
 }
};

/**
 * Email Send Validation Trigger
 * 
 * Validates email send before insert:
 * - recipient_email must be a valid format
 * - Check unsubscribe list for the recipient
 * - If unsubscribed, reject the send (set status to 'failed' with reason)
 * - Set tracking_id if not provided
 */
const EmailSendValidationTrigger: Hook = {
 name: 'EmailSendValidationTrigger',
 object: 'email_send',
 events: ['beforeInsert'],
 handler: async (ctx: HookContext) => {
 try {
 const emailSend = ctx.input.doc as Record<string, any>;

 // Validate recipient_email format
 const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 if (!emailSend.recipient_email || !emailRegex.test(emailSend.recipient_email)) {
 logger.error(`Invalid recipient email: ${emailSend.recipient_email}`);
 emailSend.status = 'failed';
 emailSend.failure_reason = 'Invalid recipient email format';
 return;
 }

 // Check unsubscribe list
 const unsubscribes = await (ctx.ql as any).find('unsubscribe', {
 filters: [['email', '=', emailSend.recipient_email]]
 });

 if (unsubscribes && unsubscribes.length > 0) {
 logger.info(`🚫 Recipient ${emailSend.recipient_email} is unsubscribed - rejecting send`);
 emailSend.status = 'failed';
 emailSend.failure_reason = 'Recipient has unsubscribed';
 return;
 }

 // Set tracking_id if not provided
 if (!emailSend.tracking_id) {
 emailSend.tracking_id = `trk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
 logger.info(`🔗 Generated tracking ID: ${emailSend.tracking_id}`);
 }

 } catch (error) {
 logger.error(`[email_send.hook] validation failed:`, error);
 }
 }
};

// Export all hooks
export {
 EmailSendTrackingTrigger,
 EmailSendValidationTrigger
};

export default [
 EmailSendTrackingTrigger,
 EmailSendValidationTrigger
] as Hook[];

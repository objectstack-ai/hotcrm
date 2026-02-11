/**
 * @hotcrm/marketing - Marketing Cloud Module
 * 
 * This package contains all marketing-related business objects:
 * - Campaign: Marketing campaign management
 * - CampaignMember: Links leads/contacts to campaigns
 * - EmailTemplate: Email template library with personalization
 * - LandingPage: Landing page builder for lead capture
 * - Form: Form builder with auto-lead creation
 * - MarketingList: Marketing list/segment management
 * - Unsubscribe: Unsubscribe and bounce management
 */

// Export Campaign objects
export { Campaign } from './campaign.object';
export { CampaignMember } from './campaign_member.object';

// Export Marketing Automation objects
export { EmailTemplate } from './email_template.object';
export { LandingPage } from './landing_page.object';
export { Form } from './form.object';
export { MarketingList } from './marketing_list.object';
export { Unsubscribe } from './unsubscribe.object';
export { AutomationWorkflow } from './automation_workflow.object';
export { EmailSend } from './email_send.object';
export { LeadNurtureProgram } from './lead_nurture_program.object';
export { Touchpoint } from './touchpoint.object';

// Export Hooks
export { default as CampaignROIHook } from './hooks/roi.hook';

// Export plugin definition
export { default as MarketingPlugin } from './plugin';


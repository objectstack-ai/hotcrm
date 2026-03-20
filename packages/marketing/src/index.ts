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
export { Campaign } from './campaign.object.js';
export { CampaignMember } from './campaign_member.object.js';

// Export Marketing Automation objects
export { EmailTemplate } from './email_template.object.js';
export { LandingPage } from './landing_page.object.js';
export { Form } from './form.object.js';
export { MarketingList } from './marketing_list.object.js';
export { Unsubscribe } from './unsubscribe.object.js';
export { AutomationWorkflow } from './automation_workflow.object.js';
export { EmailSend } from './email_send.object.js';
export { LeadNurtureProgram } from './lead_nurture_program.object.js';
export { Touchpoint } from './touchpoint.object.js';

// Export Hooks
export { default as CampaignROIHook } from './hooks/roi.hook.js';

// Export plugin definition
export { default as MarketingPlugin } from './plugin.js';

// Export translations
export { MarketingTranslations } from './translations/index.js';

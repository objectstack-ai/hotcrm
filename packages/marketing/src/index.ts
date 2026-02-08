/**
 * @hotcrm/marketing - Marketing Module
 * 
 * This package contains all marketing-related business objects:
 * 
 * **Campaign Management:**
 * - Campaign: Marketing campaign management
 * - CampaignMember: Links leads/contacts to campaigns
 * 
 * **Marketing Automation:**
 * - EmailTemplate: Email template library with personalization and A/B testing
 * - LandingPage: Landing page builder for lead capture
 * - Form: Form builder with auto-lead creation
 * - MarketingList: Marketing list/segment management
 * - Unsubscribe: Unsubscribe and bounce management
 */

export { Campaign } from './campaign.object';
export { CampaignMember } from './campaign_member.object';
export { EmailTemplate } from './email_template.object';
export { LandingPage } from './landing_page.object';
export { Form } from './form.object';
export { MarketingList } from './marketing_list.object';
export { Unsubscribe } from './unsubscribe.object';

// Export Hooks
export { default as CampaignROIHook } from './hooks/roi.hook';

// Export plugin definition
export { default as MarketingPlugin } from './plugin';

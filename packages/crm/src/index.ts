/**
 * @hotcrm/crm - CRM Module
 * 
 * This package contains all CRM-related business objects, hooks, and actions:
 * 
 * **Objects:**
 * - Account: Customer account management
 * - Contact: Contact information and relationships
 * - Lead: Lead management and qualification
 * - Opportunity: Sales opportunity and pipeline management
 * - Campaign: Marketing campaign tracking
 * - CampaignMember: Campaign member engagement tracking
 * - Activity: Activity logging and tracking
 * 
 * **Marketing Automation Objects:**
 * - EmailTemplate: Email template library with personalization
 * - LandingPage: Landing page builder for lead capture
 * - Form: Form builder with auto-lead creation
 * - MarketingList: Marketing list/segment management
 * - Unsubscribe: Unsubscribe and bounce management
 * 
 * **Hooks:**
 * - Campaign hooks: ROI calculation, performance tracking
 * - CampaignMember hooks: Engagement tracking, lead scoring
 * - Opportunity hooks: Stage change automation, contract creation
 * 
 * **Actions:**
 * - AI Smart Briefing: Account analysis and insights
 */

// Export CRM objects
export { default as Account } from './account.object';
export { default as Activity } from './activity.object';
export { default as Contact } from './contact.object';
export { default as Lead } from './lead.object';
export { default as Opportunity } from './opportunity.object';
export { default as Task } from './task.object';
export { default as Note } from './note.object';
export { default as AssignmentRule } from './assignment_rule.object';

// Export marketing automation objects
export { default as EmailTemplate } from './email_template.object';
export { default as LandingPage } from './landing_page.object';
export { default as Form } from './form.object';
export { default as MarketingList } from './marketing_list.object';
export { default as Unsubscribe } from './unsubscribe.object';

// Export hooks
export * from './hooks/lead.hook';
export * from './hooks/opportunity.hook';


// Export actions
export * from './actions/ai_smart_briefing.action';
export { default as LeadConvertAction } from './actions/lead_convert.action';

// Export plugin definition
export { default as CRMPlugin } from './plugin';

// Note: YAML files (Campaign) are kept for backward compatibility
// TypeScript definitions are preferred as per the custom instructions

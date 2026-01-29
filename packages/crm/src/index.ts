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
 * - Activity: Activity logging and tracking
 * 
 * **Hooks:**
 * - Opportunity hooks: Stage change automation, contract creation
 * 
 * **Actions:**
 * - AI Smart Briefing: Account analysis and insights
 */

// Export business objects
export { default as Account } from './account.object';
export { default as Activity } from './activity.object';
export { default as Contact } from './contact.object';
export { default as Lead } from './lead.object';
export { default as Opportunity } from './opportunity.object';

// Export hooks
export * from './hooks/lead.hook';
export * from './hooks/opportunity.hook';

// Export actions
export * from './actions/ai_smart_briefing.action';

// Note: YAML files (Campaign) are kept for backward compatibility
// TypeScript definitions are preferred as per the custom instructions

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
export * from './account.object';
export * from './contact.object';
export * from './opportunity.object';

// Export hooks
export * from './hooks/opportunity.hook';

// Export actions
export * from './actions/ai_smart_briefing.action';

// Note: YAML files (Lead, Campaign, Activity) are kept for reference
// TypeScript definitions are preferred as per the custom instructions

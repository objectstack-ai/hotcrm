/**
 * @hotcrm/crm - Sales Cloud Module
 * 
 * This package contains all core CRM/Sales business objects, hooks, and actions:
 * 
 * **Objects:**
 * - Account: Customer account management
 * - Contact: Contact information and relationships
 * - Lead: Lead management and qualification
 * - Opportunity: Sales opportunity and pipeline management
 * - Activity: Activity logging and tracking
 * - Task: Task management
 * - Note: Notes and collaboration
 * - AssignmentRule: Auto-assignment rules
 * 
 * **Hooks:**
 * - Lead hooks: Scoring, status change automation
 * - Opportunity hooks: Stage change automation, contract creation
 * 
 * **Actions:**
 * - AI Smart Briefing: Account analysis and insights
 * - Lead Convert: Lead to Account/Contact/Opportunity conversion
 * - Sales Performance: Sales metrics and analytics
 */

// Export CRM objects
export { Account } from './account.object.js';
export { Activity } from './activity.object.js';
export { Contact } from './contact.object.js';
export { Lead } from './lead.object.js';
export { Opportunity } from './opportunity.object.js';
export { Task } from './task.object.js';
export { Note } from './note.object.js';
export { AssignmentRule } from './assignment_rule.object.js';


// Export hooks
export * from './hooks/lead.hook.js';
export * from './hooks/opportunity.hook.js';


// Export actions
export * from './actions/ai_smart_briefing.action.js';
export { default as LeadConvertAction } from './actions/lead_convert.action.js';
export { default as SalesPerformanceActions } from './actions/sales_performance.action.js';

// Export AI Agents
export { SalesCoPilotAgent } from './sales_copilot.agent.js';

// Export plugin definition
export { default as CRMPlugin } from './plugin.js';

// Export translations
export { CrmTranslations } from './translations/index.js';

// Note: YAML files (Campaign) are kept for backward compatibility
// TypeScript definitions are preferred as per the custom instructions

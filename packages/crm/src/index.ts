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
 * - Activity: Activity logging and tracking
 * - Task: Task management
 * - Note: Note management
 * - AssignmentRule: Auto-assignment rules
 * 
 * **Hooks:**
 * - Lead hooks: Lead scoring, status change automation
 * - Opportunity hooks: Stage change automation, validation
 * 
 * **Actions:**
 * - AI Smart Briefing: Account analysis and insights
 * - Lead Convert: Lead to opportunity conversion
 * - Sales Performance: Sales analytics
 */

// Export CRM objects
export { Account } from './account.object';
export { Activity } from './activity.object';
export { Contact } from './contact.object';
export { Lead } from './lead.object';
export { Opportunity } from './opportunity.object';
export { Task } from './task.object';
export { Note } from './note.object';
export { AssignmentRule } from './assignment_rule.object';

// Export hooks
export * from './hooks/lead.hook';
export * from './hooks/opportunity.hook';


// Export actions
export * from './actions/ai_smart_briefing.action';
export { default as LeadConvertAction } from './actions/lead_convert.action';
export { default as SalesPerformanceActions } from './actions/sales_performance.action';

// Export AI Agents
export { SalesCoPilotAgent } from './sales_copilot.agent';

// Export plugin definition
export { default as CRMPlugin } from './plugin';

/**
 * @hotcrm/crm - CRM Plugin Definition
 * 
 * This plugin provides core CRM functionality including:
 * - Account & Contact Management
 * - Lead Management & Qualification
 * - Opportunity & Sales Pipeline
 * - Activity Tracking
 * 
 * Dependencies: @hotcrm/core (required)
 */

// Import all CRM objects
import { Account } from './account.object';
import { Activity } from './activity.object';
import { Contact } from './contact.object';
import { Lead } from './lead.object';
import { Opportunity } from './opportunity.object';
import { Task } from './task.object';
import { Note } from './note.object';
import LeadConvertAction from './actions/lead_convert.action';
import { AssignmentRule } from './assignment_rule.object';

// Import hooks
import { LeadScoringTrigger, LeadStatusChangeTrigger } from './hooks/lead.hook';
import { OpportunityValidation, OpportunityStageChange } from './hooks/opportunity.hook';

/**
 * CRM Plugin Definition
 * 
 * Exports all CRM-related business objects, hooks, and actions
 * to be registered with the ObjectStack runtime
 */
export const CRMPlugin: any = {
  name: 'crm',
  label: 'CRM',
  version: '1.0.0',
  description: 'Core CRM functionality - Accounts, Contacts, Leads, Opportunities, and Activities',
  
  // Plugin dependencies
  dependencies: [],
  
  // Plugin initialization
  init: async () => {
    // No initialization required for this plugin
  },
  
  // Actions provided by this plugin
  actions: {
    lead_convert: LeadConvertAction
  },

  // Triggers/Hooks
  triggers: {
    lead_scoring: LeadScoringTrigger,
    lead_status_change: LeadStatusChangeTrigger,
    opportunity_validation: OpportunityValidation,
    opportunity_stage_change: OpportunityStageChange,
  },

  // Business objects provided by this plugin
  objects: {
    account: Account,
    activity: Activity,
    contact: Contact,
    lead: Lead,
    assignment_rule: AssignmentRule,
    opportunity: Opportunity,
    task: Task,
    note: Note,
  },
  
  // Navigation structure for this plugin
  navigation: [
    {
      type: 'group',
      label: 'Sales',
      children: [
        { type: 'object', object: 'account' },
        { type: 'object', object: 'contact' },
        { type: 'object', object: 'lead' },
        { type: 'object', object: 'opportunity' },
        { type: 'object', object: 'activity' },
      ]
    }
  ]
};

export default CRMPlugin;

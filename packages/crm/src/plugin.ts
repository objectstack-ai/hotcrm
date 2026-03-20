/**
 * @hotcrm/crm - Sales Cloud Plugin Definition
 * 
 * This plugin provides core Sales Cloud functionality including:
 * - Account & Contact Management
 * - Lead Management & Qualification
 * - Opportunity & Sales Pipeline
 * - Activity Tracking
 * 
 * Dependencies: @objectstack/spec (required)
 */

import { PluginSchema } from '@objectstack/spec/kernel';
import type { PluginDefinition } from '@objectstack/spec/kernel';

// Import translations
import { CrmTranslations } from './translations/index.js';

// Import all CRM objects
import { Account } from './account.object.js';
import { Activity } from './activity.object.js';
import { Contact } from './contact.object.js';
import { Lead } from './lead.object.js';
import { Opportunity } from './opportunity.object.js';
import { OpportunityLineItem } from './opportunity_line_item.object.js';
import { OpportunityContactRole } from './opportunity_contact_role.object.js';
import { Forecast } from './forecast.object.js';
import { ForecastItem } from './forecast_item.object.js';
import { Task } from './task.object.js';
import { Note } from './note.object.js';
import { Territory } from './territory.object.js';
import { TerritoryRule } from './territory_rule.object.js';
import { OpportunityTeamMember } from './opportunity_team_member.object.js';
import { Competitor } from './competitor.object.js';
import LeadConvertAction from './actions/lead_convert.action.js';
import { AssignmentRule } from './assignment_rule.object.js';
import { LeadWorkflows } from './lead.workflow.js';

// Import hooks
import { LeadScoringTrigger, LeadStatusChangeTrigger } from './hooks/lead.hook.js';
import { OpportunityValidation, OpportunityStageChange } from './hooks/opportunity.hook.js';
import { AccountHealthScoreTrigger, AccountHierarchyTrigger, AccountStatusAutomationTrigger } from './hooks/account.hook.js';
import { ActivityRelatedObjectUpdatesTrigger, ActivityCompletionTrigger, ActivityTypeValidationTrigger } from './hooks/activity.hook.js';
import { ContactDecisionChainTrigger, ContactDecisionMakerValidationTrigger, ContactDuplicateDetectionTrigger, ContactRelationshipStrengthTrigger } from './hooks/contact.hook.js';
import { TaskValidationTrigger, TaskCompletionTrigger, TaskOverdueTrigger } from './hooks/task.hook.js';
import { NoteValidationTrigger, NoteEditTrackingTrigger } from './hooks/note.hook.js';
import { TerritoryValidationTrigger, TerritoryMetricsTrigger } from './hooks/territory.hook.js';
import { AssignmentRuleValidationTrigger, AssignmentRuleSortOrderTrigger } from './hooks/assignment_rule.hook.js';
import { OpportunityLineItemCalculationTrigger, OpportunityLineItemRollupTrigger } from './hooks/opportunity_line_item.hook.js';
import { ForecastCalculationTrigger, ForecastAggregationTrigger } from './hooks/forecast.hook.js';

// Import actions
import EnhancedLeadScoringAction from './actions/enhanced_lead_scoring.action.js';
import LeadAIAction from './actions/lead_ai.action.js';
import OpportunityAIAction from './actions/opportunity_ai.action.js';
import SmartBriefingAction from './actions/ai_smart_briefing.action.js';
import SalesPerformanceAction from './actions/sales_performance.action.js';
import { calculateAccountHealth, predictChurn, generateRecommendations, assignTerritory, enrichAccount } from './actions/account_ai.action.js';
import { enrichContact, detectBuyingIntent, analyzeSentiment, predictBestContactTime, findDuplicates } from './actions/contact_ai.action.js';
import ForecastAIAction from './actions/forecast_ai.action.js';
import CrossCloudLifecycleAction from './actions/cross_cloud_lifecycle.action.js';

// Import datasets
import { AccountDataset } from './account.dataset.js';
import { ContactDataset } from './contact.dataset.js';
import { LeadDataset } from './lead.dataset.js';
import { OpportunityDataset } from './opportunity.dataset.js';
import { IndustryDataset } from './industry.dataset.js';

/**
 * CRM Plugin Definition
 * 
 * Exports all CRM-related business objects, hooks, and actions
 * to be registered with the ObjectStack runtime
 */
export const CRMPlugin = {
  name: 'crm',
  label: 'Sales Cloud',
  version: '1.0.0',
  description: 'Core Sales Cloud - Accounts, Contacts, Leads, Opportunities, and Activity Tracking',
  
  // Plugin dependencies
  dependencies: [],
  
  // Plugin initialization
  init: async () => {
    // No initialization required for this plugin
  },
  
  // Actions provided by this plugin
  actions: {
    lead_convert: LeadConvertAction,
    enhanced_lead_scoring: EnhancedLeadScoringAction,
    lead_ai: LeadAIAction,
    opportunity_ai: OpportunityAIAction,
    ai_smart_briefing: SmartBriefingAction,
    sales_performance: SalesPerformanceAction,
    account_ai: { calculateAccountHealth, predictChurn, generateRecommendations, assignTerritory, enrichAccount },
    contact_ai: { enrichContact, detectBuyingIntent, analyzeSentiment, predictBestContactTime, findDuplicates },
    forecast_ai: ForecastAIAction,
    cross_cloud_lifecycle: CrossCloudLifecycleAction,
  },

  // Triggers/Hooks
  triggers: {
    lead_scoring: LeadScoringTrigger,
    lead_status_change: LeadStatusChangeTrigger,
    opportunity_validation: OpportunityValidation,
    opportunity_stage_change: OpportunityStageChange,
    account_health_score: AccountHealthScoreTrigger,
    account_hierarchy: AccountHierarchyTrigger,
    account_status_automation: AccountStatusAutomationTrigger,
    activity_related_updates: ActivityRelatedObjectUpdatesTrigger,
    activity_completion: ActivityCompletionTrigger,
    activity_type_validation: ActivityTypeValidationTrigger,
    contact_decision_chain: ContactDecisionChainTrigger,
    contact_decision_maker_validation: ContactDecisionMakerValidationTrigger,
    contact_duplicate_detection: ContactDuplicateDetectionTrigger,
    contact_relationship_strength: ContactRelationshipStrengthTrigger,
    task_validation: TaskValidationTrigger,
    task_completion: TaskCompletionTrigger,
    task_overdue: TaskOverdueTrigger,
    note_validation: NoteValidationTrigger,
    note_edit_tracking: NoteEditTrackingTrigger,
    assignment_rule_validation: AssignmentRuleValidationTrigger,
    assignment_rule_sort_order: AssignmentRuleSortOrderTrigger,
    opportunity_line_item_calculation: OpportunityLineItemCalculationTrigger,
    opportunity_line_item_rollup: OpportunityLineItemRollupTrigger,
    forecast_calculation: ForecastCalculationTrigger,
    forecast_aggregation: ForecastAggregationTrigger,
    territory_validation: TerritoryValidationTrigger,
    territory_metrics: TerritoryMetricsTrigger,
  },

  // Workflows
  workflows: {
    lead_auto_assignment: LeadWorkflows.autoAssignment,
    lead_auto_scoring: LeadWorkflows.autoScoring,
    lead_nurturing: LeadWorkflows.nurturing,
    lead_enrichment: LeadWorkflows.enrichment,
  },

  // Business objects provided by this plugin
  objects: {
    account: Account,
    activity: Activity,
    contact: Contact,
    lead: Lead,
    assignment_rule: AssignmentRule,
    opportunity: Opportunity,
    opportunity_line_item: OpportunityLineItem,
    opportunity_contact_role: OpportunityContactRole,
    forecast: Forecast,
    forecast_item: ForecastItem,
    task: Task,
    note: Note,
    territory: Territory,
    territory_rule: TerritoryRule,
    opportunity_team_member: OpportunityTeamMember,
    competitor: Competitor,
  },
  
  // Translations (i18n) — must be array format per @objectstack/spec
  translations: [CrmTranslations],

  // Seed data (DatasetSchema)
  data: [
    IndustryDataset,
    AccountDataset,
    ContactDataset,
    LeadDataset,
    OpportunityDataset,
  ],

  // Apps provided by this plugin
  apps: [
    {
      name: 'crm',
      label: 'Sales Cloud',
      navigation: [
        {
          id: 'sales',
          type: 'group',
          label: 'Sales',
          children: [
            { id: 'account', label: 'Account', type: 'object', objectName: 'account' },
            { id: 'contact', label: 'Contact', type: 'object', objectName: 'contact' },
            { id: 'lead', label: 'Lead', type: 'object', objectName: 'lead' },
            { id: 'opportunity', label: 'Opportunity', type: 'object', objectName: 'opportunity' },
            { id: 'activity', label: 'Activity', type: 'object', objectName: 'activity' },
          ]
        },
        {
          id: 'territories',
          type: 'group',
          label: 'Territories',
          children: [
            { id: 'territory', label: 'Territory', type: 'object', objectName: 'territory' },
            { id: 'territory_rule', label: 'Territory Rule', type: 'object', objectName: 'territory_rule' },
          ]
        },
        {
          id: 'views_and_dashboards',
          type: 'group',
          label: 'Views & Dashboards',
          children: [
            { id: 'opportunity_kanban', label: 'Pipeline Board', type: 'object', objectName: 'opportunity', viewName: 'opportunity_kanban' },
            { id: 'activity_calendar', label: 'Activity Calendar', type: 'object', objectName: 'activity', viewName: 'activity_calendar' },
            { id: 'sales_dashboard', label: 'Sales Dashboard', type: 'dashboard', dashboardName: 'sales_overview' },
            { id: 'executive_dashboard', label: 'Executive Dashboard', type: 'dashboard', dashboardName: 'executive_dashboard' },
          ]
        }
      ]
    }
  ]
};

/** Spec-validated plugin metadata */
export const CRMPluginMetadata: PluginDefinition = PluginSchema.parse({
  name: 'crm',
  label: 'Sales Cloud',
  version: '1.0.0',
  description: 'Core Sales Cloud - Accounts, Contacts, Leads, Opportunities, and Activity Tracking',
});

export default CRMPlugin;

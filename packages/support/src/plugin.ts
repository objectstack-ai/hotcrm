/**
 * @hotcrm/support - Support Plugin Definition
 * 
 * This plugin provides customer support functionality including:
 * - Case Management
 * - Knowledge Base
 * - SLA Management & Tracking
 * - Queue & Routing
 * - Skill-Based Routing
 * - Multi-Channel Integration (Email, Web, Social Media)
 * - Customer Portal & Community Forums
 * 
 * Dependencies: @hotcrm/crm (required for Account and Contact references)
 */

import { PluginSchema } from '@objectstack/spec/kernel';
import type { PluginDefinition } from '@objectstack/spec/kernel';

// Import all Support objects
import { Case } from './case.object.js';
import { CaseComment } from './case_comment.object.js';
import { KnowledgeArticle } from './knowledge_article.object.js';
import { SLAPolicy } from './sla_policy.object.js';
import { SLATemplate } from './sla_template.object.js';
import { SLAMilestone } from './sla_milestone.object.js';
import { BusinessHours } from './business_hours.object.js';
import { HolidayCalendar } from './holiday_calendar.object.js';
import { Holiday } from './holiday.object.js';
import { Queue } from './queue.object.js';
import { QueueMember } from './queue_member.object.js';
import { RoutingRule } from './routing_rule.object.js';
import { EscalationRule } from './escalation_rule.object.js';
import { Skill } from './skill.object.js';
import { AgentSkill } from './agent_skill.object.js';
import { EmailToCase } from './email_to_case.object.js';
import { WebToCase } from './web_to_case.object.js';
import { SocialMediaCase } from './social_media_case.object.js';
import { PortalUser } from './portal_user.object.js';
import { ForumTopic } from './forum_topic.object.js';
import { ForumPost } from './forum_post.object.js';
import { ChatbotConfig } from './chatbot_config.object.js';
import { Macro } from './macro.object.js';

import { CaseEntitlementCheck } from './hooks/case.hook.js';
import KnowledgeHooks from './hooks/knowledge.hook.js';
import SLAHooks from './hooks/sla.hook.js';
import RoutingHooks from './hooks/routing.hook.js';
import QueueHooks from './hooks/queue.hook.js';
import { ForumTopicValidationTrigger, ForumTopicModerationTrigger, ForumPostCreationTrigger, ForumPostModerationTrigger } from './hooks/forum.hook.js';
import { AgentSkillLevelValidationTrigger, AgentCapacityTrackingTrigger } from './hooks/agent_skill.hook.js';
import { PortalUserAccountValidationTrigger, PortalUserAccessLevelTrigger } from './hooks/portal_user.hook.js';
import { SocialMediaCasePlatformValidationTrigger, SocialMediaCaseSentimentAnalysisTrigger, SocialMediaCaseCreationTrigger } from './hooks/social_media_case.hook.js';
import { CaseEscalationWorkflows } from './case_escalation.workflow.js';

// Import actions
import CaseAIAction from './actions/case_ai.action.js';
import ServiceMetricsAction from './actions/service_metrics.action.js';
import { recommendArticles, autoTagArticle, scoreArticleQuality, generateAnswer, analyzeKnowledgeGaps } from './actions/knowledge_ai.action.js';
import { predictSLABreach, estimateResolutionTime, analyzeEscalationNeeds, optimizeWorkload, analyzeSLAPerformance } from './actions/sla_prediction.action.js';

/**
 * Support Plugin Definition
 * 
 * Exports all support-related business objects, hooks, and actions
 * to be registered with the ObjectStack runtime
 */
export const SupportPlugin = {
  name: 'support',
  label: 'Customer Support',
  version: '1.0.0',
  description: 'Customer support management - Cases, Knowledge Base, SLA, Queues, and Multi-Channel Integration',
  
  // Plugin dependencies
  dependencies: ['crm'],
  
  // Plugin initialization
  init: async () => {
    // No initialization required for this plugin
  },
  
  // Business objects provided by this plugin
  objects: {
    case: Case,
    case_comment: CaseComment,
    knowledge_article: KnowledgeArticle,
    sla_policy: SLAPolicy,
    sla_template: SLATemplate,
    sla_milestone: SLAMilestone,
    business_hours: BusinessHours,
    holiday_calendar: HolidayCalendar,
    holiday: Holiday,
    queue: Queue,
    queue_member: QueueMember,
    routing_rule: RoutingRule,
    escalation_rule: EscalationRule,
    skill: Skill,
    agent_skill: AgentSkill,
    email_to_case: EmailToCase,
    web_to_case: WebToCase,
    social_media_case: SocialMediaCase,
    portal_user: PortalUser,
    forum_topic: ForumTopic,
    forum_post: ForumPost,
    chatbot_config: ChatbotConfig,
    macro: Macro,
  },
  
  // Actions provided by this plugin
  actions: {
    case_ai: CaseAIAction,
    service_metrics: ServiceMetricsAction,
    knowledge_ai: { recommendArticles, autoTagArticle, scoreArticleQuality, generateAnswer, analyzeKnowledgeGaps },
    sla_prediction: { predictSLABreach, estimateResolutionTime, analyzeEscalationNeeds, optimizeWorkload, analyzeSLAPerformance },
  },

  triggers: {
    case_entitlement: CaseEntitlementCheck,
    knowledge_hooks: KnowledgeHooks,
    sla_hooks: SLAHooks,
    routing_hooks: RoutingHooks,
    queue_hooks: QueueHooks,
    forum_topic_validation: ForumTopicValidationTrigger,
    forum_topic_moderation: ForumTopicModerationTrigger,
    forum_post_creation: ForumPostCreationTrigger,
    forum_post_moderation: ForumPostModerationTrigger,
    agent_skill_level_validation: AgentSkillLevelValidationTrigger,
    agent_capacity_tracking: AgentCapacityTrackingTrigger,
    portal_user_account_validation: PortalUserAccountValidationTrigger,
    portal_user_access_level: PortalUserAccessLevelTrigger,
    social_media_case_platform_validation: SocialMediaCasePlatformValidationTrigger,
    social_media_case_sentiment_analysis: SocialMediaCaseSentimentAnalysisTrigger,
    social_media_case_creation: SocialMediaCaseCreationTrigger,
  },

  // Workflows
  workflows: {
    case_auto_escalation: CaseEscalationWorkflows.autoEscalation,
    case_high_priority_alert: CaseEscalationWorkflows.highPriorityAlert,
    case_stale_check: CaseEscalationWorkflows.staleCheck,
    case_first_response_sla: CaseEscalationWorkflows.firstResponseSLA,
  },

  // Apps provided by this plugin
  apps: [
    {
      name: 'support',
      label: 'Customer Support',
      navigation: [
        {
          id: 'support',
          type: 'group',
          label: 'Support',
          children: [
            { id: 'case', label: 'Case', type: 'object', objectName: 'case' },
            { id: 'knowledge_article', label: 'Knowledge Article', type: 'object', objectName: 'knowledge_article' },
            { id: 'queue', label: 'Queue', type: 'object', objectName: 'queue' },
          ]
        },
        {
          id: 'sla_management',
          type: 'group',
          label: 'SLA Management',
          children: [
            { id: 'sla_policy', label: 'SLA Policy', type: 'object', objectName: 'sla_policy' },
            { id: 'sla_template', label: 'SLA Template', type: 'object', objectName: 'sla_template' },
            { id: 'business_hours', label: 'Business Hours', type: 'object', objectName: 'business_hours' },
          ]
        },
        {
          id: 'automation_and_ai',
          type: 'group',
          label: 'Automation & AI',
          children: [
            { id: 'chatbot_config', label: 'Chatbot Config', type: 'object', objectName: 'chatbot_config' },
            { id: 'macro', label: 'Macro', type: 'object', objectName: 'macro' },
          ]
        },
        {
          id: 'community_portal',
          type: 'group',
          label: 'Community Portal',
          children: [
            { id: 'portal_user', label: 'Portal User', type: 'object', objectName: 'portal_user' },
            { id: 'forum_topic', label: 'Forum Topic', type: 'object', objectName: 'forum_topic' },
            { id: 'forum_post', label: 'Forum Post', type: 'object', objectName: 'forum_post' },
          ]
        },
        {
          id: 'views_and_dashboards',
          type: 'group',
          label: 'Views & Dashboards',
          children: [
            { id: 'case_kanban', label: 'Case Board', type: 'object', objectName: 'case', viewName: 'case_kanban' },
            { id: 'support_dashboard', label: 'Support Dashboard', type: 'dashboard', dashboardName: 'support_dashboard' },
          ]
        }
      ]
    }
  ]
};

/** Spec-validated plugin metadata */
export const SupportPluginMetadata: PluginDefinition = PluginSchema.parse({
  name: 'support',
  label: 'Customer Support',
  version: '1.0.0',
  description: 'Customer support management - Cases, Knowledge Base, SLA, Queues, and Multi-Channel Integration',
});

export default SupportPlugin;

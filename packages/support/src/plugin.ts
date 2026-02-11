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

// Import all Support objects
import { Case } from './case.object';
import { CaseComment } from './case_comment.object';
import { KnowledgeArticle } from './knowledge_article.object';
import { SLAPolicy } from './sla_policy.object';
import { SLATemplate } from './sla_template.object';
import { SLAMilestone } from './sla_milestone.object';
import { BusinessHours } from './business_hours.object';
import { HolidayCalendar } from './holiday_calendar.object';
import { Holiday } from './holiday.object';
import { Queue } from './queue.object';
import { QueueMember } from './queue_member.object';
import { RoutingRule } from './routing_rule.object';
import { EscalationRule } from './escalation_rule.object';
import { Skill } from './skill.object';
import { AgentSkill } from './agent_skill.object';
import { EmailToCase } from './email_to_case.object';
import { WebToCase } from './web_to_case.object';
import { SocialMediaCase } from './social_media_case.object';
import { PortalUser } from './portal_user.object';
import { ForumTopic } from './forum_topic.object';
import { ForumPost } from './forum_post.object';

import { CaseEntitlementCheck } from './hooks/case.hook';
import KnowledgeHooks from './hooks/knowledge.hook';
import SLAHooks from './hooks/sla.hook';
import RoutingHooks from './hooks/routing.hook';
import QueueHooks from './hooks/queue.hook';
import { ForumTopicValidationTrigger, ForumTopicModerationTrigger, ForumPostCreationTrigger, ForumPostModerationTrigger } from './hooks/forum.hook';
import { CaseEscalationWorkflows } from './case_escalation.workflow';

// Import actions
import CaseAIAction from './actions/case_ai.action';
import ServiceMetricsAction from './actions/service_metrics.action';
import { recommendArticles, autoTagArticle, scoreArticleQuality, generateAnswer, analyzeKnowledgeGaps } from './actions/knowledge_ai.action';
import { predictSLABreach, estimateResolutionTime, analyzeEscalationNeeds, optimizeWorkload, analyzeSLAPerformance } from './actions/sla_prediction.action';

/**
 * Support Plugin Definition
 * 
 * Exports all support-related business objects, hooks, and actions
 * to be registered with the ObjectStack runtime
 */
export const SupportPlugin: any = {
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
  },

  // Workflows
  workflows: {
    case_auto_escalation: CaseEscalationWorkflows.autoEscalation,
    case_high_priority_alert: CaseEscalationWorkflows.highPriorityAlert,
    case_stale_check: CaseEscalationWorkflows.staleCheck,
    case_first_response_sla: CaseEscalationWorkflows.firstResponseSLA,
  },

  // Navigation structure for this plugin
  navigation: [
    {
      type: 'group',
      label: 'Support',
      children: [
        { type: 'object', object: 'case' },
        { type: 'object', object: 'knowledge_article' },
        { type: 'object', object: 'queue' },
      ]
    },
    {
      type: 'group',
      label: 'SLA Management',
      children: [
        { type: 'object', object: 'sla_policy' },
        { type: 'object', object: 'sla_template' },
        { type: 'object', object: 'business_hours' },
      ]
    },
    {
      type: 'group',
      label: 'Community Portal',
      children: [
        { type: 'object', object: 'portal_user' },
        { type: 'object', object: 'forum_topic' },
        { type: 'object', object: 'forum_post' },
      ]
    }
  ]
};

export default SupportPlugin;

/**
 * @hotcrm/support - Support Module
 * 
 * This package contains all support-related business objects:
 * - Case: Customer support case management
 * - Knowledge Article: Knowledge base and documentation
 * - SLA Management: SLA templates, milestones, and tracking
 * - Queue Management: Support queues and routing
 * - Multi-Channel: Email-to-case, web-to-case integrations
 * - Skills: Skill-based routing and agent proficiency
 * - Portal: Customer self-service portal
 * - Community: Forum topics and posts
 */

// Core Support Objects
export { Case } from './case.object.js';
export { CaseComment } from './case_comment.object.js';
export { KnowledgeArticle } from './knowledge_article.object.js';

// SLA Management
export { SLAPolicy } from './sla_policy.object.js';
export { SLATemplate } from './sla_template.object.js';
export { SLAMilestone } from './sla_milestone.object.js';
export { BusinessHours } from './business_hours.object.js';
export { HolidayCalendar } from './holiday_calendar.object.js';
export { Holiday } from './holiday.object.js';

// Queue & Routing
export { Queue } from './queue.object.js';
export { QueueMember } from './queue_member.object.js';
export { RoutingRule } from './routing_rule.object.js';
export { EscalationRule } from './escalation_rule.object.js';

// Skill-Based Routing
export { Skill } from './skill.object.js';
export { AgentSkill } from './agent_skill.object.js';

// Multi-Channel Integration
export { EmailToCase } from './email_to_case.object.js';
export { WebToCase } from './web_to_case.object.js';
export { SocialMediaCase } from './social_media_case.object.js';

// Customer Portal
export { PortalUser } from './portal_user.object.js';
export { ForumTopic } from './forum_topic.object.js';
export { ForumPost } from './forum_post.object.js';

// Business Logic Hooks
export { default as CaseHooks } from './hooks/case.hook.js';
export { default as KnowledgeHooks } from './hooks/knowledge.hook.js';
export { default as ServiceMetricsActions } from './actions/service_metrics.action.js';

// Services
export { EmailHandler } from './services/email_handler.service.js';

// Export AI Agents
export { InboxAgent } from './inbox.agent.js';

// Export plugin definition
export { default as SupportPlugin } from './plugin.js';

// Export translations
export { SupportTranslations } from './translations/index.js';

// Note: YAML files (Knowledge) are kept for reference
// TypeScript definitions should be created following the metadata protocol

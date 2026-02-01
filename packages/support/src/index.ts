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
export { default as Case } from './case.object';
export { default as CaseComment } from './case_comment.object';
export { default as KnowledgeArticle } from './knowledge_article.object';

// SLA Management
export { default as SLAPolicy } from './sla_policy.object';
export { default as SLATemplate } from './sla_template.object';
export { default as SLAMilestone } from './sla_milestone.object';
export { default as BusinessHours } from './business_hours.object';
export { default as HolidayCalendar } from './holiday_calendar.object';
export { default as Holiday } from './holiday.object';

// Queue & Routing
export { default as Queue } from './queue.object';
export { default as QueueMember } from './queue_member.object';
export { default as RoutingRule } from './routing_rule.object';
export { default as EscalationRule } from './escalation_rule.object';

// Skill-Based Routing
export { default as Skill } from './skill.object';
export { default as AgentSkill } from './agent_skill.object';

// Multi-Channel Integration
export { default as EmailToCase } from './email_to_case.object';
export { default as WebToCase } from './web_to_case.object';
export { default as SocialMediaCase } from './social_media_case.object';

// Customer Portal
export { default as PortalUser } from './portal_user.object';
export { default as ForumTopic } from './forum_topic.object';
export { default as ForumPost } from './forum_post.object';

// Business Logic Hooks
export { default as CaseHooks } from './hooks/case.hook';
export { default as KnowledgeHooks } from './hooks/knowledge.hook';

// Services
export { EmailHandler } from './services/email_handler.service';

// Export plugin definition
export { default as SupportPlugin } from './plugin';

// Note: YAML files (Knowledge) are kept for reference
// TypeScript definitions should be created following the metadata protocol

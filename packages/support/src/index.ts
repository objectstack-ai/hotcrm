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
export { Case } from './case.object';
export { CaseComment } from './case_comment.object';
export { KnowledgeArticle } from './knowledge_article.object';

// SLA Management
export { SLAPolicy } from './sla_policy.object';
export { SLATemplate } from './sla_template.object';
export { SLAMilestone } from './sla_milestone.object';
export { BusinessHours } from './business_hours.object';
export { HolidayCalendar } from './holiday_calendar.object';
export { Holiday } from './holiday.object';

// Queue & Routing
export { Queue } from './queue.object';
export { QueueMember } from './queue_member.object';
export { RoutingRule } from './routing_rule.object';
export { EscalationRule } from './escalation_rule.object';

// Skill-Based Routing
export { Skill } from './skill.object';
export { AgentSkill } from './agent_skill.object';

// Multi-Channel Integration
export { EmailToCase } from './email_to_case.object';
export { WebToCase } from './web_to_case.object';
export { SocialMediaCase } from './social_media_case.object';

// Customer Portal
export { PortalUser } from './portal_user.object';
export { ForumTopic } from './forum_topic.object';
export { ForumPost } from './forum_post.object';

// Business Logic Hooks
export { default as CaseHooks } from './hooks/case.hook';
export { default as KnowledgeHooks } from './hooks/knowledge.hook';

// Services
export { EmailHandler } from './services/email_handler.service';

// Export plugin definition
export { default as SupportPlugin } from './plugin';

// Note: YAML files (Knowledge) are kept for reference
// TypeScript definitions should be created following the metadata protocol

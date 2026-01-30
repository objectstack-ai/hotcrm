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
 */

// Core Support Objects
export { default as Case } from './case.object';
export { default as KnowledgeArticle } from './knowledge_article.object';

// SLA Management
export { default as SLATemplate } from './sla_template.object';
export { default as SLAMilestone } from './sla_milestone.object';
export { default as BusinessHours } from './business_hours.object';

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

// Note: YAML files (Knowledge) are kept for reference
// TypeScript definitions should be created following the metadata protocol

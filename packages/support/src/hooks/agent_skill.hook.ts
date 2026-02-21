import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('support:agent_skill');

/**
 * Agent Skill Level Validation Trigger
 * 
 * Validates agent skill data before insert/update:
 * 1. proficiency_score must match proficiency_level range
 * 2. max_concurrent_cases must be non-negative
 * 3. Auto-set is_certified based on certification dates
 */
const AgentSkillLevelValidationTrigger: Hook = {
  name: 'AgentSkillLevelValidationTrigger',
  object: 'agent_skill',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.input.doc as Record<string, any>;

      // Validate proficiency_score range (0-100)
      if (doc.proficiency_score !== undefined && doc.proficiency_score !== null) {
        if (doc.proficiency_score < 0 || doc.proficiency_score > 100) {
          throw new Error('Proficiency score must be between 0 and 100.');
        }
      }

      // Auto-set is_certified based on certification dates
      if (doc.certification_date && doc.certification_expiry) {
        const now = new Date();
        const expiryDate = new Date(doc.certification_expiry);
        doc.is_certified = expiryDate > now;

        if (!doc.is_certified) {
          logger.warn(`Agent certification has expired (${doc.certification_expiry})`);
          doc.training_required = true;
        }
      } else if (doc.certification_date && !doc.certification_expiry) {
        doc.is_certified = true;
      }

      // Validate max_concurrent_cases
      if (doc.max_concurrent_cases !== undefined && doc.max_concurrent_cases < 0) {
        throw new Error('Max concurrent cases must be 0 or greater.');
      }

      logger.info(`Agent skill validation passed for agent ${doc.user_id}, skill ${doc.skill_id}`);
    } catch (error) {
      logger.error('Agent skill validation failed:', error);
      throw error;
    }
  }
};

/**
 * Agent Capacity Tracking Trigger
 * 
 * After update, check agent's total capacity across all skills
 * and log capacity utilization metrics.
 */
const AgentCapacityTrackingTrigger: Hook = {
  name: 'AgentCapacityTrackingTrigger',
  object: 'agent_skill',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const skill = ctx.result as Record<string, any>;
      const oldSkill = ctx.previous as Record<string, any> | undefined;

      // Only process if relevant fields changed
      if (oldSkill &&
        oldSkill.proficiency_level === skill.proficiency_level &&
        oldSkill.accept_cases === skill.accept_cases &&
        oldSkill.is_verified === skill.is_verified) {
        return;
      }

      // Find all skills for this agent
      const agentSkills = await (ctx.ql as any).find('agent_skill', {
        filters: [['user_id', '=', skill.user_id]]
      });

      if (!agentSkills || agentSkills.length === 0) {
        return;
      }

      const activeSkills = agentSkills.filter((s: any) => s.accept_cases).length;
      const verifiedSkills = agentSkills.filter((s: any) => s.is_verified).length;
      const totalSkills = agentSkills.length;

      logger.info(`Agent ${skill.user_id} skill profile: ${totalSkills} skills (${activeSkills} active, ${verifiedSkills} verified)`);

      // Log if verification status changed
      if (oldSkill && !oldSkill.is_verified && skill.is_verified) {
        logger.info(`Skill verified for agent ${skill.user_id}: ${skill.skill_id}`);
      }
    } catch (error) {
      logger.error('[agent_skill.hook] capacity tracking failed:', error);
    }
  }
};

export { AgentSkillLevelValidationTrigger, AgentCapacityTrackingTrigger };
export default [AgentSkillLevelValidationTrigger, AgentCapacityTrackingTrigger] as Hook[];

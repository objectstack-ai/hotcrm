import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('hr:recruitment');

const VALID_STAGES = ['sourcing', 'screening', 'interviewing', 'offer', 'hired', 'closed'];

/**
 * Recruitment Pipeline Validation Trigger
 * 
 * Automatically handles:
 * 1. Validate stage is a valid pipeline stage
 * 2. Auto-set status to 'open' on insert if not provided
 */
const RecruitmentPipelineValidationTrigger: Hook = {
 name: 'RecruitmentPipelineValidationTrigger',
 object: 'recruitment',
 events: ['beforeInsert', 'beforeUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;
 try {
 // Validate stage
 if (doc.stage && !VALID_STAGES.includes(doc.stage)) {
 throw new Error(` Invalid recruitment stage "${doc.stage}". Must be one of: ${VALID_STAGES.join(', ')}`);
 }

 // Auto-set status to 'open' on insert if not provided
 if (ctx.event === 'beforeInsert' && !doc.status) {
 doc.status = 'open';
 logger.info('Auto-set recruitment status to "open"');
 }

 logger.info(`Recruitment pipeline validation passed`);
 } catch (err) {
 logger.error('Error in RecruitmentPipelineValidationTrigger:', err);
 throw err;
 }
 }
};

/**
 * Recruitment Metrics Trigger
 * 
 * Logs pipeline stage transitions for tracking and analytics
 */
const RecruitmentMetricsTrigger: Hook = {
 name: 'RecruitmentMetricsTrigger',
 object: 'recruitment',
 events: ['afterUpdate'],
 handler: async (ctx: HookContext) => {
 try {
 if (!ctx.previous || (ctx.previous as Record<string, any>).stage === (ctx.result as Record<string, any>).stage) {
 return;
 }

 const recruitment = ctx.result as Record<string, any>;
 const oldStage = (ctx.previous as Record<string, any>).stage;
 const newStage = recruitment.stage;

 logger.info(`Recruitment pipeline stage transition: "${oldStage}" → "${newStage}"`);
 logger.info(`Pipeline metric logged for recruitment ${recruitment.id || recruitment.name || ''}`);

 logger.debug(`[recruitment.hook] Pipeline analytics pending: record stage transition ${oldStage} → ${newStage}`);
 } catch (err) {
 logger.error('Error in RecruitmentMetricsTrigger:', err);
 }
 }
};

export { RecruitmentPipelineValidationTrigger, RecruitmentMetricsTrigger };
export default [RecruitmentPipelineValidationTrigger, RecruitmentMetricsTrigger] as Hook[];

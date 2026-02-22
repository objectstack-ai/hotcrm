import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('hr:compensation_plan');

/**
 * Compensation Plan Validation Trigger
 * 
 * Validates compensation plan data before save:
 * 1. Base salary must be greater than 0
 * 2. Auto-calculates total_compensation = base_salary + (base_salary * bonus_target_percent / 100)
 * 3. Auto-calculates compa_ratio = base_salary / salary_range_midpoint * 100
 */
const CompensationPlanValidationTrigger: Hook = {
  name: 'CompensationPlanValidationTrigger',
  object: 'compensation_plan',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const plan = ctx.input.doc as Record<string, any>;

      // Validate base_salary > 0
      const baseSalary = Number(plan.base_salary) || 0;
      if (baseSalary <= 0) {
        throw new Error('Base salary must be greater than 0');
      }

      // Calculate total_compensation = base_salary + (base_salary * bonus_target_percent / 100)
      const bonusTargetPercent = Number(plan.bonus_target_percent) || 0;
      plan.total_compensation = baseSalary + (baseSalary * bonusTargetPercent / 100);

      // Calculate compa_ratio = base_salary / salary_range_midpoint * 100
      const salaryRangeMidpoint = Number(plan.salary_range_midpoint) || 0;
      if (salaryRangeMidpoint > 0) {
        plan.compa_ratio = baseSalary / salaryRangeMidpoint * 100;
      }

      logger.info(`Compensation plan validation passed, total_compensation: ${plan.total_compensation}, compa_ratio: ${plan.compa_ratio || 'N/A'}`);

    } catch (error) {
      logger.error('Error in CompensationPlanValidationTrigger:', error);
      throw error; // Re-throw to prevent save
    }
  }
};

/**
 * Compensation Plan Approval Trigger
 * 
 * Logs when a compensation plan status changes to 'active'
 */
const CompensationPlanApprovalTrigger: Hook = {
  name: 'CompensationPlanApprovalTrigger',
  object: 'compensation_plan',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const plan = ctx.result as Record<string, any>;
      const previous = ctx.previous as Record<string, any> | undefined;

      // Check if status changed to 'active'
      if (plan.status === 'active' && (!previous || previous.status !== 'active')) {
        logger.info(`Compensation plan approved and activated: ${plan._id || plan.id}`);
        logger.info(`Plan for employee ${plan.employee_id || 'unknown'}: base_salary=${plan.base_salary}, total_compensation=${plan.total_compensation}`);
      }

    } catch (error) {
      logger.error('Error in CompensationPlanApprovalTrigger:', error);
      // Don't throw - plan record already updated
    }
  }
};

export {
  CompensationPlanValidationTrigger,
  CompensationPlanApprovalTrigger
};

export default [
  CompensationPlanValidationTrigger,
  CompensationPlanApprovalTrigger
] as Hook[];

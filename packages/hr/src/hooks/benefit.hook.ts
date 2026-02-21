import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('hr:benefit');

/**
 * Benefit Enrollment Validation Trigger
 * 
 * Validates benefit enrollment data before save:
 * 1. Enrollment date must be on or before effective date
 * 2. Auto-calculates total_cost = employee_contribution + employer_contribution
 */
const BenefitEnrollmentValidationTrigger: Hook = {
  name: 'BenefitEnrollmentValidationTrigger',
  object: 'benefit',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const benefit = ctx.input.doc as Record<string, any>;

      // Validate enrollment_date <= effective_date
      if (benefit.enrollment_date && benefit.effective_date) {
        const enrollmentDate = new Date(benefit.enrollment_date);
        const effectiveDate = new Date(benefit.effective_date);

        if (enrollmentDate > effectiveDate) {
          throw new Error('Enrollment date cannot be after effective date');
        }
      }

      // Calculate total_cost = employee_contribution + employer_contribution
      const employeeContribution = Number(benefit.employee_contribution) || 0;
      const employerContribution = Number(benefit.employer_contribution) || 0;
      benefit.total_cost = employeeContribution + employerContribution;

      logger.info(`Benefit enrollment validation passed, total_cost: ${benefit.total_cost}`);

    } catch (error) {
      logger.error('Error in BenefitEnrollmentValidationTrigger:', error);
      throw error; // Re-throw to prevent save
    }
  }
};

/**
 * Benefit Expiration Check Trigger
 * 
 * Logs when a benefit's termination_date is set (benefit expiring)
 */
const BenefitExpirationCheckTrigger: Hook = {
  name: 'BenefitExpirationCheckTrigger',
  object: 'benefit',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const benefit = ctx.result as Record<string, any>;
      const previous = ctx.previous as Record<string, any> | undefined;

      // Check if termination_date was just set
      if (benefit.termination_date && (!previous || !previous.termination_date)) {
        logger.info(`Benefit termination date set: ${benefit.termination_date} for benefit ${benefit._id || benefit.id}`);
        logger.info(`Benefit plan "${benefit.plan_name || benefit.benefit_type}" will expire on ${benefit.termination_date}`);
      }

    } catch (error) {
      logger.error('Error in BenefitExpirationCheckTrigger:', error);
      // Don't throw - benefit record already updated
    }
  }
};

export {
  BenefitEnrollmentValidationTrigger,
  BenefitExpirationCheckTrigger
};

export default [
  BenefitEnrollmentValidationTrigger,
  BenefitExpirationCheckTrigger
] as Hook[];

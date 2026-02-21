import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('finance:revenue_recognition');

const RevenueScheduleValidationTrigger: Hook = {
  name: 'RevenueScheduleValidationTrigger',
  object: 'revenue_schedule',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    try {
      // Validate recognition dates: start must be before end
      if (doc.recognition_start_date && doc.recognition_end_date) {
        const startDate = new Date(doc.recognition_start_date);
        const endDate = new Date(doc.recognition_end_date);

        if (startDate >= endDate) {
          throw new Error('Recognition start date must be before recognition end date');
        }
      }

      // Calculate deferred_amount = total_amount - recognized_amount
      if (doc.total_amount !== undefined) {
        const totalAmount = doc.total_amount || 0;
        const recognizedAmount = doc.recognized_amount || 0;
        doc.deferred_amount = totalAmount - recognizedAmount;
      }

      // Calculate amount_per_period = total_amount / periods_total
      if (doc.total_amount !== undefined && doc.periods_total && doc.periods_total > 0) {
        doc.amount_per_period = Math.round((doc.total_amount / doc.periods_total) * 100) / 100;
      }

      logger.info(`Revenue schedule validated: deferred_amount=${doc.deferred_amount}, amount_per_period=${doc.amount_per_period}`);
    } catch (err) {
      logger.error('Revenue Schedule Validation Error:', err);
      throw err;
    }
  }
};

const RevenueRecognitionComplianceTrigger: Hook = {
  name: 'RevenueRecognitionComplianceTrigger',
  object: 'revenue_schedule',
  events: ['afterInsert'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.result as Record<string, any>;

    try {
      logger.info(`Revenue recognition compliance check: Schedule "${doc.name}" created with method=${doc.recognition_method}, total_amount=${doc.total_amount}, periods=${doc.periods_total}`);
    } catch (err) {
      logger.error('Revenue Recognition Compliance Error:', err);
    }
  }
};

export { RevenueScheduleValidationTrigger, RevenueRecognitionComplianceTrigger };
export default [RevenueScheduleValidationTrigger, RevenueRecognitionComplianceTrigger] as Hook[];

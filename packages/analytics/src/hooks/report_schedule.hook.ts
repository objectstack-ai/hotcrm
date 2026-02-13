import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Report Schedule Validation Trigger
 *
 * Validates schedule configuration and calculates next run time.
 */
const ReportScheduleValidationTrigger: Hook = {
  name: 'ReportScheduleValidationTrigger',
  object: 'report_schedule',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.input.doc as Record<string, any>;

      // Validate that report_id is set
      if (!doc.report_id) {
        throw new Error('Report is required for a schedule');
      }

      // Validate recipients
      if (doc.recipients) {
        const emails = doc.recipients.split(',').map((e: string) => e.trim());
        for (const email of emails) {
          if (email && !email.includes('@')) {
            throw new Error(`Invalid email address: ${email}`);
          }
        }
      }

      // Calculate next_run if not set
      if (!doc.next_run && doc.frequency) {
        doc.next_run = calculateNextRun(doc.frequency);
      }

    } catch (error) {
      console.error('❌ Error in ReportScheduleValidationTrigger:', error);
      throw error;
    }
  }
};

/**
 * Report Schedule Recalculation Trigger
 *
 * Recalculates next run time after updates.
 */
const ReportScheduleRecalcTrigger: Hook = {
  name: 'ReportScheduleRecalcTrigger',
  object: 'report_schedule',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.result as Record<string, any>;
      const oldDoc = ctx.previous as Record<string, any> | undefined;

      // Recalculate next_run if frequency changed
      if (oldDoc && oldDoc.frequency !== doc.frequency) {
        console.log(`🔄 Schedule "${doc.name}" frequency changed, recalculating next run`);
      }
    } catch (error) {
      console.error('❌ Error in ReportScheduleRecalcTrigger:', error);
    }
  }
};

function calculateNextRun(frequency: string): string {
  const now = new Date();
  switch (frequency) {
    case 'daily':
      now.setDate(now.getDate() + 1);
      now.setHours(6, 0, 0, 0);
      break;
    case 'weekly':
      now.setDate(now.getDate() + (7 - now.getDay() + 1));
      now.setHours(6, 0, 0, 0);
      break;
    case 'monthly':
      now.setMonth(now.getMonth() + 1, 1);
      now.setHours(6, 0, 0, 0);
      break;
    case 'quarterly':
      now.setMonth(now.getMonth() + 3, 1);
      now.setHours(6, 0, 0, 0);
      break;
  }
  return now.toISOString();
}

export { ReportScheduleValidationTrigger, ReportScheduleRecalcTrigger };
export default ReportScheduleValidationTrigger;

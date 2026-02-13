import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Report Validation Trigger
 *
 * Validates columns/filters JSON and sets defaults before insert.
 */
const ReportValidationTrigger: Hook = {
  name: 'ReportValidationTrigger',
  object: 'report',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.input.doc as Record<string, any>;

      // Validate columns JSON if provided
      if (doc.columns) {
        try {
          JSON.parse(doc.columns);
        } catch {
          throw new Error('Invalid JSON in columns field');
        }
      }

      // Validate filters JSON if provided
      if (doc.filters) {
        try {
          JSON.parse(doc.filters);
        } catch {
          throw new Error('Invalid JSON in filters field');
        }
      }

      // Set default report type
      if (!doc.report_type) {
        doc.report_type = 'tabular';
      }

      // Set default chart type
      if (!doc.chart_type) {
        doc.chart_type = 'none';
      }

    } catch (error) {
      console.error('❌ Error in ReportValidationTrigger:', error);
      throw error;
    }
  }
};

/**
 * Report Creation Logging Trigger
 */
const ReportCreationTrigger: Hook = {
  name: 'ReportCreationTrigger',
  object: 'report',
  events: ['afterInsert'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.result as Record<string, any>;
      console.log(`📊 Report created: ${doc.name} (type: ${doc.report_type})`);
    } catch (error) {
      console.error('❌ Error in ReportCreationTrigger:', error);
    }
  }
};

export { ReportValidationTrigger, ReportCreationTrigger };
export default ReportValidationTrigger;

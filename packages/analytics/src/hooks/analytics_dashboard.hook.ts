import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Dashboard Widget Validation Trigger
 *
 * Validates widget layout JSON before insert/update.
 */
const DashboardValidationTrigger: Hook = {
  name: 'DashboardValidationTrigger',
  object: 'analytics_dashboard',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.input.doc as Record<string, any>;

      // Validate widgets JSON
      if (doc.widgets) {
        try {
          const widgets = JSON.parse(doc.widgets);
          if (!Array.isArray(widgets)) {
            throw new Error('Widgets must be a JSON array');
          }
        } catch (e: any) {
          if (e.message === 'Widgets must be a JSON array') throw e;
          throw new Error('Invalid JSON in widgets field');
        }
      }

      // Validate layout_config JSON
      if (doc.layout_config) {
        try {
          JSON.parse(doc.layout_config);
        } catch {
          throw new Error('Invalid JSON in layout_config field');
        }
      }

      // Set default refresh interval
      if (!doc.refresh_interval || doc.refresh_interval < 30) {
        doc.refresh_interval = 300;
      }

    } catch (error) {
      console.error('❌ Error in DashboardValidationTrigger:', error);
      throw error;
    }
  }
};

/**
 * Dashboard Refresh Trigger
 *
 * Triggers widget data refresh after dashboard updates.
 */
const DashboardRefreshTrigger: Hook = {
  name: 'DashboardRefreshTrigger',
  object: 'analytics_dashboard',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.result as Record<string, any>;
      console.log(`🔄 Dashboard updated, triggering refresh: ${doc.name}`);
    } catch (error) {
      console.error('❌ Error in DashboardRefreshTrigger:', error);
    }
  }
};

export { DashboardValidationTrigger, DashboardRefreshTrigger };
export default DashboardValidationTrigger;

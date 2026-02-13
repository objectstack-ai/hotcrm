import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Data Source Connection Validation Trigger
 *
 * Validates connection configuration before insert.
 */
const DataSourceValidationTrigger: Hook = {
  name: 'DataSourceValidationTrigger',
  object: 'data_source',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.input.doc as Record<string, any>;

      // Validate connection_config JSON
      if (doc.connection_config) {
        try {
          JSON.parse(doc.connection_config);
        } catch {
          throw new Error('Invalid JSON in connection_config field');
        }
      }

      // Validate schema_mapping JSON
      if (doc.schema_mapping) {
        try {
          JSON.parse(doc.schema_mapping);
        } catch {
          throw new Error('Invalid JSON in schema_mapping field');
        }
      }

      // Set default sync status
      if (!doc.sync_status) {
        doc.sync_status = 'disconnected';
      }

    } catch (error) {
      console.error('❌ Error in DataSourceValidationTrigger:', error);
      throw error;
    }
  }
};

/**
 * Data Source Sync Health Check Trigger
 *
 * Monitors sync health after updates.
 */
const DataSourceSyncHealthTrigger: Hook = {
  name: 'DataSourceSyncHealthTrigger',
  object: 'data_source',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    try {
      const doc = ctx.result as Record<string, any>;

      if (doc.sync_status === 'error') {
        console.log(`🚨 Data source "${doc.name}" sync error detected`);
      } else if (doc.sync_status === 'active') {
        console.log(`✅ Data source "${doc.name}" is syncing normally`);
      }

    } catch (error) {
      console.error('❌ Error in DataSourceSyncHealthTrigger:', error);
    }
  }
};

export { DataSourceValidationTrigger, DataSourceSyncHealthTrigger };
export default DataSourceValidationTrigger;

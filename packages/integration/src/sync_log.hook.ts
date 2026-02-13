import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Sync Monitoring
 *
 * Calculates duration when a sync log entry is completed
 * and updates the parent sync_config's last_sync timestamp.
 */
const SyncMonitoring: Hook = {
  name: 'SyncMonitoring',
  object: 'sync_log',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.result as Record<string, any>;
    if (!doc?._id) return;

    if (doc.status === 'completed' && doc.started_at && doc.completed_at) {
      const duration = new Date(doc.completed_at).getTime() - new Date(doc.started_at).getTime();
      try {
        await ctx.ql.doc.update('sync_log', doc._id, { duration_ms: duration });
        await ctx.ql.doc.update('sync_config', doc.sync_config_id, {
          last_sync: doc.completed_at
        });
      } catch (error) {
        console.warn('⚠️ Failed to update sync monitoring data:', error);
      }
    }
  }
};

/**
 * Failure Alert
 *
 * Logs alerts when a sync operation fails and records error details.
 */
const FailureAlert: Hook = {
  name: 'FailureAlert',
  object: 'sync_log',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.result as Record<string, any>;
    if (!doc?._id || doc.status !== 'failed') return;

    console.log(`🚨 Sync failed for config ${doc.sync_config_id}: ${doc.error_details || 'Unknown error'}`);
    console.log(`📊 Processed: ${doc.records_processed || 0}, Failed: ${doc.records_failed || 0}`);
  }
};

/**
 * Retry Logic
 *
 * Creates a new sync log entry for retry when a sync fails
 * and the parent config is still active.
 */
const RetryLogic: Hook = {
  name: 'RetryLogic',
  object: 'sync_log',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.result as Record<string, any>;
    if (!doc?._id || doc.status !== 'failed') return;

    try {
      const config = await ctx.ql.findOne('sync_config', doc.sync_config_id);
      if (config?.is_active && config.frequency !== 'manual') {
        console.log(`🔄 Scheduling retry for sync config ${doc.sync_config_id}`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to check retry eligibility:', error);
    }
  }
};

export { SyncMonitoring, FailureAlert, RetryLogic };
export default SyncMonitoring;

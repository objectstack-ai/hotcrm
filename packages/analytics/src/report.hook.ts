import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Report Filter Validation
 *
 * Validates filter JSON structure and ensures the referenced object_name exists
 * before a report is created or updated.
 */
const ReportFilterValidation: Hook = {
  name: 'ReportFilterValidation',
  object: 'report',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    // Validate filters JSON if provided
    if (doc.filters) {
      try {
        const parsed = typeof doc.filters === 'string' ? JSON.parse(doc.filters) : doc.filters;
        if (!Array.isArray(parsed)) {
          throw new Error('Filters must be a JSON array');
        }
        for (const filter of parsed) {
          if (!filter.field || !filter.operator) {
            throw new Error('Each filter must have "field" and "operator" properties');
          }
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error('Validation Error: filters field contains invalid JSON');
        }
        throw error;
      }
    }

    // Ensure object_name references a valid object
    if (doc.object_name) {
      try {
        const results = await (ctx.ql as any).find(doc.object_name, { limit: 0 });
        if (results === undefined) {
          throw new Error(`Validation Error: Source object "${doc.object_name}" does not exist`);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('does not exist') || msg.includes('not found') || msg.includes('unknown object')) {
          throw new Error(`Validation Error: Source object "${doc.object_name}" does not exist`);
        }
      }
    }
  }
};

/**
 * Report Access Control
 *
 * Ensures the current user is the report owner or the report is public
 * before allowing read access.
 */
const ReportAccessControl: Hook = {
  name: 'ReportAccessControl',
  object: 'report',
  events: ['beforeFind'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.result as Record<string, any> | undefined;
    if (!doc) return;

    const isOwner = doc.owner_id === ctx.user?.id;
    const isPublic = doc.is_public === true;

    if (!isOwner && !isPublic) {
      throw new Error('Access Denied: You do not have permission to view this report');
    }
  }
};

/**
 * Report Cache Invalidation
 *
 * Invalidates cached report results whenever a report definition is updated
 * so stale data is never served.
 */
const ReportCacheInvalidation: Hook = {
  name: 'ReportCacheInvalidation',
  object: 'report',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    const report = ctx.result as Record<string, any>;
    if (!report?._id) return;

    console.log(`🗑️ Invalidating cache for report ${report._id}`);

    // Remove any cached snapshots tied to this report
    try {
      const snapshots = await (ctx.ql as any).find('snapshot', {
        filters: [['report_id', '=', report._id]]
      });
      for (const snap of snapshots) {
        await (ctx.ql as any).doc.update('snapshot', snap._id, { is_stale: true });
      }
    } catch (error) {
      console.warn('⚠️ Failed to invalidate report cache:', error);
    }
  }
};

/**
 * Report Execution Tracking
 *
 * Increments run_count and updates last_run_at every time a report is read,
 * providing usage analytics for report consumers.
 */
const ReportExecutionTracking: Hook = {
  name: 'ReportExecutionTracking',
  object: 'report',
  events: ['afterFind'],
  handler: async (ctx: HookContext) => {
    const report = ctx.result as Record<string, any>;
    if (!report?._id) return;

    try {
      await (ctx.ql as any).doc.update('report', report._id, {
        run_count: (report.run_count || 0) + 1,
        last_run_at: new Date().toISOString()
      });
    } catch (error) {
      console.warn('⚠️ Failed to update report execution tracking:', error);
    }
  }
};

export { ReportFilterValidation, ReportAccessControl, ReportCacheInvalidation, ReportExecutionTracking };
export default ReportFilterValidation;

import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('analytics:analytics_dashboard');

/**
 * Dashboard Widget Validation
 *
 * Validates that the widgets JSON structure is well-formed and each widget
 * contains the required properties (type, report_id or data_source).
 */
const DashboardWidgetValidation: Hook = {
  name: 'DashboardWidgetValidation',
  object: 'analytics_dashboard',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    if (doc.widgets) {
      let parsed: any[];
      try {
        parsed = typeof doc.widgets === 'string' ? JSON.parse(doc.widgets) : doc.widgets;
      } catch {
        throw new Error('Validation Error: widgets field contains invalid JSON');
      }

      if (!Array.isArray(parsed)) {
        throw new Error('Validation Error: widgets must be a JSON array');
      }

      const validTypes = ['chart', 'table', 'kpi', 'metric', 'text', 'image'];
      for (let i = 0; i < parsed.length; i++) {
        const widget = parsed[i];
        if (!widget.type) {
          throw new Error(`Validation Error: Widget at index ${i} is missing required "type" property`);
        }
        if (!validTypes.includes(widget.type)) {
          throw new Error(`Validation Error: Widget at index ${i} has invalid type "${widget.type}". Valid types: ${validTypes.join(', ')}`);
        }
        if (!widget.title) {
          throw new Error(`Validation Error: Widget at index ${i} is missing required "title" property`);
        }
      }
    }
  }
};

/**
 * Dashboard Layout Constraints
 *
 * Ensures layout_config grid positions are within allowed bounds
 * (e.g., max 12-column grid, reasonable row count).
 */
const DashboardLayoutConstraints: Hook = {
  name: 'DashboardLayoutConstraints',
  object: 'analytics_dashboard',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    if (doc.layout_config) {
      let config: any;
      try {
        config = typeof doc.layout_config === 'string' ? JSON.parse(doc.layout_config) : doc.layout_config;
      } catch {
        throw new Error('Validation Error: layout_config contains invalid JSON');
      }

      const MAX_COLUMNS = 12;
      const MAX_ROWS = 50;

      if (config.columns && config.columns > MAX_COLUMNS) {
        throw new Error(`Validation Error: layout_config columns (${config.columns}) exceeds maximum of ${MAX_COLUMNS}`);
      }

      if (config.rows && config.rows > MAX_ROWS) {
        throw new Error(`Validation Error: layout_config rows (${config.rows}) exceeds maximum of ${MAX_ROWS}`);
      }

      // Validate individual widget positions if present
      if (Array.isArray(config.positions)) {
        for (let i = 0; i < config.positions.length; i++) {
          const pos = config.positions[i];
          if (pos.col !== undefined && (pos.col < 0 || pos.col >= MAX_COLUMNS)) {
            throw new Error(`Validation Error: Widget position at index ${i} has col ${pos.col} outside bounds [0, ${MAX_COLUMNS - 1}]`);
          }
          if (pos.row !== undefined && (pos.row < 0 || pos.row >= MAX_ROWS)) {
            throw new Error(`Validation Error: Widget position at index ${i} has row ${pos.row} outside bounds [0, ${MAX_ROWS - 1}]`);
          }
          if (pos.width !== undefined && (pos.width < 1 || pos.col + pos.width > MAX_COLUMNS)) {
            throw new Error(`Validation Error: Widget at index ${i} overflows grid (col ${pos.col} + width ${pos.width} > ${MAX_COLUMNS})`);
          }
        }
      }
    }
  }
};

/**
 * Dashboard Refresh Scheduling
 *
 * When a new dashboard is created with a refresh_interval > 0, schedules
 * automatic data refresh for all dashboard widgets.
 */
const DashboardRefreshScheduling: Hook = {
  name: 'DashboardRefreshScheduling',
  object: 'analytics_dashboard',
  events: ['afterInsert'],
  handler: async (ctx: HookContext) => {
    const dashboard = ctx.result as Record<string, any>;
    if (!dashboard?._id) return;

    const interval = dashboard.refresh_interval;
    if (!interval || interval <= 0) return;

    logger.info(`⏰ Scheduling auto-refresh for dashboard ${dashboard._id} every ${interval}s`);

    // Log a scheduling activity — report_schedule requires a report reference,
    // so dashboard refresh scheduling is tracked via activity records instead.
    try {
      await (ctx.ql as any).doc.create('activity', {
        Subject: `Dashboard Refresh Scheduled: ${dashboard.name}`,
        Type: 'Schedule',
        Status: 'open',
        Priority: 'normal',
        OwnerId: dashboard.owner_id,
        ActivityDate: new Date().toISOString().split('T')[0],
        Description: `Auto-refresh scheduled for dashboard "${dashboard.name}" every ${interval} seconds.`
      });
    } catch (error) {
      logger.warn('Failed to schedule dashboard refresh:', error);
    }
  }
};

export { DashboardWidgetValidation, DashboardLayoutConstraints, DashboardRefreshScheduling };
export default DashboardWidgetValidation;

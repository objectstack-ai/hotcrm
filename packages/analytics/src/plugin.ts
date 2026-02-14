/**
 * @hotcrm/analytics - Analytics Plugin Definition
 * 
 * This plugin provides analytics and reporting functionality including:
 * - Report Builder & Library
 * - Dashboard Management
 * - KPI Tracking & Scorecards
 * - Metric Computation
 * - Data Source Integration
 * - AI-Powered Insights
 * 
 * Dependencies: @hotcrm/crm, @hotcrm/finance, @hotcrm/support
 */

import { PluginSchema } from '@objectstack/spec/kernel';
import type { PluginDefinition } from '@objectstack/spec/kernel';

// Import all Analytics objects
import { Report } from './report.object.js';
import { ReportSchedule } from './report_schedule.object.js';
import { AnalyticsDashboard } from './analytics_dashboard.object.js';
import { KPI } from './kpi.object.js';
import { Metric } from './metric.object.js';
import { DataSource } from './data_source.object.js';
import { SavedFilter } from './saved_filter.object.js';
import { Snapshot } from './snapshot.object.js';

// Import hooks
import { ReportFilterValidation, ReportAccessControl, ReportCacheInvalidation, ReportExecutionTracking } from './report.hook.js';
import { ScheduleValidation, NextRunCalculation, ScheduleDeactivation } from './report_schedule.hook.js';
import { DashboardWidgetValidation, DashboardLayoutConstraints, DashboardRefreshScheduling } from './analytics_dashboard.hook.js';
import { KPIThresholdAlert, KPITrendCalculation, KPIAutoRefresh } from './kpi.hook.js';
import { MetricFormulaValidation, MetricCircularDependency, MetricAggregationComputation } from './metric.hook.js';
import { ConnectionHealthCheck, SyncLifecycle, SchemaDriftDetection } from './data_source.hook.js';

// Import actions
import DashboardAIAction from './actions/dashboard_ai.action.js';
import ForecastAnalyticsAction from './actions/forecast_analytics.action.js';
import InsightAIAction from './actions/insight_ai.action.js';
import ReportAIAction from './actions/report_ai.action.js';

/**
 * Analytics Plugin Definition
 * 
 * Exports all analytics-related business objects, hooks, and actions
 * to be registered with the ObjectStack runtime
 */
export const AnalyticsPlugin = {
  name: 'analytics',
  label: 'Analytics Cloud',
  version: '1.0.0',
  description: 'Analytics and reporting - Reports, Dashboards, KPIs, Metrics, and AI-Powered Insights',
  
  // Plugin dependencies
  dependencies: ['crm', 'finance', 'support'],
  
  // Plugin initialization
  init: async () => {
    // No initialization required for this plugin
  },
  
  // Business objects provided by this plugin
  objects: {
    report: Report,
    report_schedule: ReportSchedule,
    analytics_dashboard: AnalyticsDashboard,
    kpi: KPI,
    metric: Metric,
    data_source: DataSource,
    saved_filter: SavedFilter,
    snapshot: Snapshot,
  },
  
  // Actions provided by this plugin
  actions: {
    dashboard_ai: DashboardAIAction,
    forecast_analytics: ForecastAnalyticsAction,
    insight_ai: InsightAIAction,
    report_ai: ReportAIAction,
  },

  // Triggers/Hooks
  triggers: {
    report_filter_validation: ReportFilterValidation,
    report_access_control: ReportAccessControl,
    report_cache_invalidation: ReportCacheInvalidation,
    report_execution_tracking: ReportExecutionTracking,
    schedule_validation: ScheduleValidation,
    next_run_calculation: NextRunCalculation,
    schedule_deactivation: ScheduleDeactivation,
    dashboard_widget_validation: DashboardWidgetValidation,
    dashboard_layout_constraints: DashboardLayoutConstraints,
    dashboard_refresh_scheduling: DashboardRefreshScheduling,
    kpi_threshold_alert: KPIThresholdAlert,
    kpi_trend_calculation: KPITrendCalculation,
    kpi_auto_refresh: KPIAutoRefresh,
    metric_formula_validation: MetricFormulaValidation,
    metric_circular_dependency: MetricCircularDependency,
    metric_aggregation_computation: MetricAggregationComputation,
    connection_health_check: ConnectionHealthCheck,
    sync_lifecycle: SyncLifecycle,
    schema_drift_detection: SchemaDriftDetection,
  },

  // Apps provided by this plugin
  apps: [
    {
      name: 'analytics',
      label: 'Analytics Cloud',
      navigation: [
        {
          id: 'reports',
          type: 'group',
          label: 'Reports',
          children: [
            { id: 'report', label: 'Report', type: 'object', objectName: 'report' },
            { id: 'report_schedule', label: 'Report Schedule', type: 'object', objectName: 'report_schedule' },
            { id: 'saved_filter', label: 'Saved Filter', type: 'object', objectName: 'saved_filter' },
            { id: 'snapshot', label: 'Snapshot', type: 'object', objectName: 'snapshot' },
          ]
        },
        {
          id: 'dashboards',
          type: 'group',
          label: 'Dashboards',
          children: [
            { id: 'analytics_dashboard', label: 'Dashboard', type: 'object', objectName: 'analytics_dashboard' },
            { id: 'kpi', label: 'KPI', type: 'object', objectName: 'kpi' },
            { id: 'metric', label: 'Metric', type: 'object', objectName: 'metric' },
          ]
        },
        {
          id: 'configuration',
          type: 'group',
          label: 'Configuration',
          children: [
            { id: 'data_source', label: 'Data Source', type: 'object', objectName: 'data_source' },
          ]
        }
      ]
    }
  ]
};

/** Spec-validated plugin metadata */
export const AnalyticsPluginMetadata: PluginDefinition = PluginSchema.parse({
  name: 'analytics',
  label: 'Analytics Cloud',
  version: '1.0.0',
  description: 'Analytics and reporting - Reports, Dashboards, KPIs, Metrics, and AI-Powered Insights',
});

export default AnalyticsPlugin;

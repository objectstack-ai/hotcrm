/**
 * @hotcrm/analytics - Analytics Cloud Plugin Definition
 *
 * This plugin provides analytics and business intelligence capabilities including:
 * - Report Builder & Library
 * - Dashboard Management
 * - KPI Tracking & Alerts
 * - Business Metrics & Calculations
 * - Data Source Integration
 * - AI-Powered Insights & Forecasting
 *
 * Dependencies: @objectstack/spec (required)
 */

import { PluginSchema } from '@objectstack/spec/kernel';
import type { PluginDefinition } from '@objectstack/spec/kernel';

// Import all analytics objects
import { Report } from './report.object';
import { ReportSchedule } from './report_schedule.object';
import { AnalyticsDashboard } from './analytics_dashboard.object';
import { KPI } from './kpi.object';
import { Metric } from './metric.object';
import { DataSource } from './data_source.object';
import { SavedFilter } from './saved_filter.object';
import { Snapshot } from './snapshot.object';

// Import hooks
import { ReportValidationTrigger, ReportCreationTrigger } from './hooks/report.hook';
import { DashboardValidationTrigger, DashboardRefreshTrigger } from './hooks/analytics_dashboard.hook';
import { KPIValidationTrigger, KPIThresholdAlertTrigger } from './hooks/kpi.hook';
import { MetricValidationTrigger } from './hooks/metric.hook';
import { ReportScheduleValidationTrigger, ReportScheduleRecalcTrigger } from './hooks/report_schedule.hook';
import { DataSourceValidationTrigger, DataSourceSyncHealthTrigger } from './hooks/data_source.hook';

// Import actions
import ReportAIAction from './actions/report_ai.action';
import DashboardAIAction from './actions/dashboard_ai.action';
import InsightAIAction from './actions/insight_ai.action';
import ForecastAnalyticsAction from './actions/forecast_analytics.action';

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
  description: 'Reports, Dashboards, KPIs, Metrics, and Business Intelligence',

  dependencies: [],

  init: async () => {
    // No initialization required for this plugin
  },

  actions: {
    report_ai: ReportAIAction,
    dashboard_ai: DashboardAIAction,
    insight_ai: InsightAIAction,
    forecast_analytics: ForecastAnalyticsAction,
  },

  triggers: {
    report_validation: ReportValidationTrigger,
    report_creation: ReportCreationTrigger,
    dashboard_validation: DashboardValidationTrigger,
    dashboard_refresh: DashboardRefreshTrigger,
    kpi_validation: KPIValidationTrigger,
    kpi_threshold_alert: KPIThresholdAlertTrigger,
    metric_validation: MetricValidationTrigger,
    report_schedule_validation: ReportScheduleValidationTrigger,
    report_schedule_recalc: ReportScheduleRecalcTrigger,
    data_source_validation: DataSourceValidationTrigger,
    data_source_sync_health: DataSourceSyncHealthTrigger,
  },

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
            { id: 'report', label: 'Reports', type: 'object', objectName: 'report' },
            { id: 'report_schedule', label: 'Schedules', type: 'object', objectName: 'report_schedule' },
            { id: 'saved_filter', label: 'Saved Filters', type: 'object', objectName: 'saved_filter' },
          ]
        },
        {
          id: 'dashboards',
          type: 'group',
          label: 'Dashboards',
          children: [
            { id: 'analytics_dashboard', label: 'Dashboards', type: 'object', objectName: 'analytics_dashboard' },
            { id: 'kpi', label: 'KPIs', type: 'object', objectName: 'kpi' },
            { id: 'metric', label: 'Metrics', type: 'object', objectName: 'metric' },
          ]
        },
        {
          id: 'data',
          type: 'group',
          label: 'Data',
          children: [
            { id: 'data_source', label: 'Data Sources', type: 'object', objectName: 'data_source' },
            { id: 'snapshot', label: 'Snapshots', type: 'object', objectName: 'snapshot' },
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
  description: 'Reports, Dashboards, KPIs, Metrics, and Business Intelligence',
});

export default AnalyticsPlugin;

/**
 * Analytics Domain Event Definitions
 *
 * Defines the event contracts for cross-package communication.
 * Other plugins can subscribe to these events to react to Analytics domain changes.
 */

export const AnalyticsEvents = {
  reportExecuted: {
    name: 'analytics.report.executed',
    type: 'domain' as const,
    description: 'Fired when a report is executed and results are generated',
  },
  dashboardRefreshed: {
    name: 'analytics.dashboard.refreshed',
    type: 'domain' as const,
    description: 'Fired when a dashboard is refreshed with updated data',
  },
  kpiThresholdBreached: {
    name: 'analytics.kpi.threshold_breached',
    type: 'domain' as const,
    description: 'Fired when a KPI value crosses a warning or critical threshold',
  },
  dataSourceSynced: {
    name: 'analytics.data_source.synced',
    type: 'domain' as const,
    description: 'Fired when a data source completes a sync operation',
  },
};

/**
 * Analytics Domain Event Definitions
 *
 * Defines the event contracts for cross-package communication.
 * Other plugins can subscribe to these events to react to Analytics domain changes.
 */
import { EventTypeDefinitionSchema } from '@objectstack/spec/kernel';

export const AnalyticsEvents = {
  reportExecuted: EventTypeDefinitionSchema.parse({
    name: 'analytics.report.executed',
    description: 'Fired when a report is executed and results are generated',
  }),
  dashboardRefreshed: EventTypeDefinitionSchema.parse({
    name: 'analytics.dashboard.refreshed',
    description: 'Fired when a dashboard is refreshed with updated data',
  }),
  kpiThresholdBreached: EventTypeDefinitionSchema.parse({
    name: 'analytics.kpi.threshold_breached',
    description: 'Fired when a KPI value crosses a warning or critical threshold',
  }),
  dataSourceSynced: EventTypeDefinitionSchema.parse({
    name: 'analytics.data_source.synced',
    description: 'Fired when a data source completes a sync operation',
  }),
};

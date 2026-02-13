import { PluginCapabilityManifestSchema } from '@objectstack/spec/kernel';

/**
 * Analytics Plugin Capability Manifest
 *
 * Declares the capabilities provided by the Analytics Cloud plugin
 * for cross-package discovery and AI agent tooling.
 */
export const AnalyticsCapabilities = PluginCapabilityManifestSchema.parse({
  name: 'analytics',
  version: '1.0.0',
  capabilities: [
    { name: 'report_management', description: 'Report creation, execution, scheduling, and export' },
    { name: 'dashboard_management', description: 'Dashboard canvas with drag-and-drop widget placement' },
    { name: 'kpi_tracking', description: 'KPI scorecard tracking with thresholds and trend analysis' },
    { name: 'metric_computation', description: 'Custom metric formulas, aggregations, and computed fields' },
    { name: 'data_source_management', description: 'Data source connection, sync, and schema management' },
    { name: 'insight_generation', description: 'AI-powered anomaly detection, trend analysis, and executive summaries' },
  ],
});

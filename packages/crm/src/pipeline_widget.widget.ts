import type { WidgetManifest } from '@objectstack/spec/ui';
import { WidgetManifestSchema } from '@objectstack/spec/ui';

/**
 * Pipeline Summary Widget
 * Displays total pipeline value, deal count by stage, and trend indicators
 */
export const PipelineWidget = {
  name: 'pipeline_summary',
  label: 'Pipeline Summary',
  description: 'Displays total pipeline value, deal count by stage, and trend indicators',
  version: '1.0.0',
  category: 'display' as const,
  icon: 'bar-chart-2',
  properties: [
    { name: 'objectName', label: 'Object', type: 'string' as const, required: true, default: 'opportunity', description: 'Source object for pipeline data' },
    { name: 'stageField', label: 'Stage Field', type: 'string' as const, required: true, default: 'stage', description: 'Field used for stage grouping' },
    { name: 'valueField', label: 'Value Field', type: 'string' as const, required: true, default: 'amount', description: 'Field for value aggregation' },
    { name: 'refreshInterval', label: 'Refresh Interval (s)', type: 'number' as const, default: 60, description: 'Auto-refresh interval in seconds' },
    { name: 'showTrend', label: 'Show Trend', type: 'boolean' as const, default: true, description: 'Display period-over-period trend' }
  ]
} satisfies WidgetManifest;

WidgetManifestSchema.parse(PipelineWidget);

export default PipelineWidget;

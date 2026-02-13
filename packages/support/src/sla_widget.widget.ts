import type { WidgetManifest } from '@objectstack/spec/ui';
import { WidgetManifestSchema } from '@objectstack/spec/ui';

/**
 * SLA Compliance Widget
 * Displays SLA met/breached/at-risk counts and compliance percentage
 */
export const SlaWidget = {
  name: 'sla_compliance',
  label: 'SLA Compliance',
  description: 'Displays SLA compliance metrics with met, breached, and at-risk counts',
  version: '1.0.0',
  category: 'display' as const,
  icon: 'shield-check',
  properties: [
    { name: 'objectName', label: 'Object', type: 'string' as const, required: true, default: 'case', description: 'Source object for SLA data' },
    { name: 'slaField', label: 'SLA Status Field', type: 'string' as const, required: true, default: 'sla_status', description: 'Field tracking SLA compliance status' },
    { name: 'periodDays', label: 'Period (days)', type: 'number' as const, default: 30, description: 'Rolling period for compliance calculation' },
    { name: 'targetPercent', label: 'Target %', type: 'number' as const, default: 95, description: 'SLA compliance target percentage' },
    { name: 'showBreakdown', label: 'Show Breakdown', type: 'boolean' as const, default: true, description: 'Display detailed met/breached/at-risk breakdown' }
  ]
} satisfies WidgetManifest;

WidgetManifestSchema.parse(SlaWidget);

export default SlaWidget;

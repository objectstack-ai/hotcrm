import type { WidgetManifest } from '@objectstack/spec/ui';
import { WidgetManifestSchema } from '@objectstack/spec/ui';

/**
 * Headcount Widget
 * Displays total headcount, new hires, and departures this month
 */
export const HeadcountWidget = {
  name: 'headcount_summary',
  label: 'Headcount Summary',
  description: 'Displays total headcount, new hires, and departures for the current month',
  version: '1.0.0',
  category: 'display' as const,
  icon: 'users',
  properties: [
    { name: 'objectName', label: 'Object', type: 'string' as const, required: true, default: 'employee', description: 'Source object for headcount data' },
    { name: 'departmentField', label: 'Department Field', type: 'string' as const, required: false, default: 'department', description: 'Field for department grouping' },
    { name: 'statusField', label: 'Status Field', type: 'string' as const, required: true, default: 'status', description: 'Employment status field' },
    { name: 'hireDateField', label: 'Hire Date Field', type: 'string' as const, required: false, default: 'hire_date', description: 'Date of hire field' },
    { name: 'showDepartmentBreakdown', label: 'Show Department Breakdown', type: 'boolean' as const, required: false, default: false, description: 'Show headcount by department' }
  ]
} satisfies WidgetManifest;

WidgetManifestSchema.parse(HeadcountWidget);

export default HeadcountWidget;

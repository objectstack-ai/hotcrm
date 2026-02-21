import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Report Builder Form Definition
 * Wizard-style form for building analytics reports.
 * Sections cover data source selection, column configuration, and display settings.
 */
export const ReportBuilderForm = {
  type: 'simple' as const,
  data: {
    provider: 'object' as const,
    object: 'report'
  },
  sections: [
    {
      label: 'Data Source',
      columns: '2' as const,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'object_name', required: true, placeholder: 'Select the object to report on' },
        { field: 'report_type', required: true, helpText: 'Summary, tabular, or matrix report format' }
      ]
    },
    {
      label: 'Columns',
      columns: '1' as const,
      collapsible: true,
      collapsed: false,
      fields: [
        { field: 'columns', placeholder: 'Select fields to include as report columns' },
        { field: 'filters', placeholder: 'Define filter criteria for the report' },
        { field: 'groupings_down', placeholder: 'Select fields to group rows by' }
      ]
    },
    {
      label: 'Display',
      columns: '2' as const,
      collapsible: true,
      collapsed: false,
      fields: [
        { field: 'chart_type', helpText: 'Choose a chart type for visual representation' },
        { field: 'show_totals' },
        { field: 'show_grand_total' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(ReportBuilderForm);

export default ReportBuilderForm;

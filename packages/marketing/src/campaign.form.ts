import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Campaign Form Definition
 * Tabbed layout for creating and editing Campaign records.
 */
export const CampaignForm = {
  type: 'tabbed' as const,
  data: {
    provider: 'object' as const,
    object: 'campaign'
  },
  sections: [
    {
      label: 'Campaign Details',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'name', required: true, placeholder: 'Campaign name' },
        { field: 'type', required: true },
        { field: 'status' },
        { field: 'start_date', required: true },
        { field: 'end_date', required: true },
        { field: 'is_active' },
        { field: 'description', colSpan: 2, widget: 'richtext' }
      ]
    },
    {
      label: 'Targeting',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'parent_campaign', label: 'Parent Campaign' },
        { field: 'marketing_list', label: 'Target List' },
        { field: 'expected_response_rate', helpText: 'Percentage of expected responses' },
        { field: 'num_sent', readonly: true }
      ]
    },
    {
      label: 'Budget',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'budgeted_cost', required: true },
        { field: 'actual_cost', readonly: true },
        { field: 'expected_revenue' },
        { field: 'actual_revenue', readonly: true },
        { field: 'num_converted_leads', readonly: true, helpText: 'Leads converted from this campaign' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(CampaignForm);

export default CampaignForm;

import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Opportunity Form Definition
 * Tabbed layout for creating and editing Opportunity records.
 * Leverages FormView features: tabbed layout, visibleOn, placeholder, helpText.
 */
export const OpportunityForm = {
  type: 'tabbed' as const,
  data: {
    provider: 'object' as const,
    object: 'opportunity'
  },
  sections: [
    {
      label: 'Deal Information',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'name', required: true, placeholder: 'Enter deal name' },
        { field: 'account_id', label: 'Account' },
        { field: 'contact_id', label: 'Contact' },
        { field: 'amount', helpText: 'Total deal value in base currency' },
        { field: 'close_date', required: true },
        { field: 'stage', required: true },
        { field: 'probability', readonly: true, helpText: 'Auto-calculated from stage' },
        { field: 'lead_source' },
        { field: 'type' }
      ]
    },
    {
      label: 'Forecast Details',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'forecast_category', visibleOn: { dialect: 'cel', source: `stage != 'Prospecting'` } },
        { field: 'expected_revenue', readonly: true, helpText: 'Amount × Probability' },
        { field: 'next_step', colSpan: 2, placeholder: 'Describe the next action to advance this deal' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(OpportunityForm);

export default OpportunityForm;

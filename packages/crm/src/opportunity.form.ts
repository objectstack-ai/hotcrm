import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Opportunity Form Definition
 * Layout for creating and editing Opportunity records
 */
export const OpportunityForm = {
  type: 'simple' as const,
  data: {
    provider: 'object' as const,
    object: 'opportunity'
  },
  sections: [
    {
      label: 'Deal Information',
      columns: '2' as const,
      fields: [
        { field: 'name', required: true },
        { field: 'account_id', label: 'Account' },
        { field: 'contact_id', label: 'Contact' },
        { field: 'amount' },
        { field: 'close_date', required: true },
        { field: 'stage', required: true },
        { field: 'probability' },
        { field: 'lead_source' },
        { field: 'type' }
      ]
    },
    {
      label: 'Forecast Details',
      columns: '2' as const,
      fields: [
        { field: 'forecast_category' },
        { field: 'expected_revenue' },
        { field: 'next_step', colSpan: 2 }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(OpportunityForm);

export default OpportunityForm;

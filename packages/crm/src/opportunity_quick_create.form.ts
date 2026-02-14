import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Opportunity Quick Create Form Definition
 * Drawer layout for rapidly creating Opportunity records.
 */
export const OpportunityQuickCreateForm = {
  type: 'drawer' as const,
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
        { field: 'amount' },
        { field: 'close_date', required: true },
        { field: 'stage', required: true }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(OpportunityQuickCreateForm);

export default OpportunityQuickCreateForm;

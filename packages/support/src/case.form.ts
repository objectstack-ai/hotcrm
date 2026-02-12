import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Case Form Definition
 * Layout for creating and editing Case records
 */
export const CaseForm = {
  type: 'simple' as const,
  data: {
    provider: 'object' as const,
    object: 'case'
  },
  sections: [
    {
      label: 'Case Information',
      columns: '2' as const,
      fields: [
        { field: 'subject', required: true },
        { field: 'status', required: true },
        { field: 'priority', required: true },
        { field: 'severity' },
        { field: 'type' },
        { field: 'origin' },
        { field: 'account_id', label: 'Account' },
        { field: 'contact_id', label: 'Contact' }
      ]
    },
    {
      label: 'Description',
      columns: '2' as const,
      fields: [
        { field: 'description', colSpan: 2 }
      ]
    },
    {
      label: 'Assignment',
      columns: '2' as const,
      fields: [
        { field: 'owner_id', label: 'Owner' },
        { field: 'sla_level' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(CaseForm);

export default CaseForm;

import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Case Quick Create Form Definition
 * Modal layout for rapidly creating Case records with essential fields.
 */
export const CaseQuickCreateForm = {
  type: 'modal' as const,
  data: {
    provider: 'object' as const,
    object: 'case'
  },
  sections: [
    {
      label: 'Case Information',
      columns: '1' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'subject', required: true, placeholder: 'Brief case summary' },
        { field: 'priority' },
        { field: 'description', widget: 'richtext' },
        { field: 'contact_id', label: 'Contact' },
        { field: 'origin' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(CaseQuickCreateForm);

export default CaseQuickCreateForm;

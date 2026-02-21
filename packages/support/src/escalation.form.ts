import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Case Escalation Form Definition
 * Layout for creating and managing case escalation records.
 * Leverages FormView features: collapsible sections, widget, placeholder, helpText.
 */
export const EscalationForm = {
  type: 'simple' as const,
  data: {
    provider: 'object' as const,
    object: 'escalation'
  },
  sections: [
    {
      label: 'Escalation Details',
      columns: 2,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'case_id', required: true },
        { field: 'escalation_reason', required: true, widget: 'richtext', placeholder: 'Describe the reason for escalation' },
        { field: 'priority', required: true, helpText: 'Escalation priority level' },
        { field: 'severity' }
      ]
    },
    {
      label: 'Assignment',
      columns: 2,
      collapsible: true,
      collapsed: false,
      fields: [
        { field: 'escalated_to', required: true },
        { field: 'escalation_team' },
        { field: 'target_resolution_date' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(EscalationForm);

export default EscalationForm;

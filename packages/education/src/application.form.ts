import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Application Form
 * Form for submitting student admissions applications.
 */
export const ApplicationForm = {
  type: 'simple' as const,
  data: {
    provider: 'object' as const,
    object: 'application_form'
  },
  sections: [
    {
      label: 'Applicant Information',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'applicant_name', required: true, placeholder: 'Full legal name' },
        { field: 'email', required: true, placeholder: 'Email address' },
        { field: 'program', required: true, placeholder: 'Select program' },
        { field: 'application_date', required: true }
      ]
    },
    {
      label: 'Academic Background',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'gpa', required: true, placeholder: 'High school GPA (0-4.0)' },
        { field: 'test_scores', placeholder: 'SAT/ACT scores' },
        { field: 'recommendations', placeholder: 'Number of letters' }
      ]
    },
    {
      label: 'Essays & Supporting Materials',
      columns: '1' as any,
      collapsible: true,
      collapsed: false,
      fields: [
        { field: 'essays', colSpan: 2, widget: 'richtext' },
        { field: 'notes', placeholder: 'Additional notes or comments' }
      ]
    },
    {
      label: 'Review Decision',
      columns: '2' as any,
      collapsible: true,
      collapsed: true,
      fields: [
        { field: 'status', required: true },
        { field: 'decision' },
        { field: 'decision_date', visibleOn: { dialect: 'cel', source: 'decision != "pending"' } }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(ApplicationForm);

export default ApplicationForm;

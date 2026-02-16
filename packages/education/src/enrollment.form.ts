import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Enrollment Form
 * Wizard-style form for course enrollment: course selection → prerequisites check → confirm.
 */
export const EnrollmentForm = {
  type: 'wizard' as const,
  data: {
    provider: 'object' as const,
    object: 'enrollment'
  },
  sections: [
    {
      label: 'Course Selection',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'student_id', required: true, placeholder: 'Search for student' },
        { field: 'course_id', required: true, placeholder: 'Search for course' },
        { field: 'term', required: true },
        { field: 'credits', required: true }
      ]
    },
    {
      label: 'Prerequisites Check',
      columns: '1' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'enrollment_date', required: true },
        { field: 'status', required: true }
      ]
    },
    {
      label: 'Confirmation',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'student_id', required: true },
        { field: 'course_id', required: true },
        { field: 'term', required: true },
        { field: 'credits', required: true },
        { field: 'enrollment_date', required: true }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(EnrollmentForm);

export default EnrollmentForm;

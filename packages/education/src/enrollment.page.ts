import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Enrollment Record Page Layout
 * Enrollment detail with course assignment, grade, and status information.
 */
export const EnrollmentPage = {
  name: 'enrollment_detail',
  object: 'enrollment',
  type: 'record' as const,
  label: 'Enrollment Record',
  template: 'record_detail',
  isDefault: true,
  assignedProfiles: ['faculty', 'registrar', 'student', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['student_id', 'course_id', 'term', 'status', 'grade']
          }
        }
      ]
    },
    {
      name: 'details',
      components: [
        {
          type: 'record:details' as const,
          label: 'Enrollment Details',
          properties: {
            fields: [
              'student_id', 'course_id', 'term', 'enrollment_date',
              'status', 'credits'
            ],
            columns: 2
          }
        },
        {
          type: 'record:details' as const,
          label: 'Grade Information',
          properties: {
            fields: ['grade'],
            columns: 2
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(EnrollmentPage);

export default EnrollmentPage;

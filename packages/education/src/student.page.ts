import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Student Record Page Layout
 * Comprehensive student view with demographics, academic info, enrollments, and financial aid.
 */
export const StudentPage = {
  name: 'student_detail',
  object: 'student',
  type: 'record' as const,
  kind: 'full' as const,
  label: 'Student Record',
  template: 'record_detail',
  isDefault: true,
  assignedProfiles: ['faculty', 'registrar', 'financial_aid', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['name', 'enrollment_status', 'student_id_number', 'program', 'gpa']
          }
        }
      ]
    },
    {
      name: 'tabs',
      components: [
        {
          type: 'page:tabs' as const,
          properties: {
            tabs: ['demographics', 'academic', 'enrollment', 'financial_aid']
          }
        }
      ]
    },
    {
      name: 'demographics',
      components: [
        {
          type: 'record:details' as const,
          label: 'Personal Information',
          properties: {
            fields: [
              'name', 'email', 'phone', 'student_id_number'
            ],
            columns: 2
          }
        },
        {
          type: 'record:details' as const,
          label: 'Academic Profile',
          properties: {
            fields: ['program', 'major', 'minor', 'year'],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'academic',
      components: [
        {
          type: 'record:details' as const,
          label: 'Academic Standing',
          properties: {
            fields: ['gpa', 'year', 'advisor_id', 'graduation_date'],
            columns: 2
          }
        },
        {
          type: 'record:related_list' as const,
          label: 'Course History',
          properties: {
            object: 'enrollment',
            columns: ['course_id', 'term', 'grade', 'credits', 'status'],
            sort: [{ field: 'term', direction: 'desc' }],
            actions: ['new', 'edit']
          }
        }
      ]
    },
    {
      name: 'enrollment',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Current Enrollments',
          properties: {
            object: 'enrollment',
            columns: ['course_id', 'term', 'status', 'enrollment_date'],
            sort: [{ field: 'enrollment_date', direction: 'desc' }],
            actions: ['new', 'edit', 'delete']
          }
        }
      ]
    },
    {
      name: 'financial_aid',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Scholarships',
          properties: {
            object: 'scholarship',
            columns: ['name', 'amount', 'status', 'academic_year'],
            actions: ['new', 'edit']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(StudentPage);

export default StudentPage;

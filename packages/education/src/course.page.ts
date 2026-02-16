import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Course Record Page Layout
 * Course catalog detail with schedule, enrollment, and prerequisites.
 */
export const CoursePage = {
  name: 'course_detail',
  object: 'course',
  type: 'record' as const,
  label: 'Course Record',
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
            fields: ['name', 'course_code', 'department', 'credits', 'status']
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
            tabs: ['course_info', 'schedule', 'enrollment', 'prerequisites']
          }
        }
      ]
    },
    {
      name: 'course_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Course Details',
          properties: {
            fields: [
              'name', 'course_code', 'department', 'credits',
              'instructor_id', 'capacity', 'status'
            ],
            columns: 2
          }
        },
        {
          type: 'record:details' as const,
          label: 'Description',
          properties: {
            fields: ['description'],
            columns: 1
          }
        }
      ]
    },
    {
      name: 'schedule',
      components: [
        {
          type: 'record:details' as const,
          label: 'Schedule Information',
          properties: {
            fields: ['schedule', 'capacity'],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'enrollment',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Enrolled Students',
          properties: {
            object: 'enrollment',
            columns: ['student_id', 'term', 'status', 'grade', 'enrollment_date'],
            sort: [{ field: 'enrollment_date', direction: 'desc' }],
            actions: ['new', 'edit', 'delete']
          }
        }
      ]
    },
    {
      name: 'prerequisites',
      components: [
        {
          type: 'record:details' as const,
          label: 'Prerequisite Courses',
          properties: {
            fields: ['prerequisites'],
            columns: 1
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(CoursePage);

export default CoursePage;

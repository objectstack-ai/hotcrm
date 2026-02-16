import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Course Catalog Views
 */

export const AllCoursesView = {
  list: {
    type: 'grid' as const,
    name: 'all_courses',
    label: 'All Courses',
    columns: [
      { field: 'course_code', width: 120, sortable: true, link: true },
      { field: 'name', width: 200, sortable: true, link: true },
      { field: 'department', width: 150, sortable: true },
      { field: 'credits', width: 80, sortable: true, align: 'right' as const },
      { field: 'instructor_id', width: 150, sortable: true },
      { field: 'capacity', width: 100, align: 'right' as const },
      { field: 'schedule', width: 150 },
      { field: 'status', width: 100, sortable: true }
    ],
    sort: [{ field: 'course_code', order: 'asc' as const }],
    bulkActions: ['delete', 'export'],
    inlineEdit: true,
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

export const ActiveCoursesView = {
  list: {
    type: 'grid' as const,
    name: 'active_courses',
    label: 'Active Courses',
    filter: [['status', '=', 'active']],
    columns: [
      { field: 'course_code', width: 120, link: true },
      { field: 'name', width: 200, link: true },
      { field: 'department', width: 150 },
      { field: 'credits', width: 80, align: 'right' as const },
      { field: 'instructor_id', width: 150 },
      { field: 'capacity', width: 100, align: 'right' as const },
      { field: 'schedule', width: 150 }
    ],
    sort: [{ field: 'department', order: 'asc' as const }]
  }
} satisfies View;

export const CoursesByDepartmentView = {
  list: {
    type: 'grid' as const,
    name: 'courses_by_department',
    label: 'Courses by Department',
    columns: [
      { field: 'department', width: 150, sortable: true },
      { field: 'course_code', width: 120, link: true },
      { field: 'name', width: 200, link: true },
      { field: 'credits', width: 80, align: 'right' as const },
      { field: 'instructor_id', width: 150 },
      { field: 'status', width: 100 }
    ],
    sort: [
      { field: 'department', order: 'asc' as const },
      { field: 'course_code', order: 'asc' as const }
    ]
  }
} satisfies View;

ViewSchema.parse(AllCoursesView);
ViewSchema.parse(ActiveCoursesView);
ViewSchema.parse(CoursesByDepartmentView);

export const CourseListViews = {
  all: AllCoursesView,
  active: ActiveCoursesView,
  byDepartment: CoursesByDepartmentView
};

export default CourseListViews;

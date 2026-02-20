import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Student List Views
 */

export const AllStudentsView = {
  list: {
    type: 'grid' as const,
    name: 'all_students',
    label: 'All Students',
    columns: [
      { field: 'name', width: 180, sortable: true, link: true },
      { field: 'student_id_number', width: 120, sortable: true },
      { field: 'email', width: 180, sortable: true },
      { field: 'program', width: 150, sortable: true },
      { field: 'major', width: 130, sortable: true },
      { field: 'year', width: 100, sortable: true },
      { field: 'gpa', width: 80, sortable: true, align: 'right' as const },
      { field: 'enrollment_status', width: 120, sortable: true }
    ],
    sort: [{ field: 'name', order: 'asc' as const }],
    bulkActions: ['delete', 'export'],
    inlineEdit: true,
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

export const ActiveStudentsView = {
  list: {
    type: 'grid' as const,
    name: 'active_students',
    label: 'Active Students',
    filter: [['enrollment_status', '=', 'enrolled']],
    columns: [
      { field: 'name', width: 180, link: true },
      { field: 'student_id_number', width: 120 },
      { field: 'program', width: 150 },
      { field: 'major', width: 130 },
      { field: 'year', width: 100 },
      { field: 'gpa', width: 80, align: 'right' as const },
      { field: 'advisor_id', width: 150 }
    ],
    sort: [{ field: 'name', order: 'asc' as const }]
  }
} satisfies View;

export const GraduatedStudentsView = {
  list: {
    type: 'grid' as const,
    name: 'graduated_students',
    label: 'Graduated Students',
    filter: [['enrollment_status', '=', 'graduated']],
    columns: [
      { field: 'name', width: 180, link: true },
      { field: 'student_id_number', width: 120 },
      { field: 'program', width: 150 },
      { field: 'major', width: 130 },
      { field: 'gpa', width: 80, align: 'right' as const },
      { field: 'graduation_date', width: 130 }
    ],
    sort: [{ field: 'graduation_date', order: 'desc' as const }]
  }
} satisfies View;

export const OnProbationView = {
  list: {
    type: 'grid' as const,
    name: 'on_probation',
    label: 'On Probation',
    filter: [['gpa', '<', '2.0']],
    columns: [
      { field: 'name', width: 180, link: true },
      { field: 'student_id_number', width: 120 },
      { field: 'program', width: 150 },
      { field: 'major', width: 130 },
      { field: 'gpa', width: 80, align: 'right' as const },
      { field: 'advisor_id', width: 150 },
      { field: 'year', width: 100 }
    ],
    sort: [{ field: 'gpa', order: 'asc' as const }],
    conditionalFormatting: [
      { condition: 'gpa < 2.0', style: { color: '#EF4444', fontWeight: 'bold' } }
    ]
  }
} satisfies View;

ViewSchema.parse(AllStudentsView);
ViewSchema.parse(ActiveStudentsView);
ViewSchema.parse(GraduatedStudentsView);
ViewSchema.parse(OnProbationView);

export const StudentListViews = {
  all: AllStudentsView,
  active: ActiveStudentsView,
  graduated: GraduatedStudentsView,
  onProbation: OnProbationView
};

export default StudentListViews;

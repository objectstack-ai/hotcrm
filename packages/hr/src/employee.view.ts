import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Employee List Views
 */

export const AllEmployeesView = {
  list: {
    name: 'all_employees',
    label: 'All Employees',
    columns: [
      { field: 'employee_number', width: 130, sortable: true, link: true },
      { field: 'full_name', width: 200, sortable: true, link: true },
      { field: 'department_id', width: 180, sortable: true },
      { field: 'position_id', width: 180, sortable: true },
      { field: 'employment_status', width: 130, sortable: true },
      { field: 'hire_date', width: 130, sortable: true },
      { field: 'work_location', width: 150 }
    ],
    sort: [{ field: 'full_name', order: 'asc' as const }],
    bulkActions: ['delete', 'export'],
    inlineEdit: true,
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

export const ActiveEmployeesView = {
  list: {
    name: 'active_employees',
    label: 'Active Employees',
    filter: [['employment_status', '=', 'active']],
    columns: [
      { field: 'employee_number', width: 130, link: true },
      { field: 'full_name', width: 200, link: true },
      { field: 'department_id', width: 180 },
      { field: 'position_id', width: 180 },
      { field: 'hire_date', width: 130 },
      { field: 'work_location', width: 150 }
    ],
    sort: [{ field: 'full_name', order: 'asc' as const }]
  }
} satisfies View;

export const ByDepartmentView = {
  list: {
    name: 'by_department',
    label: 'By Department',
    columns: [
      { field: 'department_id', width: 180, sortable: true },
      { field: 'employee_number', width: 130, link: true },
      { field: 'full_name', width: 200, link: true },
      { field: 'position_id', width: 180 },
      { field: 'employment_status', width: 130 },
      { field: 'hire_date', width: 130 }
    ],
    sort: [
      { field: 'department_id', order: 'asc' as const },
      { field: 'full_name', order: 'asc' as const }
    ]
  }
} satisfies View;

export const RecentHiresView = {
  list: {
    name: 'recent_hires',
    label: 'Recent Hires',
    filter: [['hire_date', '>=', 'LAST_90_DAYS']],
    columns: [
      { field: 'employee_number', width: 130, link: true },
      { field: 'full_name', width: 200, link: true },
      { field: 'department_id', width: 180 },
      { field: 'position_id', width: 180 },
      { field: 'hire_date', width: 130 },
      { field: 'employment_type', width: 120 }
    ],
    sort: [{ field: 'hire_date', order: 'desc' as const }]
  }
} satisfies View;

export const OnLeaveView = {
  list: {
    name: 'on_leave',
    label: 'On Leave',
    filter: [['employment_status', '=', 'on_leave']],
    columns: [
      { field: 'employee_number', width: 130, link: true },
      { field: 'full_name', width: 200, link: true },
      { field: 'department_id', width: 180 },
      { field: 'position_id', width: 180 },
      { field: 'manager_id', width: 180 },
      { field: 'work_location', width: 150 }
    ],
    sort: [{ field: 'full_name', order: 'asc' as const }]
  }
} satisfies View;

ViewSchema.parse(AllEmployeesView);
ViewSchema.parse(ActiveEmployeesView);
ViewSchema.parse(ByDepartmentView);
ViewSchema.parse(RecentHiresView);
ViewSchema.parse(OnLeaveView);

export const EmployeeListViews = {
  all: AllEmployeesView,
  active: ActiveEmployeesView,
  byDepartment: ByDepartmentView,
  recentHires: RecentHiresView,
  onLeave: OnLeaveView
};

export default EmployeeListViews;

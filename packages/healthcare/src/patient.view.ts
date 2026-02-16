import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Patient List Views
 */

export const AllPatientsView = {
  list: {
    type: 'grid' as const,
    name: 'all_patients',
    label: 'All Patients',
    columns: [
      { field: 'first_name', width: 150, sortable: true, link: true },
      { field: 'last_name', width: 150, sortable: true, link: true },
      { field: 'medical_record_number', width: 120, sortable: true },
      { field: 'date_of_birth', width: 120, sortable: true },
      { field: 'gender', width: 80 },
      { field: 'primary_physician', width: 150, sortable: true },
      { field: 'insurance', width: 150 },
      { field: 'status', width: 100, sortable: true }
    ],
    sort: [{ field: 'last_name', order: 'asc' as const }],
    bulkActions: ['delete', 'export'],
    inlineEdit: true,
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

export const ActivePatientsView = {
  list: {
    type: 'grid' as const,
    name: 'active_patients',
    label: 'Active Patients',
    filter: [['status', '=', 'active']],
    columns: [
      { field: 'first_name', width: 150, link: true },
      { field: 'last_name', width: 150, link: true },
      { field: 'medical_record_number', width: 120 },
      { field: 'primary_physician', width: 150 },
      { field: 'insurance', width: 150 },
      { field: 'phone', width: 130 }
    ],
    sort: [{ field: 'last_name', order: 'asc' as const }]
  }
} satisfies View;

export const MyPatientsView = {
  list: {
    type: 'grid' as const,
    name: 'my_patients',
    label: 'My Patients',
    filter: [['primary_physician', '=', '${currentUser.id}']],
    columns: [
      { field: 'first_name', width: 150, link: true },
      { field: 'last_name', width: 150, link: true },
      { field: 'medical_record_number', width: 120 },
      { field: 'date_of_birth', width: 120 },
      { field: 'insurance', width: 150 },
      { field: 'status', width: 100 }
    ],
    sort: [{ field: 'last_name', order: 'asc' as const }]
  }
} satisfies View;

export const DischargedPatientsView = {
  list: {
    type: 'grid' as const,
    name: 'discharged_patients',
    label: 'Discharged Patients',
    filter: [['status', '=', 'discharged']],
    columns: [
      { field: 'first_name', width: 150, link: true },
      { field: 'last_name', width: 150, link: true },
      { field: 'medical_record_number', width: 120 },
      { field: 'primary_physician', width: 150 },
      { field: 'discharge_date', width: 120 }
    ],
    sort: [{ field: 'discharge_date', order: 'desc' as const }]
  }
} satisfies View;

ViewSchema.parse(AllPatientsView);
ViewSchema.parse(ActivePatientsView);
ViewSchema.parse(MyPatientsView);
ViewSchema.parse(DischargedPatientsView);

export const PatientListViews = {
  all: AllPatientsView,
  active: ActivePatientsView,
  my: MyPatientsView,
  discharged: DischargedPatientsView
};

export default PatientListViews;

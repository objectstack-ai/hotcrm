import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Appointment List Views
 */

export const AllAppointmentsView = {
  list: {
    type: 'grid' as const,
    name: 'all_appointments',
    label: 'All Appointments',
    columns: [
      { field: 'patient', width: 180, sortable: true, link: true },
      { field: 'appointment_date', width: 130, sortable: true },
      { field: 'appointment_time', width: 100 },
      { field: 'type', width: 120, sortable: true },
      { field: 'provider_name', width: 150, sortable: true },
      { field: 'status', width: 110, sortable: true },
      { field: 'location', width: 140 }
    ],
    sort: [{ field: 'appointment_date', order: 'desc' as const }],
    bulkActions: ['delete', 'export'],
    inlineEdit: true,
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

export const TodaysAppointmentsView = {
  list: {
    type: 'grid' as const,
    name: 'todays_appointments',
    label: "Today's Appointments",
    filter: [{ field: 'appointment_date', operator: '=', value: 'TODAY' }],
    columns: [
      { field: 'patient', width: 180, link: true },
      { field: 'appointment_time', width: 100 },
      { field: 'type', width: 120 },
      { field: 'provider_name', width: 150 },
      { field: 'status', width: 110 },
      { field: 'location', width: 140 }
    ],
    sort: [{ field: 'appointment_time', order: 'asc' as const }],
    conditionalFormatting: [
      { condition: 'status == "confirmed"', style: { backgroundColor: '#F0FDF4', borderLeft: '3px solid #22C55E' } },
      { condition: 'status == "cancelled"', style: { backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444' } }
    ]
  }
} satisfies View;

export const UpcomingAppointmentsView = {
  list: {
    type: 'grid' as const,
    name: 'upcoming_appointments',
    label: 'Upcoming Appointments',
    filter: [{ field: 'appointment_date', operator: '>', value: 'TODAY' }],
    columns: [
      { field: 'patient', width: 180, link: true },
      { field: 'appointment_date', width: 130 },
      { field: 'appointment_time', width: 100 },
      { field: 'type', width: 120 },
      { field: 'provider_name', width: 150 },
      { field: 'status', width: 110 }
    ],
    sort: [{ field: 'appointment_date', order: 'asc' as const }]
  }
} satisfies View;

export const CancelledAppointmentsView = {
  list: {
    type: 'grid' as const,
    name: 'cancelled_appointments',
    label: 'Cancelled Appointments',
    filter: [{ field: 'status', operator: '=', value: 'cancelled' }],
    columns: [
      { field: 'patient', width: 180, link: true },
      { field: 'appointment_date', width: 130 },
      { field: 'type', width: 120 },
      { field: 'provider_name', width: 150 },
      { field: 'reason', width: 200 }
    ],
    sort: [{ field: 'appointment_date', order: 'desc' as const }]
  }
} satisfies View;

ViewSchema.parse(AllAppointmentsView);
ViewSchema.parse(TodaysAppointmentsView);
ViewSchema.parse(UpcomingAppointmentsView);
ViewSchema.parse(CancelledAppointmentsView);

export const AppointmentListViews = {
  all: AllAppointmentsView,
  today: TodaysAppointmentsView,
  upcoming: UpcomingAppointmentsView,
  cancelled: CancelledAppointmentsView
};

export default AppointmentListViews;

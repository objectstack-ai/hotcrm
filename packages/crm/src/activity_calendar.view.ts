import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Activity Calendar View
 * Calendar view for tasks and events
 */
export const ActivityCalendarView = {
  list: {
    name: 'activity_calendar',
    label: 'Activity Calendar',
    type: 'calendar' as const,
    columns: [
      { field: 'subject', width: 250, link: true },
      { field: 'activity_date', width: 130 },
      { field: 'type', width: 100 },
      { field: 'status', width: 100 },
      { field: 'priority', width: 100 },
      { field: 'assigned_to', width: 150 }
    ],
    calendar: {
      startDateField: 'activity_date',
      endDateField: 'end_date',
      titleField: 'subject',
      colorField: 'type'
    }
  }
} satisfies View;

ViewSchema.parse(ActivityCalendarView);

export default ActivityCalendarView;

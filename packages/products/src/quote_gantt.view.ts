import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Quote Gantt View
 * Gantt chart for quote approval workflow timeline
 */
export const QuoteGanttView = {
  list: {
    name: 'quote_gantt',
    label: 'Quote Approval Timeline',
    type: 'gantt' as const,
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'status', width: 120 },
      { field: 'grand_total', width: 150, align: 'right' as const },
      { field: 'created_date', width: 130 },
      { field: 'expiration_date', width: 130 }
    ],
    gantt: {
      startDateField: 'created_date',
      endDateField: 'expiration_date',
      titleField: 'name',
      progressField: 'approval_progress'
    }
  }
} satisfies View;

ViewSchema.parse(QuoteGanttView);

export default QuoteGanttView;

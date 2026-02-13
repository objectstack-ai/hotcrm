import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Case Kanban View
 * Kanban board for case triage by status and priority
 */
export const CaseKanbanView = {
  list: {
    name: 'case_kanban',
    label: 'Case Board',
    type: 'kanban' as const,
    columns: [
      { field: 'case_number', width: 120, link: true },
      { field: 'subject', width: 200 },
      { field: 'priority', width: 100 },
      { field: 'contact_id', width: 150 },
      { field: 'owner_id', width: 150 }
    ],
    kanban: {
      groupByField: 'status',
      columns: ['new', 'in_progress', 'waiting_on_customer', 'escalated', 'resolved', 'closed']
    },
    sort: [{ field: 'priority', order: 'asc' as const }]
  }
} satisfies View;

ViewSchema.parse(CaseKanbanView);

export default CaseKanbanView;

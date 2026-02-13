import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Opportunity Kanban View
 * Drag-and-drop pipeline board grouped by stage
 */
export const OpportunityKanbanView = {
  list: {
    name: 'opportunity_kanban',
    label: 'Pipeline Board',
    type: 'kanban' as const,
    columns: [
      { field: 'name', width: 200, link: true },
      { field: 'account_id', width: 150 },
      { field: 'amount', width: 120, align: 'right' as const },
      { field: 'close_date', width: 120 },
      { field: 'owner_id', width: 150 }
    ],
    kanban: {
      groupByField: 'stage',
      summarizeField: 'amount',
      columns: ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost']
    },
    sort: [{ field: 'close_date', order: 'asc' as const }]
  }
} satisfies View;

ViewSchema.parse(OpportunityKanbanView);

export default OpportunityKanbanView;

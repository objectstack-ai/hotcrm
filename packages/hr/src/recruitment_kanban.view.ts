import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Recruitment Kanban View
 * Kanban board for candidate pipeline by hiring stage
 */
export const RecruitmentKanbanView = {
  list: {
    name: 'recruitment_kanban',
    label: 'Recruitment Pipeline',
    type: 'kanban' as const,
    columns: [
      { field: 'first_name', width: 150 },
      { field: 'last_name', width: 150 },
      { field: 'job_posting_id', width: 200 },
      { field: 'stage', width: 120 },
      { field: 'applied_date', width: 130 }
    ],
    kanban: {
      groupByField: 'stage',
      columns: ['applied', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected']
    },
    sort: [{ field: 'applied_date', order: 'asc' as const }]
  }
} satisfies View;

ViewSchema.parse(RecruitmentKanbanView);

export default RecruitmentKanbanView;

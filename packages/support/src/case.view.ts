import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Case List Views
 */

export const AllCasesView = {
  list: {
    type: 'grid' as const,
    name: 'all_cases',
    label: 'All Cases',
    columns: [
      { field: 'case_number', width: 130, sortable: true, link: true },
      { field: 'subject', width: 280, sortable: true, link: true },
      { field: 'status', width: 120, sortable: true },
      { field: 'priority', width: 100, sortable: true },
      { field: 'severity', width: 80, sortable: true },
      { field: 'account_id', width: 200 },
      { field: 'owner_id', width: 150 }
    ],
    sort: [{ field: 'case_number', order: 'desc' as const }],
    bulkActions: ['delete', 'update_owner', 'export'],
    inlineEdit: true,
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

export const MyCasesView = {
  list: {
    type: 'grid' as const,
    name: 'my_cases',
    label: 'My Cases',
    filter: [['owner_id', '=', '${currentUser.id}']],
    columns: [
      { field: 'case_number', width: 130, link: true },
      { field: 'subject', width: 280, link: true },
      { field: 'status', width: 120 },
      { field: 'priority', width: 100 },
      { field: 'severity', width: 80 },
      { field: 'account_id', width: 200 }
    ],
    sort: [{ field: 'case_number', order: 'desc' as const }]
  }
} satisfies View;

export const OpenCasesView = {
  list: {
    type: 'grid' as const,
    name: 'open_cases',
    label: 'Open Cases',
    filter: [['status', 'NOT IN', ['resolved', 'closed']]],
    columns: [
      { field: 'case_number', width: 130, link: true },
      { field: 'subject', width: 280, link: true },
      { field: 'status', width: 120 },
      { field: 'priority', width: 100 },
      { field: 'severity', width: 80 },
      { field: 'account_id', width: 200 },
      { field: 'owner_id', width: 150 }
    ],
    sort: [{ field: 'priority', order: 'asc' as const }]
  }
} satisfies View;

export const HighPriorityCasesView = {
  list: {
    type: 'grid' as const,
    name: 'high_priority_cases',
    label: 'High Priority',
    filter: [['priority', 'IN', ['high', 'critical']]],
    columns: [
      { field: 'case_number', width: 130, link: true },
      { field: 'subject', width: 280, link: true },
      { field: 'status', width: 120 },
      { field: 'priority', width: 100 },
      { field: 'severity', width: 80 },
      { field: 'account_id', width: 200 },
      { field: 'owner_id', width: 150 }
    ],
    sort: [{ field: 'severity', order: 'asc' as const }],
    conditionalFormatting: [
      { condition: 'priority == "critical"', style: { backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444' } }
    ]
  }
} satisfies View;

export const EscalatedCasesView = {
  list: {
    type: 'grid' as const,
    name: 'escalated_cases',
    label: 'Escalated Cases',
    filter: [['is_escalated', '=', true]],
    columns: [
      { field: 'case_number', width: 130, link: true },
      { field: 'subject', width: 280, link: true },
      { field: 'status', width: 120 },
      { field: 'priority', width: 100 },
      { field: 'escalation_level', width: 120 },
      { field: 'escalated_date', width: 150 },
      { field: 'escalated_to_id', width: 150 }
    ],
    sort: [{ field: 'escalated_date', order: 'desc' as const }],
    conditionalFormatting: [
      { condition: 'escalation_level > 1', style: { backgroundColor: '#FFFBEB', borderLeft: '3px solid #F59E0B' } }
    ]
  }
} satisfies View;

export const SLAAtRiskView = {
  list: {
    type: 'grid' as const,
    name: 'sla_at_risk',
    label: 'SLA At Risk',
    filter: [['is_sla_violated', '=', true]],
    columns: [
      { field: 'case_number', width: 130, link: true },
      { field: 'subject', width: 280, link: true },
      { field: 'status', width: 120 },
      { field: 'priority', width: 100 },
      { field: 'sla_level', width: 100 },
      { field: 'sla_violation_type', width: 130 },
      { field: 'owner_id', width: 150 }
    ],
    sort: [{ field: 'priority', order: 'asc' as const }],
    conditionalFormatting: [
      { condition: 'is_sla_violated == true', style: { backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444' } }
    ]
  }
} satisfies View;

ViewSchema.parse(AllCasesView);
ViewSchema.parse(MyCasesView);
ViewSchema.parse(OpenCasesView);
ViewSchema.parse(HighPriorityCasesView);
ViewSchema.parse(EscalatedCasesView);
ViewSchema.parse(SLAAtRiskView);

export const CaseListViews = {
  all: AllCasesView,
  my: MyCasesView,
  open: OpenCasesView,
  highPriority: HighPriorityCasesView,
  escalated: EscalatedCasesView,
  slaAtRisk: SLAAtRiskView
};

export default CaseListViews;

import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Contract List Views
 */

export const AllContractsView = {
  list: {
    type: 'grid' as const,
    name: 'all_contracts',
    label: 'All Contracts',
    columns: [
      { field: 'contract_number', width: 150, sortable: true, link: true },
      { field: 'account', width: 200, sortable: true },
      { field: 'status', width: 120, sortable: true },
      { field: 'start_date', width: 130, sortable: true },
      { field: 'end_date', width: 130, sortable: true },
      { field: 'contract_term', width: 120, sortable: true },
      { field: 'contract_value', width: 150, sortable: true, align: 'right' as const }
    ],
    sort: [{ field: 'end_date', order: 'desc' as const }],
    bulkActions: ['delete', 'export'],
    inlineEdit: true,
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

export const ActiveContractsView = {
  list: {
    type: 'grid' as const,
    name: 'active_contracts',
    label: 'Active Contracts',
    filter: [{ field: 'status', operator: '=', value: 'activated' }],
    columns: [
      { field: 'contract_number', width: 150, link: true },
      { field: 'account', width: 200 },
      { field: 'start_date', width: 130 },
      { field: 'end_date', width: 130 },
      { field: 'contract_term', width: 120 },
      { field: 'contract_value', width: 150, align: 'right' as const }
    ],
    sort: [{ field: 'end_date', order: 'asc' as const }]
  }
} satisfies View;

export const ExpiringContractsView = {
  list: {
    type: 'grid' as const,
    name: 'expiring_contracts',
    label: 'Expiring Contracts',
    filter: [
      { field: 'end_date', operator: '<=', value: 'NEXT_90_DAYS' },
      { field: 'status', operator: '=', value: 'activated' }
    ],
    columns: [
      { field: 'contract_number', width: 150, link: true },
      { field: 'account', width: 200 },
      { field: 'end_date', width: 130 },
      { field: 'contract_term', width: 120 },
      { field: 'contract_value', width: 150, align: 'right' as const }
    ],
    sort: [{ field: 'end_date', order: 'asc' as const }],
    conditionalFormatting: [
      { condition: 'end_date <= NEXT_30_DAYS', style: { backgroundColor: '#FEF2F2', borderLeft: '3px solid #EF4444' } }
    ]
  }
} satisfies View;

export const DraftContractsView = {
  list: {
    type: 'grid' as const,
    name: 'draft_contracts',
    label: 'Draft Contracts',
    filter: [{ field: 'status', operator: '=', value: 'draft' }],
    columns: [
      { field: 'contract_number', width: 150, link: true },
      { field: 'account', width: 200 },
      { field: 'opportunity', width: 200 },
      { field: 'start_date', width: 130 },
      { field: 'end_date', width: 130 },
      { field: 'contract_value', width: 150, align: 'right' as const }
    ],
    sort: [{ field: 'contract_number', order: 'desc' as const }]
  }
} satisfies View;

ViewSchema.parse(AllContractsView);
ViewSchema.parse(ActiveContractsView);
ViewSchema.parse(ExpiringContractsView);
ViewSchema.parse(DraftContractsView);

export const ContractListViews = {
  all: AllContractsView,
  active: ActiveContractsView,
  expiring: ExpiringContractsView,
  draft: DraftContractsView
};

export default ContractListViews;

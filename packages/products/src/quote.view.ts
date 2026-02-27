import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Quote List Views
 */

export const AllQuotesView = {
  list: {
    type: 'grid' as const,
    name: 'all_quotes',
    label: 'All Quotes',
    columns: [
      { field: 'quote_number', width: 130, sortable: true, link: true },
      { field: 'name', width: 250, sortable: true, link: true },
      { field: 'status', width: 120, sortable: true },
      { field: 'opportunity_id', width: 200, sortable: true },
      { field: 'total_price', width: 150, sortable: true, align: 'right' as const },
      { field: 'expiration_date', width: 130, sortable: true },
      { field: 'approval_status', width: 130, sortable: true }
    ],
    sort: [{ field: 'quote_number', order: 'desc' as const }],
    bulkActions: ['delete', 'export'],
    inlineEdit: true,
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

export const DraftQuotesView = {
  list: {
    type: 'grid' as const,
    name: 'draft_quotes',
    label: 'Draft Quotes',
    filter: [{ field: 'status', operator: '=', value: 'draft' }],
    columns: [
      { field: 'quote_number', width: 130, link: true },
      { field: 'name', width: 250, link: true },
      { field: 'opportunity_id', width: 200 },
      { field: 'total_price', width: 150, align: 'right' as const },
      { field: 'expiration_date', width: 130 }
    ],
    sort: [{ field: 'quote_number', order: 'desc' as const }]
  }
} satisfies View;

export const PendingApprovalView = {
  list: {
    type: 'grid' as const,
    name: 'pending_approval',
    label: 'Pending Approval',
    filter: [{ field: 'approval_status', operator: '=', value: 'pending' }],
    columns: [
      { field: 'quote_number', width: 130, link: true },
      { field: 'name', width: 250, link: true },
      { field: 'status', width: 120 },
      { field: 'opportunity_id', width: 200 },
      { field: 'total_price', width: 150, align: 'right' as const },
      { field: 'approval_status', width: 130 },
      { field: 'approval_level', width: 120 }
    ],
    sort: [{ field: 'quote_number', order: 'desc' as const }],
    conditionalFormatting: [
      { condition: 'approval_status == "pending"', style: { backgroundColor: '#FFFBEB', borderLeft: '3px solid #F59E0B' } }
    ]
  }
} satisfies View;

export const AcceptedQuotesView = {
  list: {
    type: 'grid' as const,
    name: 'accepted_quotes',
    label: 'Accepted Quotes',
    filter: [{ field: 'status', operator: '=', value: 'accepted' }],
    columns: [
      { field: 'quote_number', width: 130, link: true },
      { field: 'name', width: 250, link: true },
      { field: 'opportunity_id', width: 200 },
      { field: 'total_price', width: 150, align: 'right' as const },
      { field: 'accepted_date', width: 130 },
      { field: 'accepted_by_id', width: 150 }
    ],
    sort: [{ field: 'accepted_date', order: 'desc' as const }]
  }
} satisfies View;

export const ExpiredQuotesView = {
  list: {
    type: 'grid' as const,
    name: 'expired_quotes',
    label: 'Expired Quotes',
    filter: [{ field: 'status', operator: '=', value: 'expired' }],
    columns: [
      { field: 'quote_number', width: 130, link: true },
      { field: 'name', width: 250, link: true },
      { field: 'opportunity_id', width: 200 },
      { field: 'total_price', width: 150, align: 'right' as const },
      { field: 'expiration_date', width: 130 }
    ],
    sort: [{ field: 'expiration_date', order: 'desc' as const }]
  }
} satisfies View;

ViewSchema.parse(AllQuotesView);
ViewSchema.parse(DraftQuotesView);
ViewSchema.parse(PendingApprovalView);
ViewSchema.parse(AcceptedQuotesView);
ViewSchema.parse(ExpiredQuotesView);

export const QuoteListViews = {
  all: AllQuotesView,
  draft: DraftQuotesView,
  pendingApproval: PendingApprovalView,
  accepted: AcceptedQuotesView,
  expired: ExpiredQuotesView
};

export default QuoteListViews;

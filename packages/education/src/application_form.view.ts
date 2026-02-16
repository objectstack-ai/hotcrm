import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Application Pipeline Views
 */

export const AllApplicationsView = {
  list: {
    type: 'grid' as const,
    name: 'all_applications',
    label: 'All Applications',
    columns: [
      { field: 'applicant_name', width: 180, sortable: true, link: true },
      { field: 'email', width: 180, sortable: true },
      { field: 'program', width: 150, sortable: true },
      { field: 'gpa', width: 80, sortable: true, align: 'right' as const },
      { field: 'status', width: 120, sortable: true },
      { field: 'decision', width: 100, sortable: true },
      { field: 'application_date', width: 130, sortable: true },
      { field: 'recommendations', width: 80, align: 'right' as const }
    ],
    sort: [{ field: 'application_date', order: 'desc' as const }],
    bulkActions: ['delete', 'export'],
    inlineEdit: true,
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

export const PendingReviewView = {
  list: {
    type: 'grid' as const,
    name: 'pending_review',
    label: 'Pending Review',
    filter: [['status', '=', 'submitted']],
    columns: [
      { field: 'applicant_name', width: 180, link: true },
      { field: 'program', width: 150 },
      { field: 'gpa', width: 80, align: 'right' as const },
      { field: 'recommendations', width: 80, align: 'right' as const },
      { field: 'application_date', width: 130 }
    ],
    sort: [{ field: 'application_date', order: 'asc' as const }]
  }
} satisfies View;

export const AcceptedApplicationsView = {
  list: {
    type: 'grid' as const,
    name: 'accepted_applications',
    label: 'Accepted',
    filter: [['status', '=', 'accepted']],
    columns: [
      { field: 'applicant_name', width: 180, link: true },
      { field: 'program', width: 150 },
      { field: 'gpa', width: 80, align: 'right' as const },
      { field: 'decision_date', width: 130 },
      { field: 'email', width: 180 }
    ],
    sort: [{ field: 'decision_date', order: 'desc' as const }]
  }
} satisfies View;

export const RejectedApplicationsView = {
  list: {
    type: 'grid' as const,
    name: 'rejected_applications',
    label: 'Rejected',
    filter: [['status', '=', 'rejected']],
    columns: [
      { field: 'applicant_name', width: 180, link: true },
      { field: 'program', width: 150 },
      { field: 'gpa', width: 80, align: 'right' as const },
      { field: 'decision_date', width: 130 },
      { field: 'notes', width: 200 }
    ],
    sort: [{ field: 'decision_date', order: 'desc' as const }]
  }
} satisfies View;

ViewSchema.parse(AllApplicationsView);
ViewSchema.parse(PendingReviewView);
ViewSchema.parse(AcceptedApplicationsView);
ViewSchema.parse(RejectedApplicationsView);

export const ApplicationListViews = {
  all: AllApplicationsView,
  pendingReview: PendingReviewView,
  accepted: AcceptedApplicationsView,
  rejected: RejectedApplicationsView
};

export default ApplicationListViews;

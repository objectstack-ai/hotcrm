import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Idea List Views
 * Provides vote ranking, status filters, and category browsing
 */

// All Ideas View
export const AllIdeasView = {
  list: {
    type: 'grid' as const,
    name: 'all_ideas',
    label: 'All Ideas',
    columns: [
      { field: 'title', width: 300, sortable: true, link: true },
      { field: 'category', width: 120, sortable: true },
      { field: 'status', width: 120, sortable: true },
      { field: 'vote_count', width: 100, sortable: true, align: 'right' as const },
      { field: 'priority_score', width: 120, sortable: true, align: 'right' as const },
      { field: 'author_id', width: 150 },
      { field: 'product_area', width: 150, sortable: true }
    ],
    sort: [{ field: 'vote_count', order: 'desc' as const }],
    bulkActions: ['delete', 'export'],
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

// Top Voted Ideas View
export const TopVotedIdeasView = {
  list: {
    type: 'grid' as const,
    name: 'top_voted_ideas',
    label: 'Top Voted',
    columns: [
      { field: 'title', width: 300, link: true },
      { field: 'vote_count', width: 100, align: 'right' as const },
      { field: 'priority_score', width: 120, align: 'right' as const },
      { field: 'status', width: 120 },
      { field: 'category', width: 120 }
    ],
    sort: [{ field: 'vote_count', order: 'desc' as const }]
  }
} satisfies View;

// Planned Ideas View
export const PlannedIdeasView = {
  list: {
    type: 'grid' as const,
    name: 'planned_ideas',
    label: 'Planned',
    filter: [['status', '=', 'planned']],
    columns: [
      { field: 'title', width: 300, link: true },
      { field: 'category', width: 120 },
      { field: 'vote_count', width: 100, align: 'right' as const },
      { field: 'assigned_release', width: 150 },
      { field: 'product_area', width: 150 }
    ],
    sort: [{ field: 'priority_score', order: 'desc' as const }]
  }
} satisfies View;

// New Submissions View
export const NewSubmissionsView = {
  list: {
    type: 'grid' as const,
    name: 'new_submissions',
    label: 'New Submissions',
    filter: [['status', '=', 'submitted']],
    columns: [
      { field: 'title', width: 300, link: true },
      { field: 'category', width: 120 },
      { field: 'vote_count', width: 100, align: 'right' as const },
      { field: 'author_id', width: 150 },
      { field: 'product_area', width: 150 }
    ],
    sort: [{ field: 'vote_count', order: 'desc' as const }]
  }
} satisfies View;

// Released Ideas View
export const ReleasedIdeasView = {
  list: {
    type: 'grid' as const,
    name: 'released_ideas',
    label: 'Released',
    filter: [['status', '=', 'released']],
    columns: [
      { field: 'title', width: 300, link: true },
      { field: 'category', width: 120 },
      { field: 'assigned_release', width: 150 },
      { field: 'vote_count', width: 100, align: 'right' as const },
      { field: 'product_area', width: 150 }
    ],
    sort: [{ field: 'assigned_release', order: 'desc' as const }]
  }
} satisfies View;

ViewSchema.parse(AllIdeasView);
ViewSchema.parse(TopVotedIdeasView);
ViewSchema.parse(PlannedIdeasView);
ViewSchema.parse(NewSubmissionsView);
ViewSchema.parse(ReleasedIdeasView);

export const IdeaListViews = {
  all: AllIdeasView,
  topVoted: TopVotedIdeasView,
  planned: PlannedIdeasView,
  newSubmissions: NewSubmissionsView,
  released: ReleasedIdeasView
};

export default IdeaListViews;

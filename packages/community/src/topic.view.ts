import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Topic List Views
 * Provides category, status, and activity filters for topic browsing
 */

// All Topics View
export const AllTopicsView = {
  list: {
    type: 'grid' as const,
    name: 'all_topics',
    label: 'All Topics',
    columns: [
      { field: 'title', width: 300, sortable: true, link: true },
      { field: 'category_id', width: 150, sortable: true },
      { field: 'status', width: 100, sortable: true },
      { field: 'author_id', width: 150 },
      { field: 'reply_count', width: 100, sortable: true, align: 'right' as const },
      { field: 'view_count', width: 100, sortable: true, align: 'right' as const },
      { field: 'last_activity_at', width: 150, sortable: true }
    ],
    sort: [{ field: 'last_activity_at', order: 'desc' as const }],
    bulkActions: ['delete', 'export'],
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

// Open Topics View
export const OpenTopicsView = {
  list: {
    type: 'grid' as const,
    name: 'open_topics',
    label: 'Open Topics',
    filter: [['status', '=', 'open']],
    columns: [
      { field: 'title', width: 300, link: true },
      { field: 'category_id', width: 150 },
      { field: 'author_id', width: 150 },
      { field: 'reply_count', width: 100, align: 'right' as const },
      { field: 'last_activity_at', width: 150 }
    ],
    sort: [{ field: 'last_activity_at', order: 'desc' as const }]
  }
} satisfies View;

// Pinned Topics View
export const PinnedTopicsView = {
  list: {
    type: 'grid' as const,
    name: 'pinned_topics',
    label: 'Pinned Topics',
    filter: [['is_pinned', '=', true]],
    columns: [
      { field: 'title', width: 300, link: true },
      { field: 'category_id', width: 150 },
      { field: 'reply_count', width: 100, align: 'right' as const },
      { field: 'view_count', width: 100, align: 'right' as const }
    ],
    sort: [{ field: 'view_count', order: 'desc' as const }]
  }
} satisfies View;

// Unanswered Topics View
export const UnansweredTopicsView = {
  list: {
    type: 'grid' as const,
    name: 'unanswered_topics',
    label: 'Unanswered',
    filter: [['reply_count', '=', 0]],
    columns: [
      { field: 'title', width: 300, link: true },
      { field: 'category_id', width: 150 },
      { field: 'author_id', width: 150 },
      { field: 'view_count', width: 100, align: 'right' as const },
      { field: 'last_activity_at', width: 150 }
    ],
    sort: [{ field: 'last_activity_at', order: 'desc' as const }]
  }
} satisfies View;

// Most Active Topics View
export const MostActiveTopicsView = {
  list: {
    type: 'grid' as const,
    name: 'most_active_topics',
    label: 'Most Active',
    columns: [
      { field: 'title', width: 300, link: true },
      { field: 'category_id', width: 150 },
      { field: 'reply_count', width: 100, align: 'right' as const },
      { field: 'view_count', width: 100, align: 'right' as const },
      { field: 'last_activity_at', width: 150 }
    ],
    sort: [{ field: 'reply_count', order: 'desc' as const }]
  }
} satisfies View;

ViewSchema.parse(AllTopicsView);
ViewSchema.parse(OpenTopicsView);
ViewSchema.parse(PinnedTopicsView);
ViewSchema.parse(UnansweredTopicsView);
ViewSchema.parse(MostActiveTopicsView);

export const TopicListViews = {
  all: AllTopicsView,
  open: OpenTopicsView,
  pinned: PinnedTopicsView,
  unanswered: UnansweredTopicsView,
  mostActive: MostActiveTopicsView
};

export default TopicListViews;

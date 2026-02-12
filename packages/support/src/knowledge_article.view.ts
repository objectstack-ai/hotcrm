import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Knowledge Article List Views
 */

export const AllArticlesView = {
  list: {
    name: 'all_articles',
    label: 'All Articles',
    columns: [
      { field: 'title', width: 300, sortable: true, link: true },
      { field: 'article_number', width: 130, sortable: true },
      { field: 'category', width: 140, sortable: true },
      { field: 'status', width: 120, sortable: true },
      { field: 'helpful_rating', width: 120, sortable: true, align: 'right' as const },
      { field: 'view_count', width: 100, sortable: true, align: 'right' as const },
      { field: 'publish_date', width: 130, sortable: true }
    ],
    sort: [{ field: 'publish_date', order: 'desc' as const }],
    bulkActions: ['delete', 'export'],
    inlineEdit: true,
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

export const PublishedArticlesView = {
  list: {
    name: 'published_articles',
    label: 'Published Articles',
    filter: [['status', '=', 'published']],
    columns: [
      { field: 'title', width: 300, link: true },
      { field: 'article_number', width: 130 },
      { field: 'category', width: 140 },
      { field: 'helpful_rating', width: 120, align: 'right' as const },
      { field: 'view_count', width: 100, align: 'right' as const },
      { field: 'publish_date', width: 130 }
    ],
    sort: [{ field: 'publish_date', order: 'desc' as const }]
  }
} satisfies View;

export const DraftArticlesView = {
  list: {
    name: 'draft_articles',
    label: 'Draft Articles',
    filter: [['status', '=', 'draft']],
    columns: [
      { field: 'title', width: 300, link: true },
      { field: 'article_number', width: 130 },
      { field: 'category', width: 140 },
      { field: 'author_id', width: 150 },
      { field: 'owner_id', width: 150 }
    ],
    sort: [{ field: 'article_number', order: 'desc' as const }]
  }
} satisfies View;

export const InternalArticlesView = {
  list: {
    name: 'internal_articles',
    label: 'Internal Articles',
    filter: [['is_internal', '=', true]],
    columns: [
      { field: 'title', width: 300, link: true },
      { field: 'article_number', width: 130 },
      { field: 'category', width: 140 },
      { field: 'status', width: 120 },
      { field: 'helpful_rating', width: 120, align: 'right' as const },
      { field: 'view_count', width: 100, align: 'right' as const }
    ],
    sort: [{ field: 'view_count', order: 'desc' as const }]
  }
} satisfies View;

export const PopularArticlesView = {
  list: {
    name: 'popular_articles',
    label: 'Popular Articles',
    filter: [['view_count', '>', 100]],
    columns: [
      { field: 'title', width: 300, link: true },
      { field: 'article_number', width: 130 },
      { field: 'category', width: 140 },
      { field: 'status', width: 120 },
      { field: 'helpful_rating', width: 120, align: 'right' as const },
      { field: 'view_count', width: 100, align: 'right' as const },
      { field: 'publish_date', width: 130 }
    ],
    sort: [{ field: 'view_count', order: 'desc' as const }],
    conditionalFormatting: [
      { condition: 'view_count > 1000', style: { backgroundColor: '#F0FDF4', borderLeft: '3px solid #22C55E' } }
    ]
  }
} satisfies View;

ViewSchema.parse(AllArticlesView);
ViewSchema.parse(PublishedArticlesView);
ViewSchema.parse(DraftArticlesView);
ViewSchema.parse(InternalArticlesView);
ViewSchema.parse(PopularArticlesView);

export const KnowledgeArticleListViews = {
  all: AllArticlesView,
  published: PublishedArticlesView,
  draft: DraftArticlesView,
  internal: InternalArticlesView,
  popular: PopularArticlesView
};

export default KnowledgeArticleListViews;

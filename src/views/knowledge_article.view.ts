// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Knowledge Article Views
 *
 *   • grid     — agent-facing article queue (status / category / audience)
 *   • published — public articles only
 *   • stale     — published > 180 days without review
 */
export const KnowledgeArticleViews = defineView({
  list: {
    type: 'grid',
    name: 'all_articles',
    label: 'All Articles',
    data: { provider: 'object', object: 'crm_knowledge_article' },
    columns: [
      { field: 'article_number', width: 120, link: true, pinned: 'left', sortable: true },
      { field: 'title',          width: 320, sortable: true },
      { field: 'category',       width: 160 },
      { field: 'status',         width: 130, sortable: true },
      { field: 'audience',       width: 110 },
      { field: 'language',       width: 110 },
      { field: 'owner',          width: 150 },
      { field: 'published_at',   width: 160, sortable: true },
      { field: 'view_count',     width: 110, align: 'right', summary: 'sum' },
      { field: 'helpful_count',  width: 110, align: 'right', summary: 'sum' },
    ],
    sort: [{ field: 'published_at', order: 'desc' }],
    grouping: { fields: [{ field: 'category', order: 'asc' }] },
    selection: { type: 'multiple' },
    pagination: { pageSize: 50 },
    rowColor: {
      field: 'status',
      colors: { draft: '#94A3B8', in_review: '#F59E0B', published: '#10B981', archived: '#475569' },
    },
    appearance: {
      showDescription: true,
      allowedVisualizations: ['grid', 'kanban'],
    },
    tabs: [
      { name: 'all',       label: 'All',         view: 'all_articles', isDefault: true, pinned: true },
      { name: 'published', label: 'Published',   icon: 'check-circle-2', view: 'published_articles' },
      { name: 'drafts',    label: 'My Drafts',   icon: 'pencil',         view: 'my_drafts' },
      { name: 'stale',     label: 'Stale (>180d)', icon: 'clock-alert',  view: 'stale_articles' },
    ],
  },

  listViews: {
    published_articles: {
      name: 'published_articles',
      type: 'grid',
      label: 'Published',
      data: { provider: 'object', object: 'crm_knowledge_article' },
      columns: ['article_number', 'title', 'category', 'audience', 'view_count', 'helpful_count', 'published_at'],
      filter: [{ field: 'status', operator: 'equals', value: 'published' }],
      sort: [{ field: 'view_count', order: 'desc' }],
    },
    my_drafts: {
      name: 'my_drafts',
      type: 'grid',
      label: 'My Drafts',
      data: { provider: 'object', object: 'crm_knowledge_article' },
      columns: ['article_number', 'title', 'category', 'status', 'updated_at'],
      filter: [
        { field: 'status', operator: 'in',     value: ['draft', 'in_review'] },
        // `{current_user_id}` is the only user token the view runtime resolves.
        { field: 'owner',  operator: 'equals', value: '{current_user_id}' },
      ],
      sort: [{ field: 'updated_at', order: 'desc' }],
    },
    stale_articles: {
      name: 'stale_articles',
      type: 'grid',
      label: 'Stale',
      data: { provider: 'object', object: 'crm_knowledge_article' },
      columns: ['article_number', 'title', 'category', 'owner', 'last_reviewed_at'],
      filter: [
        { field: 'status',           operator: 'equals',   value: 'published' },
        { field: 'last_reviewed_at', operator: 'less_than', value: '{180_days_ago}' },
      ],
      sort: [{ field: 'last_reviewed_at', order: 'asc' }],
    },
  },

  form: {
    type: 'simple',
    data: { provider: 'object', object: 'crm_knowledge_article' },
    sections: [
      {
        label: 'Article',
        columns: 2,
        fields: [
          'article_number',
          { field: 'title', required: true, colSpan: 2 },
          { field: 'summary', colSpan: 2 },
          'category',
          'tags',
          'status',
          'audience',
          'language',
          'owner',
        ],
      },
      {
        label: 'Content',
        columns: 1,
        fields: ['body'],
      },
      {
        label: 'Engagement',
        columns: 3,
        fields: ['view_count', 'helpful_count', 'not_helpful_count', 'published_at', 'last_reviewed_at', 'related_to_case'],
      },
    ],
  },
});

// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Knowledge Article Views
 *
 *   • grid      — agent-facing article queue (status / category / audience)
 *   • published — public articles only
 *   • my drafts — the author's own drafts and in-review articles
 *
 * A fourth tab, `stale_articles` ('Review Queue · Oldest First'), shipped here
 * until #781 and is deliberately absent: the maintainer ruled the knowledge
 * review queue out of the product rather than settling whether it should have
 * become a real 180-day cut. ⛔ Do not reinstate it as a ranking either — the
 * ruling removed the FEATURE, not just the window question.
 *
 * `last_reviewed_at` is untouched by that removal and stays a data-layer
 * field: the publish hook still stamps it, and the Engagement form section
 * below still shows it. Whether the field itself should retire is a separate
 * question and is not answered here.
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
      { field: 'owner_id',          width: 150 },
      { field: 'published_at',   width: 160, sortable: true },
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
  },

  listViews: {
    published_articles: {
      name: 'published_articles',
      type: 'grid',
      label: 'Published',
      data: { provider: 'object', object: 'crm_knowledge_article' },
      columns: ['article_number', 'title', 'category', 'audience', 'helpful_count', 'not_helpful_count', 'published_at'],
      filter: [{ field: 'status', operator: 'equals', value: 'published' }],
      sort: [{ field: 'helpful_count', order: 'desc' }],
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
        { field: 'owner_id',  operator: 'equals', value: '{current_user_id}' },
      ],
      sort: [{ field: 'updated_at', order: 'desc' }],
    },
  },

  form: {
    type: 'simple',
    sections: [
      {
        name: 'article',
        label: 'Article',
        columns: 2,
        fields: [
          'article_number',
          { field: 'title', required: true, span: 'full' },
          { field: 'summary', span: 'full' },
          'category',
          'tags',
          'status',
          'audience',
          'language',
          'owner_id',
        ],
      },
      {
        name: 'content',
        label: 'Content',
        columns: 1,
        fields: ['body'],
      },
      {
        // `name` alongside `label` (#1100): a form section declaring only a
        // label renders its ENGLISH label under every locale, and neither the
        // existing i18n tests nor the `i18n/missing-*` gate can see it — the
        // heading has no key for a translator to miss. This section is named
        // because this change edits it (`view_count` was removed from it, #601);
        // the app-wide sweep of the other headings is #1100's job, held behind
        // this card precisely so the two do not collide in the locale packs.
        name: 'engagement',
        label: 'Engagement',
        columns: 3,
        fields: ['helpful_count', 'not_helpful_count', 'published_at', 'last_reviewed_at', 'related_to_case'],
      },
    ],
  },
});

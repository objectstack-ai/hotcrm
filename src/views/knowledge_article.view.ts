// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Knowledge Article Views
 *
 *   • grid      — agent-facing article queue (status / category / audience)
 *   • published — public articles only
 *   • stale     — every published article, least-recently-reviewed first
 *
 * The third one is a RANKING, not a cut: `stale_articles` is the metadata
 * item's name, not a claim about which rows come back. See its own note below
 * for why it stays a ranking (#769).
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
      { name: 'stale',     label: 'Review Queue', icon: 'clock-alert',  view: 'stale_articles' },
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
        { field: 'owner_id',  operator: 'equals', value: '{current_user_id}' },
      ],
      sort: [{ field: 'updated_at', order: 'desc' }],
    },
    stale_articles: {
      name: 'stale_articles',
      type: 'grid',
      // Operator-only filter + least-recently-reviewed-first sort. This view
      // is a RANKING and the label says so; it deliberately applies no
      // 180-day cut. Both halves of that sentence were settled by measurement
      // (#769), so the reasoning is recorded here rather than re-derived.
      //
      // 1. The old note's premise expired (#744, #773). It read: the list data
      //    path does NOT resolve date macros, so `last_reviewed_at <
      //    '{180_days_ago}'` compared the literal string, and since '2026-…' <
      //    '{…' is lexicographically true it matched EVERY published article.
      //    True on @objectstack 16.1.0; false from 17.0.0-rc.0, when
      //    `resolveFilterTokens()` was wired into the ObjectQL read path
      //    (objectql #3582) ahead of the middleware chain —
      //    `find`/`findOne`/`count`/`aggregate`, saved-view filters included.
      //    Measured on the pinned 17.0.0-rc.2: `{180_days_ago}` resolves to
      //    the START of the calendar day 180 days ago (00:00:00.000Z), so as
      //    an EXCLUSIVE upper bound under `less_than` it excludes that whole
      //    day — the #3777 day-boundary convention, and the right sense for a
      //    label reading "> 180d".
      //
      // 2. Expressible is not the same as expressible WITHOUT LOSS. A review
      //    queue's most overdue population is the never-reviewed one, and
      //    `last_reviewed_at` is nullable: a published article can carry no
      //    review timestamp at all. Measured on the same engine, `$lt` does
      //    not match null or absent values, so a bare window silently deletes
      //    exactly those rows. The honest condition is "earlier than
      //    {180_days_ago} OR empty" — and a view `filter` cannot say that. It
      //    is a FLAT, strict array of `{field, operator, value}` rules
      //    (`ViewFilterRuleSchema`) combined with AND; there is no `or`, no
      //    nesting, no logic key. Spelled as the two rules the grammar does
      //    allow, the window and the emptiness test AND together and the view
      //    returns ZERO rows. (The engine itself has `$or` and answers the
      //    question correctly — this is a view-authoring limit, not an engine
      //    limit.)
      //
      // So the label is what changed in #769, not the filter: the four locale
      // packs had translated this view as 'Stale (>180d)' / '过期 (>180 天)' /
      // 'Obsoletos (>180d)' / '古い (>180日)', promising a window the filter
      // never expressed — the #730 defect class, living (as it did there) only
      // in the translated half. They now render the metadata label faithfully,
      // and every user-visible name for this view again promises exactly the
      // ordering it delivers. No `emptyState` is authored because the change
      // introduces no new empty state: "no published articles" is the same
      // zero this tab has always had, unlike `closing_this_quarter` (#746),
      // where scoping made "empty" newly reachable.
      //
      // `test/forecast-current-quarter-view.test.ts` owns the house rule and
      // pins all of the above against a real engine, including the day-window
      // claim vocabulary that would fail this view the day a label reclaims a
      // window. Whether the queue SHOULD become a 180-day cut is a product
      // question that needs the null population handled first — filed
      // separately, not decided by a translator.
      label: 'Review Queue · Oldest First',
      data: { provider: 'object', object: 'crm_knowledge_article' },
      columns: ['article_number', 'title', 'category', 'owner_id', 'last_reviewed_at'],
      filter: [
        { field: 'status', operator: 'equals', value: 'published' },
      ],
      sort: [{ field: 'last_reviewed_at', order: 'asc' }],
    },
  },

  form: {
    type: 'simple',
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
          'owner_id',
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

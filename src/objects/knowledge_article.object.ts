// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F, P } from '@objectstack/spec';

/**
 * Knowledge Article Object
 *
 * Reusable, search-indexed answers that back the Support Knowledge Base
 * and ground the assistant's case-resolution skills.
 *
 * Lifecycle: draft → in_review → published → archived.
 * Audience:  public (customer portal visible) | internal (agent-only).
 */
export const KnowledgeArticle = ObjectSchema.create({
  name: 'crm_knowledge_article',
  label: 'Knowledge Article',
  pluralLabel: 'Knowledge Articles',
  icon: 'book-open',
  description: 'Reusable knowledge base articles for self-service and AI grounding',

  // ADR-0090 D1/D7: OWD is an authored decision. Knowledge base is org-readable; authors edit.
  sharingModel: 'public_read',

  // ─── Public access (#601) — NOT declared, and this is the record of why ──
  //
  // Scope item 3 of #601 asked for `publicSharing` here: share-link publishing
  // for public articles, `allowedAudiences: ['public','link_only']`, CEL
  // eligibility `status == 'published' && audience == 'public'`, and
  // `redactFields`. It is NOT declared, because on 17.0.0-rc.6 this app cannot
  // enforce the half that keeps INTERNAL articles unreachable, and the
  // acceptance criterion is two-sided.
  //
  // MEASURED against the real `ShareLinkService` from
  // `@objectstack/plugin-sharing`, not read off the schema:
  //
  //   | key                  | measured on rc.6                                 |
  //   | -------------------- | ------------------------------------------------ |
  //   | `enabled`            | ENFORCED — false ⇒ SHARING_NOT_ENABLED           |
  //   | `allowedAudiences`   | ENFORCED — `signed_in` refused 422               |
  //   | `allowedPermissions` | ENFORCED — non-`view` refused 422                |
  //   | `maxExpiryDays`      | ENFORCED — longer expiry refused 422             |
  //   | `redactFields`       | APPLIED to every token-served response           |
  //   | `eligibility`        | **INERT — read by NO consumer on this version**  |
  //
  // `getPolicy()` never carries `eligibility` into the policy it returns and
  // `createLink()` evaluates no predicate; nothing else in the installed
  // platform reads the key. Driven end to end with the key declared: a DRAFT
  // article and an INTERNAL-audience article each minted a `public` link and
  // each was SERVED to a caller with no principal at all.
  //
  // So declaring this block would have OPENED an anonymous-read path to
  // internal articles that does not exist today (with `enabled` absent, every
  // create is refused outright) — a strictly wider approximation of what was
  // asked for, in the one surface where the failure is a stranger reading
  // internal content. The guest profile is likewise untouched: widening it was
  // never on the table (maintainer decision, 2026-08-02).
  //
  // The enforcement seam DOES exist on the platform and was measured working —
  // a `beforeInsert` hook on `sys_share_link` fires on the plugin's own
  // system-context insert, `ctx.api` can read the candidate article, and a
  // throw refuses the link, covering the console's share dialog and a raw
  // `POST /api/v1/share-links` alike. It is unreachable from a METADATA app:
  // `validateCrossReferences` in `@objectstack/spec` refuses any hook whose
  // `object` is not in this stack's own `objects`, and `sys_share_link` belongs
  // to the platform ("Hook 'x' references object 'sys_share_link' which is not
  // defined in objects."). No wildcard escape either — `'*'` is not in that set.
  //
  // Blocked on upstream giving `publicSharing.eligibility` a consumer (or an
  // app-reachable equivalent). Until then `audience: 'public'` stays an
  // internal editorial classification, which is what it has always actually
  // been. See #601 for the full measurement.

  // ADR-0079: render-only `titleFormat` retired in favor of `nameField`,
  // which names a real field. The former template composed two local fields, so
  // a `display_title` formula field reproduces it for the record title.
  nameField: 'display_title',
  // Explicit search targets (ADR-0061). REQUIRED because nameField is a
  // FORMULA (display_title/full_name): without this, $search auto-defaults to
  // the formula field, which isn't a real column, so the lookup picker + global
  // search silently return zero. These are real, indexed columns.
  searchableFields: ['title', 'article_number', 'summary'],
  highlightFields: ['article_number', 'title', 'category', 'status', 'audience'],

  fieldGroups: [
    { key: 'basic',     label: 'Article Information', icon: 'info' },
    { key: 'content',   label: 'Content',             icon: 'file-text' },
    { key: 'taxonomy',  label: 'Categorization',      icon: 'tag' },
    { key: 'metrics',   label: 'Engagement',          icon: 'activity', defaultExpanded: false },
  ],

  fields: {
    // Platform ownership anchor — canonical note in `account.object.ts` (#548).
    owner_id: Field.lookup('sys_user', {
      label: 'Article Owner',
      group: 'basic',
      system: true,
      readonly: false,
      trackHistory: true,
    }),

    article_number: Field.autonumber({
      label: 'Article Number',
      format: 'KA-{0000}',
    }),

    title: Field.text({
      label: 'Title',
      required: true,
      storage: { notNull: true },
      searchable: true,
      maxLength: 255,
      group: 'basic',
    }),

    // ADR-0079 record title (was titleFormat '{article_number} - {title}').
    display_title: Field.formula({
      label: 'Display Title',
      expression: F`record.article_number + " - " + record.title`,
      group: 'basic',
    }),

    summary: Field.text({
      label: 'Summary',
      description: 'One-paragraph TL;DR shown in search results and AI citations.',
      maxLength: 500,
      searchable: true,
      group: 'basic',
    }),

    body: Field.markdown({
      label: 'Body',
      description: 'Full article content (Markdown).',
      searchable: true,
      group: 'content',
    }),

    category: Field.select({
      label: 'Category',
      group: 'taxonomy',
      options: [
        { label: 'Getting Started',     value: 'getting_started', default: true },
        { label: 'How-To',              value: 'how_to' },
        { label: 'Troubleshooting',     value: 'troubleshooting' },
        { label: 'Billing & Pricing',   value: 'billing' },
        { label: 'API & Integrations',  value: 'api' },
        { label: 'Release Notes',       value: 'release_notes' },
        { label: 'Policy',              value: 'policy' },
      ],
    }),

    tags: Field.select({
      label: 'Tags',
      multiple: true,
      group: 'taxonomy',
      options: [
        { label: 'Auth',          value: 'auth' },
        { label: 'SSO',           value: 'sso' },
        { label: 'Mobile',        value: 'mobile' },
        { label: 'Email',         value: 'email' },
        { label: 'Reports',       value: 'reports' },
        { label: 'Performance',   value: 'performance' },
        { label: 'Data Import',   value: 'data_import' },
        { label: 'Webhooks',      value: 'webhooks' },
      ],
    }),

    status: Field.select({
      label: 'Status',
      required: true,
      storage: { notNull: true },
      group: 'basic',
      trackHistory: true,
      options: [
        { label: 'Draft',      value: 'draft',     color: '#94A3B8', default: true },
        { label: 'In Review',  value: 'in_review', color: '#F59E0B' },
        { label: 'Published',  value: 'published', color: '#10B981' },
        { label: 'Archived',   value: 'archived',  color: '#475569' },
      ],
    }),

    audience: Field.select({
      label: 'Audience',
      required: true,
      storage: { notNull: true },
      group: 'basic',
      description: 'Public articles are visible in the customer portal; internal articles are agent-only.',
      options: [
        { label: 'Public',   value: 'public', default: true, color: '#0EA5E9' },
        { label: 'Internal', value: 'internal', color: '#7C3AED' },
      ],
    }),

    language: Field.select({
      label: 'Language',
      group: 'basic',
      options: [
        { label: 'English',             value: 'en', default: true },
        { label: 'Simplified Chinese',  value: 'zh_cn' },
        { label: 'Spanish',             value: 'es_es' },
        { label: 'Japanese',            value: 'ja_jp' },
      ],
    }),

    related_to_case: Field.lookup('crm_case', {
      label: 'Originating Case',
      description: 'Case this article was authored from (optional).',
      group: 'content',
    }),


    published_at: Field.datetime({
      label: 'Published At',
      readonly: true,
      group: 'basic',
    }),

    last_reviewed_at: Field.datetime({
      label: 'Last Reviewed At',
      readonly: true,
      group: 'basic',
    }),

    /**
     * `view_count` is GONE (#601), and this note is the record of why.
     *
     * All three engagement counters were `readonly: true` with a writer
     * nowhere — on the platform or in this app — so all three were pinned at
     * whatever the seed said, forever, while the article grid summed a "Views"
     * column. ADR-0049's enforce-or-remove leaves two honest endings per
     * field: give it a writer, or delete it. The card left this one to the
     * implementer, and the two below went the other way, so the split is
     * argued rather than assumed.
     *
     * A page-view writer WOULD have been expressible — `afterFind` is a real
     * hook event on this platform. It is not built, because of what the event
     * actually means: `beforeFind`/`afterFind` fire on record MATERIALIZATION,
     * for `find` and `findOne` alike, with no per-method read event
     * (deliberately — see the spec's note on #3195). So a counter written
     * there would increment on the article grid, on global search, on the
     * lookup picker in the close-case screen, on the AI grounding queries that
     * cite articles — every one of them a "view" of a row nobody read. The
     * number would grow fastest for articles nobody opens, and it would carry
     * a database write on every read path in the app to do it.
     *
     * "Views" that means "appearances in any query" is a worse lie than a
     * field that is missing, because it looks like data. A real page-view
     * counter needs a real view event from a real article surface — the day
     * one exists, this field comes back with it, and not before.
     *
     * `helpful_count` / `not_helpful_count` DO get a writer, and it is the
     * whole reason `crm_article_feedback` exists: reader verdicts are recorded
     * as rows and these two are RECOUNTED from them by
     * `article_feedback_metrics_refresh`. They stay `readonly: true` and that
     * is now an accurate statement — derived from evidence, never typed in.
     */
    helpful_count: Field.number({
      label: 'Helpful Votes',
      group: 'metrics',
      readonly: true,
      defaultValue: 0,
      description: 'Recounted from crm_article_feedback — never typed in.',
    }),

    not_helpful_count: Field.number({
      label: 'Not Helpful Votes',
      group: 'metrics',
      readonly: true,
      defaultValue: 0,
      description: 'Recounted from crm_article_feedback — never typed in.',
    }),
  },

  indexes: [
    { fields: ['title'] },
    { fields: ['category'] },
    { fields: ['status'] },
    { fields: ['audience'] },
    { fields: ['language'] },
  ],

  // Dead object-level enable.* flags removed in @objectstack 12 (ADR-0049);
  // only the live API surface remains. History → Field.trackHistory (ADR-0052).
  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },

  // Predicates below are TOTAL: every `record.x` read is `has()`-guarded, so the
  // rule returns a verdict even when the merged record has no such key. See
  // AGENTS.md "Validation predicates must be TOTAL" and
  // test/object-validation-predicates.test.ts, which fails the build otherwise.
  validations: [
    {
      name: 'published_requires_body',
      type: 'script',
      severity: 'error',
      message: 'Articles cannot be published without a body.',
      condition: P`has(record.status) && record.status == "published" && (!has(record.body) || record.body == null || record.body == "")`,
    },
    {
      name: 'published_requires_summary',
      type: 'script',
      severity: 'warning',
      message: 'Published articles should have a summary for search results and AI citations.',
      condition: P`has(record.status) && record.status == "published" && (!has(record.summary) || record.summary == null || record.summary == "")`,
    },
  ],
});

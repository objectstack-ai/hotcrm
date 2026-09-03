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

  // ─── Public access ─────────────────────────────────────────────────────
  //
  // Publishing a public article mints a share link through the platform's
  // `publicSharing` surface (maintainer ruling, 2026-08-02: no customer portal,
  // no anonymous-grant widening). ⛔ The whole safety of that rests on
  // `eligibility`, which is the ONLY thing standing between a share dialog and
  // a stranger reading an internal or draft article — so this block may only be
  // declared while every key below is enforced.
  //
  // MEASURED on `@objectstack/plugin-sharing@17.1.0` — the version
  // installed AT THE TIME of the measurement, not the current pin (#1460: this
  // repo has installed 17.2.0 since PR #1442, and this table has NOT been
  // re-taken on it) — against the real `ShareLinkService` and a real engine,
  // not read off a grep count:
  //
  //   | key                  | measured on 17.1.0                             |
  //   | -------------------- | ---------------------------------------------- |
  //   | `enabled`            | ENFORCED — false ⇒ SHARING_NOT_ENABLED 422     |
  //   | `allowedAudiences`   | ENFORCED — `signed_in` refused 422             |
  //   | `allowedPermissions` | ENFORCED — non-`view` refused 422              |
  //   | `redactFields`       | APPLIED to every token-served response         |
  //   | `eligibility`        | **ENFORCED — false verdict ⇒ 422, no link**    |
  //
  // `test/knowledge-article-share-links.test.ts` drives all of it end to end
  // and is the acceptance evidence; read it before changing anything here.
  //
  // ⚠️ TWO SPELLING TRAPS, both measured, both of which produce a block that
  // LOOKS declared and silently is not:
  //
  //  1. `eligibility` must be a PLAIN STRING. It is `z.ZodString` in the spec
  //     and `getPolicy()` keeps it only when `typeof raw.eligibility ===
  //     'string'`. The `P` tagged template used by `validations[].condition`
  //     below returns an Expression OBJECT `{ dialect, source }` — passing one
  //     here does not narrow anything, it makes the predicate vanish.
  //
  //  2. Every field read is `record.`-PREFIXED. The evaluator is
  //     `ExpressionEngine` from `@objectstack/formula` (record-level CEL), and
  //     `record` is the ONLY binding it is given. The bare-identifier spelling
  //     `status == 'published' && audience == 'public'` COMPILES and then fails
  //     at evaluate with `Unknown variable: audience`,
  //     which `assertEligible` turns into ELIGIBILITY_UNEVALUABLE 422. That
  //     fails CLOSED, so it is not a security hole; it is a feature that never
  //     mints a single link while reading as if it works.
  //
  // The predicate is TOTAL for the same reason the `validations` below are:
  // `has()` guards every read. `assertEligible` materializes declared fields to
  // `null` first, so an absent key would not abort here today — the guards keep
  // that true if the field set changes. (The `has(record.x)` caveat carried
  // from objectstack#7861 is about `compileCelToFilter`, the SHARING-RULE path.
  // That is a different evaluator, it is not on this code path, and it is not
  // even exported from `@objectstack/plugin-sharing`. Verified, not assumed.)
  //
  // ⚠️ Eligibility is evaluated at MINT time only; `resolveToken()` does not
  // re-check it. Re-classifying a published/public article to internal or back
  // to draft does NOT revoke links already minted from it — those must be
  // revoked explicitly. That is platform behaviour, filed upstream, not
  // something this app compensates for app-side.
  publicSharing: {
    enabled: true,
    // `public` and `link_only` only. `signed_in` would be a different feature
    // and `email` is refused at creation without an allowlist.
    allowedAudiences: ['public', 'link_only'],
    // Read-only. Same as the platform default, declared anyway: this is a
    // security boundary, and a default is not a decision.
    allowedPermissions: ['view'],
    // The gate. Published AND public-audience, nothing else — a draft, an
    // in_review, an archived, or any internal-audience article is refused at
    // `createLink` with RECORD_NOT_ELIGIBLE 422 and no row is written.
    eligibility:
      'has(record.status) && record.status == "published" && ' +
      'has(record.audience) && record.audience == "public"',
    // Stripped from every token-served response. These are the fields that
    // exist for staff: who owns the article, which customer case it was
    // written from, and when an editor last reviewed it. None of them are part
    // of the answer a reader followed the link for.
    redactFields: ['owner_id', 'related_to_case', 'last_reviewed_at'],
  },

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

  // API surface. History → Field.trackHistory (ADR-0052).
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

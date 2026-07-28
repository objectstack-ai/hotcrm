// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F, P, cel } from '@objectstack/spec';

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
    article_number: Field.autonumber({
      label: 'Article Number',
      format: 'KA-{0000}',
    }),

    title: Field.text({
      label: 'Title',
      required: true,
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

    owner: Field.lookup('sys_user', {

      defaultValue: cel`os.user.id`,
      label: 'Article Owner',
      group: 'basic',
      trackHistory: true,
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

    view_count: Field.number({
      label: 'View Count',
      group: 'metrics',
      readonly: true,
      defaultValue: 0,
    }),

    helpful_count: Field.number({
      label: 'Helpful Votes',
      group: 'metrics',
      readonly: true,
      defaultValue: 0,
    }),

    not_helpful_count: Field.number({
      label: 'Not Helpful Votes',
      group: 'metrics',
      readonly: true,
      defaultValue: 0,
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
    apiMethods: ['get', 'list', 'create', 'update', 'delete', 'search', 'export'],
  },

  validations: [
    {
      name: 'published_requires_body',
      type: 'script',
      severity: 'error',
      message: 'Articles cannot be published without a body.',
      condition: P`record.status == "published" && (record.body == null || record.body == "")`,
    },
    {
      name: 'published_requires_summary',
      type: 'script',
      severity: 'warning',
      message: 'Published articles should have a summary for search results and AI citations.',
      condition: P`record.status == "published" && (record.summary == null || record.summary == "")`,
    },
  ],
});

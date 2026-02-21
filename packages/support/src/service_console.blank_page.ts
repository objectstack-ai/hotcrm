/**
 * Service Console — Blank Page Layout
 *
 * Agent workspace with multi-panel layout: case queue, current case detail,
 * knowledge base search, SLA timers, and customer information.
 */
import { BlankPageLayoutSchema, BlankPageLayoutItemSchema, InterfacePageConfigSchema, ElementDataSourceSchema } from '@objectstack/spec/ui';

/* ── Data Sources ─────────────────────────────────────── */

const caseSource = {
  type: 'object' as const,
  object: 'case'
};

const knowledgeArticleSource = {
  type: 'object' as const,
  object: 'knowledge_article'
};

const accountSource = {
  type: 'object' as const,
  object: 'account'
};

const contactSource = {
  type: 'object' as const,
  object: 'contact'
};

ElementDataSourceSchema.parse(caseSource);
ElementDataSourceSchema.parse(knowledgeArticleSource);
ElementDataSourceSchema.parse(accountSource);
ElementDataSourceSchema.parse(contactSource);

/* ── Layout Items ─────────────────────────────────────── */

const caseQueue = {
  componentId: 'case_queue',
  type: 'text',
  x: 0,
  y: 0,
  w: 4,
  h: 8,
  width: 380,
  height: 560,
  properties: {
    displayAs: 'table',
    object: 'case',
    columns: ['case_number', 'subject', 'priority', 'status', 'created_at'],
    sort: 'priority:desc',
    title: 'My Case Queue',
    selectable: true
  }
};

const caseDetailPanel = {
  componentId: 'case_detail',
  type: 'form',
  x: 4,
  y: 0,
  w: 5,
  h: 5,
  width: 480,
  height: 340,
  properties: {
    object: 'case',
    fields: ['subject', 'description', 'priority', 'status', 'category', 'owner'],
    title: 'Case Detail',
    mode: 'edit'
  }
};

const slaTimer = {
  componentId: 'sla_timer',
  type: 'number',
  x: 9,
  y: 0,
  w: 3,
  h: 2,
  width: 280,
  height: 120,
  properties: {
    label: 'Time to Resolution',
    object: 'case',
    valueField: 'sla_remaining_hours',
    suffix: ' hrs',
    format: 'countdown',
    alertThreshold: 2
  }
};

const customerInfo = {
  componentId: 'customer_info',
  type: 'text',
  x: 9,
  y: 2,
  w: 3,
  h: 3,
  width: 280,
  height: 220,
  properties: {
    displayAs: 'detail',
    object: 'contact',
    fields: ['full_name', 'email', 'phone', 'account'],
    title: 'Customer Info'
  }
};

const kbSearch = {
  componentId: 'kb_search',
  type: 'filter',
  x: 4,
  y: 5,
  w: 8,
  h: 1,
  width: 740,
  height: 60,
  properties: {
    placeholder: 'Search knowledge base...',
    object: 'knowledge_article',
    searchFields: ['title', 'content', 'tags']
  }
};

const kbResults = {
  componentId: 'kb_results',
  type: 'text',
  x: 4,
  y: 6,
  w: 8,
  h: 2,
  width: 740,
  height: 120,
  properties: {
    displayAs: 'list',
    object: 'knowledge_article',
    columns: ['title', 'category', 'last_updated'],
    limit: 5,
    title: 'Knowledge Base Articles'
  }
};

const caseHistory = {
  componentId: 'case_history',
  type: 'text',
  x: 0,
  y: 8,
  w: 12,
  h: 3,
  width: 1140,
  height: 200,
  properties: {
    displayAs: 'feed',
    object: 'case',
    relatedField: 'case_comments',
    sort: 'created_at:desc',
    title: 'Case Activity & Comments'
  }
};

const items = [
  caseQueue,
  caseDetailPanel,
  slaTimer,
  customerInfo,
  kbSearch,
  kbResults,
  caseHistory
];

items.forEach(item => BlankPageLayoutItemSchema.parse(item));

/* ── Blank Page Layout ────────────────────────────────── */

export const ServiceConsoleBlankPage = {
  name: 'service_console',
  label: 'Service Console',
  description: 'Agent workspace with case queue, case detail, knowledge base, SLA timers, and customer information',
  items
};

BlankPageLayoutSchema.parse(ServiceConsoleBlankPage);

/* ── Interface Page Config ────────────────────────────── */

export const ServiceConsolePageConfig = {
  name: 'service_console',
  label: 'Service Console',
  dataSources: [caseSource, knowledgeArticleSource, accountSource, contactSource],
  permissions: ['view_cases', 'edit_cases', 'view_knowledge_articles', 'view_accounts', 'view_contacts']
};

InterfacePageConfigSchema.parse(ServiceConsolePageConfig);

export default ServiceConsoleBlankPage;

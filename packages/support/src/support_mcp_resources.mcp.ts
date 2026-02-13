/**
 * Support MCP Resources
 *
 * Exposes customer-support data (knowledge base, case queue, SLA dashboard)
 * as Model Context Protocol resources for AI agent consumption.
 */

import type { MCPResource } from '@objectstack/spec/ai';
import { MCPResourceSchema } from '@objectstack/spec/ai';

// ---------------------------------------------------------------------------
// knowledge_base
// ---------------------------------------------------------------------------

export const KnowledgeBaseResource = {
  uri: 'objectstack://support/knowledge',
  name: 'knowledge_base',
  description:
    'Searchable knowledge base index containing article summaries, categories, and relevance metadata for AI-assisted case resolution.',
  mimeType: 'application/json',
  resourceType: 'json' as const,
  tags: ['support', 'knowledge', 'self_service'],
  permissions: { read: true, write: false, delete: false },
  cacheable: true,
  cacheMaxAge: 1800,
} satisfies MCPResource;

MCPResourceSchema.parse(KnowledgeBaseResource);

// ---------------------------------------------------------------------------
// case_queue
// ---------------------------------------------------------------------------

export const CaseQueueResource = {
  uri: 'objectstack://support/cases/queue',
  name: 'case_queue',
  description:
    'Real-time support case queue with open cases sorted by priority, SLA remaining time, assigned agent, and customer tier.',
  mimeType: 'application/json',
  resourceType: 'json' as const,
  tags: ['support', 'case', 'queue'],
  permissions: { read: true, write: false, delete: false },
  cacheable: true,
  cacheMaxAge: 60,
} satisfies MCPResource;

MCPResourceSchema.parse(CaseQueueResource);

// ---------------------------------------------------------------------------
// sla_dashboard
// ---------------------------------------------------------------------------

export const SlaDashboardResource = {
  uri: 'objectstack://support/sla/dashboard',
  name: 'sla_dashboard',
  description:
    'SLA compliance dashboard with response-time adherence, resolution-time adherence, breach counts, and trending compliance rates.',
  mimeType: 'application/json',
  resourceType: 'json' as const,
  tags: ['support', 'sla', 'dashboard', 'metrics'],
  permissions: { read: true, write: false, delete: false },
  cacheable: true,
  cacheMaxAge: 300,
} satisfies MCPResource;

MCPResourceSchema.parse(SlaDashboardResource);

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default {
  knowledgeBase: KnowledgeBaseResource,
  caseQueue: CaseQueueResource,
  slaDashboard: SlaDashboardResource,
};

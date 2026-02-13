/**
 * Support MCP Tools
 *
 * Exposes customer-support capabilities (case search, escalation,
 * knowledge base, AI resolution) as Model Context Protocol tools
 * for AI agent consumption.
 */

import type { MCPTool } from '@objectstack/spec/ai';
import { MCPToolSchema } from '@objectstack/spec/ai';

// ---------------------------------------------------------------------------
// search_cases
// ---------------------------------------------------------------------------

export const SearchCasesTool = {
  name: 'search_cases',
  description:
    'Search support cases by keyword with optional status and priority filters. Returns matching cases with summary fields.',
  handler: 'support.search_cases.execute',
  parameters: [
    {
      name: 'query',
      type: 'string' as const,
      description: 'Free-text search query matched against case subject, description, and comments',
      required: true,
    },
    {
      name: 'status',
      type: 'string' as const,
      description: 'Filter by case status',
      required: false,
      enum: ['open', 'in_progress', 'waiting', 'resolved', 'closed'],
    },
    {
      name: 'priority',
      type: 'string' as const,
      description: 'Filter by case priority level',
      required: false,
      enum: ['low', 'medium', 'high', 'critical'],
    },
  ],
  returns: { type: 'array' as const, description: 'Array of matching support case records' },
  sideEffects: 'read' as const,
  async: true,
  requiresConfirmation: false,
  timeout: 15000,
  version: '1.0.0',
  category: 'support',
  tags: ['case', 'search', 'customer_service'],
  examples: [
    {
      description: 'Find open critical cases about billing',
      parameters: { query: 'billing error', status: 'open', priority: 'critical' },
    },
  ],
} satisfies MCPTool;

MCPToolSchema.parse(SearchCasesTool);

// ---------------------------------------------------------------------------
// escalate_case
// ---------------------------------------------------------------------------

export const EscalateCaseTool = {
  name: 'escalate_case',
  description:
    'Escalate a support case to a higher-tier support team. Records the escalation reason and triggers the escalation workflow. Requires confirmation.',
  handler: 'support.escalate_case.execute',
  parameters: [
    {
      name: 'case_id',
      type: 'string' as const,
      description: 'Unique identifier of the case to escalate',
      required: true,
    },
    {
      name: 'reason',
      type: 'string' as const,
      description: 'Justification for escalation that will be recorded in the case history',
      required: true,
    },
  ],
  returns: { type: 'object' as const, description: 'Updated case record with new escalation status and assigned team' },
  sideEffects: 'write' as const,
  async: true,
  requiresConfirmation: true,
  timeout: 15000,
  version: '1.0.0',
  category: 'support',
  tags: ['case', 'escalation', 'workflow'],
  examples: [
    {
      description: 'Escalate a case due to SLA breach',
      parameters: { case_id: 'case_5001', reason: 'SLA response time exceeded — customer impact is critical' },
    },
  ],
} satisfies MCPTool;

MCPToolSchema.parse(EscalateCaseTool);

// ---------------------------------------------------------------------------
// get_knowledge_article
// ---------------------------------------------------------------------------

export const GetKnowledgeArticleTool = {
  name: 'get_knowledge_article',
  description:
    'Retrieve a knowledge-base article by ID including its full body, attachments, and related articles.',
  handler: 'support.get_knowledge_article.execute',
  parameters: [
    {
      name: 'article_id',
      type: 'string' as const,
      description: 'Unique identifier of the knowledge article',
      required: true,
    },
  ],
  returns: { type: 'object' as const, description: 'Complete knowledge article with body content and metadata' },
  sideEffects: 'read' as const,
  async: true,
  requiresConfirmation: false,
  timeout: 10000,
  version: '1.0.0',
  category: 'support',
  tags: ['knowledge_base', 'article', 'self_service'],
  examples: [
    {
      description: 'Get article on password reset',
      parameters: { article_id: 'ka_0042' },
    },
  ],
} satisfies MCPTool;

MCPToolSchema.parse(GetKnowledgeArticleTool);

// ---------------------------------------------------------------------------
// suggest_resolution
// ---------------------------------------------------------------------------

export const SuggestResolutionTool = {
  name: 'suggest_resolution',
  description:
    'Use AI to analyse a support case and suggest potential resolutions based on similar historical cases and knowledge-base articles.',
  handler: 'support.suggest_resolution.execute',
  parameters: [
    {
      name: 'case_id',
      type: 'string' as const,
      description: 'Unique identifier of the case requiring resolution suggestions',
      required: true,
    },
  ],
  returns: { type: 'object' as const, description: 'Ranked list of suggested resolutions with confidence scores and source references' },
  sideEffects: 'read' as const,
  async: true,
  requiresConfirmation: false,
  timeout: 30000,
  version: '1.0.0',
  category: 'support',
  tags: ['case', 'ai', 'resolution', 'suggestion'],
  examples: [
    {
      description: 'Get AI resolution suggestions for a case',
      parameters: { case_id: 'case_5001' },
    },
  ],
} satisfies MCPTool;

MCPToolSchema.parse(SuggestResolutionTool);

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default {
  searchCases: SearchCasesTool,
  escalateCase: EscalateCaseTool,
  getKnowledgeArticle: GetKnowledgeArticleTool,
  suggestResolution: SuggestResolutionTool,
};

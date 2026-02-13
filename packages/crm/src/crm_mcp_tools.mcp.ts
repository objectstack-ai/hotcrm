/**
 * CRM MCP Tools
 *
 * Exposes core CRM capabilities (accounts, opportunities, activities)
 * as Model Context Protocol tools for AI agent consumption.
 */

import type { MCPTool } from '@objectstack/spec/ai';
import { MCPToolSchema } from '@objectstack/spec/ai';

// ---------------------------------------------------------------------------
// search_accounts
// ---------------------------------------------------------------------------

export const SearchAccountsTool = {
  name: 'search_accounts',
  description:
    'Search for CRM accounts by keyword, optionally filtering by industry. Returns matching account records with key fields such as name, industry, owner, and annual revenue.',
  handler: 'crm.search_accounts.execute',
  parameters: [
    {
      name: 'query',
      type: 'string' as const,
      description: 'Free-text search query matched against account name, description, and related fields',
      required: true,
    },
    {
      name: 'industry',
      type: 'string' as const,
      description: 'Filter results to a specific industry vertical',
      required: false,
    },
    {
      name: 'limit',
      type: 'number' as const,
      description: 'Maximum number of accounts to return',
      required: false,
      default: 20,
    },
  ],
  returns: { type: 'array' as const, description: 'Array of matching account records' },
  sideEffects: 'read' as const,
  async: true,
  requiresConfirmation: false,
  timeout: 15000,
  version: '1.0.0',
  category: 'crm',
  tags: ['sales', 'account', 'search'],
  examples: [
    {
      description: 'Search for technology accounts',
      parameters: { query: 'Acme', industry: 'Technology', limit: 10 },
    },
  ],
} satisfies MCPTool;

MCPToolSchema.parse(SearchAccountsTool);

// ---------------------------------------------------------------------------
// get_opportunity
// ---------------------------------------------------------------------------

export const GetOpportunityTool = {
  name: 'get_opportunity',
  description:
    'Retrieve full details of a sales opportunity including stage, amount, probability, close date, and associated contacts.',
  handler: 'crm.get_opportunity.execute',
  parameters: [
    {
      name: 'opportunity_id',
      type: 'string' as const,
      description: 'Unique identifier of the opportunity to retrieve',
      required: true,
    },
  ],
  returns: { type: 'object' as const, description: 'Complete opportunity record with all fields' },
  sideEffects: 'read' as const,
  async: true,
  requiresConfirmation: false,
  timeout: 10000,
  version: '1.0.0',
  category: 'crm',
  tags: ['sales', 'opportunity', 'detail'],
  examples: [
    {
      description: 'Get opportunity by ID',
      parameters: { opportunity_id: 'opp_001' },
    },
  ],
} satisfies MCPTool;

MCPToolSchema.parse(GetOpportunityTool);

// ---------------------------------------------------------------------------
// update_deal_stage
// ---------------------------------------------------------------------------

export const UpdateDealStageTool = {
  name: 'update_deal_stage',
  description:
    'Move a sales opportunity to a new pipeline stage. This is a write operation that modifies the deal record and may trigger stage-change automations.',
  handler: 'crm.update_deal_stage.execute',
  parameters: [
    {
      name: 'opportunity_id',
      type: 'string' as const,
      description: 'Unique identifier of the opportunity to update',
      required: true,
    },
    {
      name: 'stage',
      type: 'string' as const,
      description: 'Target pipeline stage to move the opportunity to',
      required: true,
    },
  ],
  returns: { type: 'object' as const, description: 'Updated opportunity record reflecting the new stage' },
  sideEffects: 'write' as const,
  async: true,
  requiresConfirmation: true,
  timeout: 15000,
  version: '1.0.0',
  category: 'crm',
  tags: ['sales', 'opportunity', 'pipeline', 'update'],
  examples: [
    {
      description: 'Advance deal to negotiation stage',
      parameters: { opportunity_id: 'opp_001', stage: 'Negotiation' },
    },
  ],
} satisfies MCPTool;

MCPToolSchema.parse(UpdateDealStageTool);

// ---------------------------------------------------------------------------
// create_activity
// ---------------------------------------------------------------------------

export const CreateActivityTool = {
  name: 'create_activity',
  description:
    'Log a new activity (call, email, meeting, task) against a CRM record. The activity is stored in the activity timeline of the related record.',
  handler: 'crm.create_activity.execute',
  parameters: [
    {
      name: 'type',
      type: 'string' as const,
      description: 'Activity type',
      required: true,
      enum: ['call', 'email', 'meeting', 'task'],
    },
    {
      name: 'subject',
      type: 'string' as const,
      description: 'Brief subject or title of the activity',
      required: true,
    },
    {
      name: 'related_to',
      type: 'string' as const,
      description: 'ID of the parent record (account, opportunity, or contact) to associate the activity with',
      required: true,
    },
  ],
  returns: { type: 'object' as const, description: 'Newly created activity record with assigned ID' },
  sideEffects: 'write' as const,
  async: true,
  requiresConfirmation: false,
  timeout: 10000,
  version: '1.0.0',
  category: 'crm',
  tags: ['sales', 'activity', 'logging'],
  examples: [
    {
      description: 'Log a discovery call',
      parameters: { type: 'call', subject: 'Discovery call with stakeholder', related_to: 'acc_042' },
    },
  ],
} satisfies MCPTool;

MCPToolSchema.parse(CreateActivityTool);

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default {
  searchAccounts: SearchAccountsTool,
  getOpportunity: GetOpportunityTool,
  updateDealStage: UpdateDealStageTool,
  createActivity: CreateActivityTool,
};

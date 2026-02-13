/**
 * Marketing MCP Tools
 *
 * Exposes marketing-cloud capabilities (campaign metrics, lead search,
 * engagement tracking, campaign creation) as Model Context Protocol tools
 * for AI agent consumption.
 */

import type { MCPTool } from '@objectstack/spec/ai';
import { MCPToolSchema } from '@objectstack/spec/ai';

// ---------------------------------------------------------------------------
// get_campaign_metrics
// ---------------------------------------------------------------------------

export const GetCampaignMetricsTool = {
  name: 'get_campaign_metrics',
  description:
    'Retrieve performance metrics for a marketing campaign including impressions, clicks, conversions, cost, and ROI.',
  handler: 'marketing.get_campaign_metrics.execute',
  parameters: [
    {
      name: 'campaign_id',
      type: 'string' as const,
      description: 'Unique identifier of the campaign',
      required: true,
    },
  ],
  returns: { type: 'object' as const, description: 'Campaign metrics with KPIs and trend data' },
  sideEffects: 'read' as const,
  async: true,
  requiresConfirmation: false,
  timeout: 15000,
  version: '1.0.0',
  category: 'marketing',
  tags: ['campaign', 'metrics', 'analytics'],
  examples: [
    {
      description: 'Get metrics for a product-launch campaign',
      parameters: { campaign_id: 'cmp_2024_q1_launch' },
    },
  ],
} satisfies MCPTool;

MCPToolSchema.parse(GetCampaignMetricsTool);

// ---------------------------------------------------------------------------
// search_leads
// ---------------------------------------------------------------------------

export const SearchLeadsTool = {
  name: 'search_leads',
  description:
    'Search marketing leads by keyword with an optional filter by lead source. Returns matching leads with score, status, and source information.',
  handler: 'marketing.search_leads.execute',
  parameters: [
    {
      name: 'query',
      type: 'string' as const,
      description: 'Free-text search query matched against lead name, company, and email',
      required: true,
    },
    {
      name: 'source',
      type: 'string' as const,
      description: 'Filter leads by acquisition source',
      required: false,
      enum: ['web', 'referral', 'event', 'social', 'paid', 'organic'],
    },
  ],
  returns: { type: 'array' as const, description: 'Array of matching lead records' },
  sideEffects: 'read' as const,
  async: true,
  requiresConfirmation: false,
  timeout: 15000,
  version: '1.0.0',
  category: 'marketing',
  tags: ['lead', 'search', 'acquisition'],
  examples: [
    {
      description: 'Search for leads from web source',
      parameters: { query: 'enterprise', source: 'web' },
    },
  ],
} satisfies MCPTool;

MCPToolSchema.parse(SearchLeadsTool);

// ---------------------------------------------------------------------------
// get_engagement_data
// ---------------------------------------------------------------------------

export const GetEngagementDataTool = {
  name: 'get_engagement_data',
  description:
    'Retrieve engagement history for a specific contact including email opens, link clicks, page visits, and event attendance.',
  handler: 'marketing.get_engagement_data.execute',
  parameters: [
    {
      name: 'contact_id',
      type: 'string' as const,
      description: 'Unique identifier of the contact',
      required: true,
    },
  ],
  returns: { type: 'object' as const, description: 'Contact engagement timeline with interaction details' },
  sideEffects: 'read' as const,
  async: true,
  requiresConfirmation: false,
  timeout: 15000,
  version: '1.0.0',
  category: 'marketing',
  tags: ['engagement', 'contact', 'tracking'],
  examples: [
    {
      description: 'Get engagement data for a contact',
      parameters: { contact_id: 'con_1234' },
    },
  ],
} satisfies MCPTool;

MCPToolSchema.parse(GetEngagementDataTool);

// ---------------------------------------------------------------------------
// create_campaign
// ---------------------------------------------------------------------------

export const CreateCampaignTool = {
  name: 'create_campaign',
  description:
    'Create a new marketing campaign with the specified name, type, and start date. Returns the new campaign record ready for further configuration.',
  handler: 'marketing.create_campaign.execute',
  parameters: [
    {
      name: 'name',
      type: 'string' as const,
      description: 'Display name for the campaign',
      required: true,
    },
    {
      name: 'type',
      type: 'string' as const,
      description: 'Campaign type',
      required: true,
      enum: ['email', 'social', 'event', 'webinar', 'paid_ads', 'content'],
    },
    {
      name: 'start_date',
      type: 'string' as const,
      description: 'Campaign start date in ISO 8601 format',
      required: true,
    },
  ],
  returns: { type: 'object' as const, description: 'Newly created campaign record with assigned ID' },
  sideEffects: 'write' as const,
  async: true,
  requiresConfirmation: false,
  timeout: 15000,
  version: '1.0.0',
  category: 'marketing',
  tags: ['campaign', 'create', 'planning'],
  examples: [
    {
      description: 'Create a webinar campaign',
      parameters: { name: 'Q2 Product Webinar', type: 'webinar', start_date: '2024-04-15' },
    },
  ],
} satisfies MCPTool;

MCPToolSchema.parse(CreateCampaignTool);

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default {
  getCampaignMetrics: GetCampaignMetricsTool,
  searchLeads: SearchLeadsTool,
  getEngagementData: GetEngagementDataTool,
  createCampaign: CreateCampaignTool,
};

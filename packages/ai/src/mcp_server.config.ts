/**
 * HotCRM MCP Server Configuration
 *
 * Defines the Model Context Protocol server that exposes HotCRM's
 * AI capabilities as tools, resources, and prompts to AI agents.
 */

import type {
  MCPServerConfig,
  MCPTool,
  MCPToolParameter,
  MCPResource,
  MCPPrompt,
  MCPPromptArgument,
  MCPCapability,
  MCPServerInfo,
  MCPTransportConfig,
  MCPTransportType,
} from '@objectstack/spec/ai';

import {
  MCPServerConfigSchema,
  MCPToolSchema,
  MCPResourceSchema,
  MCPPromptSchema,
} from '@objectstack/spec/ai';

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

const leadScoring: MCPTool = {
  name: 'lead_scoring',
  description: 'Score leads based on engagement signals and demographic fit',
  handler: 'crm.lead_scoring.execute',
  parameters: [
    { name: 'lead_id', type: 'string', description: 'ID of the lead to score', required: true },
    { name: 'scoring_model', type: 'string', description: 'Scoring model variant to use', required: false, default: 'default' },
    { name: 'include_factors', type: 'boolean', description: 'Include individual scoring factors in the response', required: false, default: true },
  ],
  returns: { type: 'object', description: 'Lead score with breakdown factors' },
  sideEffects: 'read',
  async: false,
  requiresConfirmation: false,
  deprecated: false,
  version: '1.0.0',
  category: 'crm',
  tags: ['sales', 'lead', 'scoring'],
};

const opportunityForecast: MCPTool = {
  name: 'opportunity_forecast',
  description: 'Forecast opportunity close probability using historical win/loss patterns',
  handler: 'crm.opportunity_forecast.execute',
  parameters: [
    { name: 'opportunity_id', type: 'string', description: 'ID of the opportunity', required: true },
    { name: 'horizon_days', type: 'number', description: 'Forecast horizon in days', required: false, default: 90 },
    { name: 'include_similar_deals', type: 'boolean', description: 'Include analysis of similar historical deals', required: false, default: false },
  ],
  returns: { type: 'object', description: 'Close probability, expected date, and confidence interval' },
  sideEffects: 'read',
  async: false,
  requiresConfirmation: false,
  deprecated: false,
  version: '1.0.0',
  category: 'crm',
  tags: ['sales', 'opportunity', 'forecast'],
};

const caseClassification: MCPTool = {
  name: 'case_classification',
  description: 'AI-classify support cases by category, priority, and sentiment',
  handler: 'support.case_classification.execute',
  parameters: [
    { name: 'case_id', type: 'string', description: 'ID of the support case', required: true },
    { name: 'reclassify', type: 'boolean', description: 'Force reclassification even if already classified', required: false, default: false },
  ],
  returns: { type: 'object', description: 'Classification with category, priority, sentiment, and confidence' },
  sideEffects: 'read',
  async: false,
  requiresConfirmation: false,
  deprecated: false,
  version: '1.0.0',
  category: 'support',
  tags: ['support', 'case', 'classification', 'nlp'],
};

const knowledgeSearch: MCPTool = {
  name: 'knowledge_search',
  description: 'Semantic search across the knowledge base using vector embeddings',
  handler: 'support.knowledge_search.execute',
  parameters: [
    { name: 'query', type: 'string', description: 'Natural language search query', required: true },
    { name: 'top_k', type: 'number', description: 'Number of results to return', required: false, default: 5 },
    { name: 'category', type: 'string', description: 'Restrict search to a knowledge base category', required: false },
    { name: 'min_score', type: 'number', description: 'Minimum similarity score threshold (0-1)', required: false, default: 0.7, minimum: 0, maximum: 1 },
  ],
  returns: { type: 'array', description: 'Ranked list of knowledge articles with relevance scores' },
  sideEffects: 'read',
  async: false,
  requiresConfirmation: false,
  deprecated: false,
  version: '1.0.0',
  category: 'support',
  tags: ['support', 'knowledge', 'search', 'semantic'],
};

const candidateScreening: MCPTool = {
  name: 'candidate_screening',
  description: 'AI screening for candidates against job requirements and culture fit',
  handler: 'hr.candidate_screening.execute',
  parameters: [
    { name: 'candidate_id', type: 'string', description: 'ID of the candidate', required: true },
    { name: 'job_id', type: 'string', description: 'ID of the job posting to screen against', required: true },
    { name: 'include_bias_check', type: 'boolean', description: 'Include bias detection analysis', required: false, default: true },
  ],
  returns: { type: 'object', description: 'Screening result with skills match, experience fit, and recommendation' },
  sideEffects: 'read',
  async: false,
  requiresConfirmation: false,
  deprecated: false,
  version: '1.0.0',
  category: 'hr',
  tags: ['hr', 'candidate', 'screening', 'recruitment'],
};

const revenueForecast: MCPTool = {
  name: 'revenue_forecast',
  description: 'Revenue forecasting using pipeline data and historical trends',
  handler: 'finance.revenue_forecast.execute',
  parameters: [
    { name: 'period', type: 'string', description: 'Forecast period (e.g. Q1-2025, 2025)', required: true },
    { name: 'segment', type: 'string', description: 'Business segment to forecast', required: false },
    { name: 'model', type: 'string', description: 'Forecasting model: linear, arima, or ensemble', required: false, default: 'ensemble' },
  ],
  returns: { type: 'object', description: 'Revenue forecast with projections, confidence intervals, and drivers' },
  sideEffects: 'read',
  async: false,
  requiresConfirmation: false,
  deprecated: false,
  version: '1.0.0',
  category: 'finance',
  tags: ['finance', 'revenue', 'forecast'],
};

const campaignOptimization: MCPTool = {
  name: 'campaign_optimization',
  description: 'Optimize campaign ROI through channel mix and audience targeting recommendations',
  handler: 'marketing.campaign_optimization.execute',
  parameters: [
    { name: 'campaign_id', type: 'string', description: 'ID of the campaign to optimize', required: true },
    { name: 'budget_constraint', type: 'number', description: 'Maximum budget for optimization', required: false },
    { name: 'objective', type: 'string', description: 'Optimization objective: roi, conversions, or reach', required: false, default: 'roi' },
  ],
  returns: { type: 'object', description: 'Optimization recommendations with projected impact' },
  sideEffects: 'read',
  async: false,
  requiresConfirmation: false,
  deprecated: false,
  version: '1.0.0',
  category: 'marketing',
  tags: ['marketing', 'campaign', 'optimization', 'roi'],
};

const pricingRecommendation: MCPTool = {
  name: 'pricing_recommendation',
  description: 'Generate product pricing recommendations based on market data and margins',
  handler: 'products.pricing_recommendation.execute',
  parameters: [
    { name: 'product_id', type: 'string', description: 'ID of the product', required: true },
    { name: 'market', type: 'string', description: 'Target market or region', required: false },
    { name: 'strategy', type: 'string', description: 'Pricing strategy: competitive, value, or cost_plus', required: false, default: 'value' },
    { name: 'include_elasticity', type: 'boolean', description: 'Include price elasticity analysis', required: false, default: false },
  ],
  returns: { type: 'object', description: 'Recommended price, margin analysis, and competitive positioning' },
  sideEffects: 'read',
  async: false,
  requiresConfirmation: false,
  deprecated: false,
  version: '1.0.0',
  category: 'products',
  tags: ['products', 'pricing', 'cpq', 'recommendation'],
};

const mcpTools: MCPTool[] = [
  leadScoring,
  opportunityForecast,
  caseClassification,
  knowledgeSearch,
  candidateScreening,
  revenueForecast,
  campaignOptimization,
  pricingRecommendation,
];

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

const mcpResources: MCPResource[] = [
  {
    uri: 'hotcrm://crm/account_context',
    name: 'account_context',
    description: 'Aggregated account context including recent activities, open opportunities, and health score',
    mimeType: 'application/json',
    resourceType: 'json',
    tags: ['crm', 'account'],
    cacheable: true,
    cacheMaxAge: 300,
  },
  {
    uri: 'hotcrm://crm/pipeline_summary',
    name: 'pipeline_summary',
    description: 'Sales pipeline summary with stage distribution, velocity metrics, and forecast',
    mimeType: 'application/json',
    resourceType: 'json',
    tags: ['crm', 'pipeline', 'sales'],
    cacheable: true,
    cacheMaxAge: 600,
  },
  {
    uri: 'hotcrm://support/case_metrics',
    name: 'case_metrics',
    description: 'Support case metrics including open count, average resolution time, and CSAT trends',
    mimeType: 'application/json',
    resourceType: 'json',
    tags: ['support', 'metrics'],
    cacheable: true,
    cacheMaxAge: 300,
  },
  {
    uri: 'hotcrm://hr/hr_dashboard',
    name: 'hr_dashboard',
    description: 'HR dashboard data with headcount, open positions, attrition rate, and hiring funnel',
    mimeType: 'application/json',
    resourceType: 'json',
    tags: ['hr', 'dashboard'],
    cacheable: true,
    cacheMaxAge: 900,
  },
];

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const mcpPrompts: MCPPrompt[] = [
  {
    name: 'sales_briefing',
    description: 'Generate a comprehensive sales briefing for an upcoming meeting',
    messages: [
      {
        role: 'system',
        content:
          'You are a sales intelligence assistant for HotCRM. Produce concise, actionable briefings that help sales reps prepare for meetings. Include account history, open opportunities, recent interactions, and recommended talking points.',
      },
      {
        role: 'user',
        content:
          'Prepare a sales briefing for account {{account_id}}. The meeting is with {{contact_name}} on {{meeting_date}}. Focus areas: {{focus_areas}}.',
      },
    ],
    arguments: [
      { name: 'account_id', description: 'Target account ID', type: 'string', required: true },
      { name: 'contact_name', description: 'Name of the meeting contact', type: 'string', required: true },
      { name: 'meeting_date', description: 'Date of the meeting (ISO 8601)', type: 'string', required: true },
      { name: 'focus_areas', description: 'Comma-separated focus areas for the briefing', type: 'string', required: false, default: 'general' },
    ],
    category: 'crm',
    tags: ['sales', 'briefing', 'meeting-prep'],
    version: '1.0.0',
  },
  {
    name: 'case_resolution',
    description: 'Suggest resolution steps for a support case using knowledge base and similar past cases',
    messages: [
      {
        role: 'system',
        content:
          'You are a support resolution assistant for HotCRM. Analyze the support case and suggest step-by-step resolution guidance. Reference knowledge base articles and similar resolved cases where applicable.',
      },
      {
        role: 'user',
        content:
          'Suggest a resolution for support case {{case_id}}. Customer priority: {{priority}}. Additional context: {{context}}.',
      },
    ],
    arguments: [
      { name: 'case_id', description: 'Support case ID', type: 'string', required: true },
      { name: 'priority', description: 'Case priority level', type: 'string', required: false, default: 'medium' },
      { name: 'context', description: 'Additional context or symptoms', type: 'string', required: false },
    ],
    category: 'support',
    tags: ['support', 'resolution', 'knowledge-base'],
    version: '1.0.0',
  },
  {
    name: 'candidate_evaluation',
    description: 'Evaluate a candidate against job requirements and provide a structured assessment',
    messages: [
      {
        role: 'system',
        content:
          'You are an HR evaluation assistant for HotCRM. Provide a fair, structured candidate evaluation based on skills, experience, and cultural alignment. Flag any potential bias in the assessment.',
      },
      {
        role: 'user',
        content:
          'Evaluate candidate {{candidate_id}} for position {{job_id}}. Evaluation criteria: {{criteria}}.',
      },
    ],
    arguments: [
      { name: 'candidate_id', description: 'Candidate ID', type: 'string', required: true },
      { name: 'job_id', description: 'Job posting ID', type: 'string', required: true },
      { name: 'criteria', description: 'Specific evaluation criteria to focus on', type: 'string', required: false, default: 'skills,experience,culture_fit' },
    ],
    category: 'hr',
    tags: ['hr', 'candidate', 'evaluation'],
    version: '1.0.0',
  },
];

// ---------------------------------------------------------------------------
// Server Configuration
// ---------------------------------------------------------------------------

export const hotcrmMCPServerConfig: MCPServerConfig = MCPServerConfigSchema.parse({
  name: 'hotcrm_ai_server',
  label: 'HotCRM AI Server',
  description: 'Model Context Protocol server exposing HotCRM AI capabilities across CRM, Support, HR, Finance, Marketing, and Products',
  serverInfo: {
    name: 'hotcrm_ai_server',
    version: '1.0.0',
    description: 'HotCRM unified AI server',
    capabilities: {
      resources: true,
      resourceTemplates: false,
      tools: true,
      prompts: true,
      sampling: false,
      logging: true,
    },
    protocolVersion: '2024-11-05',
    vendor: 'HotCRM',
  },
  transport: {
    type: 'stdio' as MCPTransportType,
    command: 'node',
    args: ['dist/mcp-server.js'],
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  tools: mcpTools,
  resources: mcpResources,
  prompts: mcpPrompts,
  autoStart: true,
  restartOnFailure: true,
  healthCheck: {
    enabled: true,
    interval: 30,
    timeout: 5,
  },
  tags: ['hotcrm', 'ai', 'mcp'],
  status: 'active',
  version: '1.0.0',
});

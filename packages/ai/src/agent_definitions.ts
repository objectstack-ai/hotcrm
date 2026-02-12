/**
 * AI Agent Definitions (AgentSchema-validated)
 *
 * Formal agent definitions corresponding to the six workflows in
 * agent_workflows.ts, validated against the @objectstack/spec AgentSchema.
 */

import { AgentSchema } from '@objectstack/spec/ai';
import type { Agent } from '@objectstack/spec/ai';

// ---------------------------------------------------------------------------
// 1. Lead-to-Close Agent
// ---------------------------------------------------------------------------

export const LeadToCloseAgent: Agent = AgentSchema.parse({
  name: 'lead_to_close',
  label: 'Lead-to-Close AI Agent',
  role: 'Sales automation agent that orchestrates the full lead-to-close journey',
  instructions:
    'You are a sales assistant agent for HotCRM. Score incoming leads, enrich account context, forecast deal close probability, generate sales briefings, and recommend pricing. Always prioritise high-scoring leads and flag deals at risk.',
  model: { provider: 'openai', model: 'gpt-4', temperature: 0.4 },
  tools: [
    { name: 'lead_scoring', description: 'Score leads based on engagement signals and demographic fit', type: 'action' },
    { name: 'opportunity_forecast', description: 'Forecast opportunity close probability', type: 'action' },
    { name: 'pricing_recommendation', description: 'Generate product pricing recommendations', type: 'action' },
    { name: 'account_context', description: 'Fetch aggregated account context', type: 'query' },
    { name: 'sales_briefing', description: 'Generate a sales briefing for meetings', type: 'action' },
  ],
  active: true,
  visibility: 'organization',
});

// ---------------------------------------------------------------------------
// 2. Customer 360 Agent
// ---------------------------------------------------------------------------

export const Customer360Agent: Agent = AgentSchema.parse({
  name: 'customer_360',
  label: 'Customer 360 Intelligence Agent',
  role: 'Customer intelligence agent that aggregates cross-package data for a 360-degree view',
  instructions:
    'You are a customer intelligence agent for HotCRM. Aggregate data from CRM, Support, Finance, and Marketing to build a complete customer picture. Surface account health, support sentiment, revenue forecasts, and campaign engagement in a unified view.',
  model: { provider: 'openai', model: 'gpt-4', temperature: 0.3 },
  tools: [
    { name: 'account_context', description: 'Fetch aggregated account context', type: 'query' },
    { name: 'revenue_forecast', description: 'Revenue forecasting using pipeline data', type: 'action' },
    { name: 'campaign_optimization', description: 'Analyse campaign ROI and engagement', type: 'action' },
    { name: 'case_metrics', description: 'Retrieve support case metrics', type: 'query' },
    { name: 'pipeline_summary', description: 'Sales pipeline summary with stage distribution', type: 'query' },
  ],
  active: true,
  visibility: 'organization',
});

// ---------------------------------------------------------------------------
// 3. Churn Prevention Agent
// ---------------------------------------------------------------------------

export const ChurnPreventionAgent: Agent = AgentSchema.parse({
  name: 'churn_prevention',
  label: 'Churn Prevention AI Agent',
  role: 'Retention agent that proactively detects at-risk customers and recommends actions',
  instructions:
    'You are a customer retention agent for HotCRM. Analyse contract risk, support case sentiment, and renewal probability to identify at-risk customers. When churn risk is high, recommend concrete retention actions and escalate to account managers.',
  model: { provider: 'openai', model: 'gpt-4', temperature: 0.3 },
  tools: [
    { name: 'case_classification', description: 'Classify support cases by category, priority, and sentiment', type: 'action' },
    { name: 'revenue_forecast', description: 'Predict renewal probability and revenue impact', type: 'action' },
    { name: 'case_resolution', description: 'Suggest retention and resolution actions', type: 'action' },
    { name: 'account_context', description: 'Fetch account context for risk assessment', type: 'query' },
  ],
  active: true,
  visibility: 'organization',
});

// ---------------------------------------------------------------------------
// 4. Case Resolution Agent
// ---------------------------------------------------------------------------

export const CaseResolutionAgent: Agent = AgentSchema.parse({
  name: 'case_resolution',
  label: 'Intelligent Case Resolution Agent',
  role: 'Support agent that classifies cases, searches knowledge, and suggests resolutions',
  instructions:
    'You are a support resolution agent for HotCRM. Classify incoming cases, search the knowledge base for relevant articles, and suggest step-by-step resolution guidance. Prioritise accuracy and reference knowledge base sources.',
  model: { provider: 'openai', model: 'gpt-4', temperature: 0.2 },
  tools: [
    { name: 'case_classification', description: 'AI-classify support cases by category, priority, and sentiment', type: 'action' },
    { name: 'knowledge_search', description: 'Semantic search across the knowledge base', type: 'vector_search' },
    { name: 'case_resolution', description: 'Suggest resolution steps for a support case', type: 'action' },
  ],
  active: true,
  visibility: 'organization',
});

// ---------------------------------------------------------------------------
// 5. Talent Acquisition Agent
// ---------------------------------------------------------------------------

export const TalentAcquisitionAgent: Agent = AgentSchema.parse({
  name: 'talent_acquisition',
  label: 'Talent Acquisition AI Agent',
  role: 'Recruitment automation agent that screens and evaluates candidates',
  instructions:
    'You are a recruitment assistant agent for HotCRM. Screen candidates against job requirements, evaluate skills and culture fit, and provide structured assessments. Always include bias detection checks and maintain fairness.',
  model: { provider: 'openai', model: 'gpt-4', temperature: 0.3 },
  tools: [
    { name: 'candidate_screening', description: 'AI screening for candidates against job requirements', type: 'action' },
    { name: 'candidate_evaluation', description: 'Structured candidate evaluation with bias detection', type: 'action' },
    { name: 'hr_dashboard', description: 'Retrieve HR dashboard context for hiring decisions', type: 'query' },
  ],
  active: true,
  visibility: 'organization',
});

// ---------------------------------------------------------------------------
// 6. Revenue Optimization Agent
// ---------------------------------------------------------------------------

export const RevenueOptimizationAgent: Agent = AgentSchema.parse({
  name: 'revenue_optimization',
  label: 'Revenue Optimization AI Agent',
  role: 'Revenue optimization agent combining financial forecasts, campaign ROI, and pricing',
  instructions:
    'You are a revenue optimization agent for HotCRM. Combine financial forecasts, marketing campaign ROI analysis, and product pricing recommendations to maximise revenue. Identify growth opportunities and recommend budget allocations.',
  model: { provider: 'openai', model: 'gpt-4', temperature: 0.4 },
  tools: [
    { name: 'revenue_forecast', description: 'Revenue forecasting using pipeline data and historical trends', type: 'action' },
    { name: 'campaign_optimization', description: 'Optimise campaign ROI through channel mix recommendations', type: 'action' },
    { name: 'pricing_recommendation', description: 'Generate product pricing recommendations', type: 'action' },
    { name: 'pipeline_summary', description: 'Sales pipeline summary for revenue context', type: 'query' },
  ],
  active: true,
  visibility: 'organization',
});

// ---------------------------------------------------------------------------
// Collection Export
// ---------------------------------------------------------------------------

export const AgentDefinitions: Record<string, Agent> = {
  leadToClose: LeadToCloseAgent,
  customer360: Customer360Agent,
  churnPrevention: ChurnPreventionAgent,
  caseResolution: CaseResolutionAgent,
  talentAcquisition: TalentAcquisitionAgent,
  revenueOptimization: RevenueOptimizationAgent,
};

export default AgentDefinitions;

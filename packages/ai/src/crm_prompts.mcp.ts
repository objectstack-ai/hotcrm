/**
 * CRM MCP Prompts
 *
 * Structured prompt templates for CRM-related AI interactions including
 * deal analysis, customer 360 views, next-best-action, and win/loss analysis.
 */

import type { MCPPrompt } from '@objectstack/spec/ai';
import { MCPPromptSchema } from '@objectstack/spec/ai';

// ---------------------------------------------------------------------------
// deal_analysis
// ---------------------------------------------------------------------------

export const DealAnalysisPrompt = {
  name: 'deal_analysis',
  description:
    'Analyse a sales opportunity and provide a risk assessment, recommended actions, and close-probability estimate.',
  messages: [
    {
      role: 'system' as const,
      content:
        'You are a senior sales strategist for HotCRM. Analyse the given opportunity thoroughly — examine deal size, stage tenure, stakeholder engagement, competitive landscape, and historical patterns. Provide a structured risk assessment with a probability-to-close estimate, key risks, and concrete next steps.',
    },
    {
      role: 'user' as const,
      content:
        'Analyse opportunity {{opportunity_id}}. Evaluate current stage progression, deal health signals, and competitive positioning. {{#include_history}}Include full activity history and timeline analysis.{{/include_history}} Highlight the top 3 risks and recommend specific actions to advance the deal.',
    },
  ],
  arguments: [
    {
      name: 'opportunity_id',
      description: 'Unique identifier of the opportunity to analyse',
      type: 'string' as const,
      required: true,
    },
    {
      name: 'include_history',
      description: 'When true, include full engagement history and timeline in the analysis',
      type: 'boolean' as const,
      required: false,
      default: false,
    },
  ],
  category: 'crm',
  tags: ['sales', 'opportunity', 'analysis', 'risk'],
  version: '1.0.0',
} satisfies MCPPrompt;

MCPPromptSchema.parse(DealAnalysisPrompt);

// ---------------------------------------------------------------------------
// customer_360_summary
// ---------------------------------------------------------------------------

export const Customer360SummaryPrompt = {
  name: 'customer_360_summary',
  description:
    'Generate a comprehensive 360-degree summary of a customer account spanning sales, support, finance, and engagement data.',
  messages: [
    {
      role: 'system' as const,
      content:
        'You are a customer intelligence analyst for HotCRM. Compile a holistic 360-degree view of the account covering: relationship history, revenue contribution, open and closed opportunities, support case trends, product adoption, health score drivers, and strategic importance. Present findings in a concise executive summary.',
    },
    {
      role: 'user' as const,
      content:
        'Generate a complete 360-degree summary for account {{account_id}}. Include relationship timeline, revenue trends, open opportunities, recent support interactions, product usage, and an overall health assessment with recommended engagement strategy.',
    },
  ],
  arguments: [
    {
      name: 'account_id',
      description: 'Unique identifier of the account',
      type: 'string' as const,
      required: true,
    },
  ],
  category: 'crm',
  tags: ['sales', 'account', 'customer_360', 'summary'],
  version: '1.0.0',
} satisfies MCPPrompt;

MCPPromptSchema.parse(Customer360SummaryPrompt);

// ---------------------------------------------------------------------------
// next_best_action
// ---------------------------------------------------------------------------

export const NextBestActionPrompt = {
  name: 'next_best_action',
  description:
    'Recommend the optimal next action for a CRM record based on engagement history, stage, and predictive signals.',
  messages: [
    {
      role: 'system' as const,
      content:
        'You are an AI sales coach for HotCRM. Given a CRM record, evaluate recent activity, current stage, stakeholder engagement, and predictive signals. Recommend the single most impactful next action the rep should take, with a clear rationale and suggested timing. Rank up to 3 alternative actions.',
    },
    {
      role: 'user' as const,
      content:
        'Determine the next best action for {{record_type}} record {{record_id}}. Consider recent interactions, engagement gaps, upcoming milestones, and competitive signals. Provide the primary recommendation with rationale and up to 2 alternatives.',
    },
  ],
  arguments: [
    {
      name: 'record_id',
      description: 'Unique identifier of the CRM record',
      type: 'string' as const,
      required: true,
    },
    {
      name: 'record_type',
      description: 'Type of CRM record (e.g., opportunity, account, lead)',
      type: 'string' as const,
      required: true,
    },
  ],
  category: 'crm',
  tags: ['sales', 'next_best_action', 'recommendation', 'coaching'],
  version: '1.0.0',
} satisfies MCPPrompt;

MCPPromptSchema.parse(NextBestActionPrompt);

// ---------------------------------------------------------------------------
// win_loss_analysis
// ---------------------------------------------------------------------------

export const WinLossAnalysisPrompt = {
  name: 'win_loss_analysis',
  description:
    'Perform a structured win/loss analysis for a closed opportunity to extract learnings and improve future deal execution.',
  messages: [
    {
      role: 'system' as const,
      content:
        'You are a revenue operations analyst for HotCRM. Conduct a thorough win/loss analysis of the closed opportunity. Examine decision criteria, competitive dynamics, sales process adherence, pricing strategy, stakeholder alignment, and timing factors. Distil findings into actionable learnings for the sales team.',
    },
    {
      role: 'user' as const,
      content:
        'Perform a win/loss analysis for opportunity {{opportunity_id}}. Identify the primary factors that influenced the outcome, evaluate sales process execution, assess competitive positioning, and provide specific recommendations to improve win rates on similar deals.',
    },
  ],
  arguments: [
    {
      name: 'opportunity_id',
      description: 'Unique identifier of the closed opportunity to analyse',
      type: 'string' as const,
      required: true,
    },
  ],
  category: 'crm',
  tags: ['sales', 'opportunity', 'win_loss', 'analysis'],
  version: '1.0.0',
} satisfies MCPPrompt;

MCPPromptSchema.parse(WinLossAnalysisPrompt);

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default {
  dealAnalysis: DealAnalysisPrompt,
  customer360Summary: Customer360SummaryPrompt,
  nextBestAction: NextBestActionPrompt,
  winLossAnalysis: WinLossAnalysisPrompt,
};

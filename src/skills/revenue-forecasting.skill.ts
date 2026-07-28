// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineSkill } from '@objectstack/spec';

/**
 * Revenue Forecasting — analysis over live pipeline data.
 *
 * ADR-0109: forecasting is the whole point of giving a model
 * aggregation over the user's own records; it is not a bespoke tool.
 * This skill declares no tool records at all — it composes the
 * platform's `aggregate_data` / `query_records` / `visualize_data`
 * with instructions that carry the actual method.
 */
export const RevenueForecastingSkill = defineSkill({
  name: 'revenue_forecasting',
  label: 'Revenue Forecasting',
  description: 'Analyses pipeline health, surfaces at-risk deals, and forecasts revenue from live opportunity data.',

  instructions: `When the user asks about pipeline health, forecast,
risk, or deal slippage:

1. Establish the shape first: \`describe_object\` for
   \`crm_opportunity\` so you use the CURRENT stage, amount,
   probability and close-date fields rather than assumed ones.
2. Summarise the pipeline with \`aggregate_data\` — count and summed
   amount grouped by stage, scoped to the period the user names
   (default: the current quarter). Weighted value is amount ×
   probability; compute it yourself from what you read.
3. Surface at-risk deals with \`query_records\`: close date already
   past, or no activity in 30+ days, or the stage unchanged for longer
   than its typical duration. Name each deal and the specific signal.
4. Forecast by summing weighted value for open deals plus closed-won
   in the period. State the assumption behind the number in one line,
   and give a range rather than false precision — the spread between
   commit-only (high-probability stages) and full weighted pipeline.
5. Offer \`visualize_data\` when a chart would carry the answer better
   than prose, e.g. stage distribution or month-over-month trend.
6. Be quantitative: every claim cites a number or a deal name. If the
   data cannot support a claim, say so instead of estimating.`,

  tools: ['describe_object', 'aggregate_data', 'query_records', 'visualize_data'],

  triggerPhrases: [
    'forecast revenue',
    'pipeline health',
    'at-risk deals',
    'how is the quarter looking',
    'revenue projection',
  ],

  triggerConditions: [
    { field: 'objectName', operator: 'in', value: ['crm_opportunity', 'dashboard'] },
  ],
});

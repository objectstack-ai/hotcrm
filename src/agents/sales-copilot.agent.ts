// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineAgent } from '@objectstack/spec';

/**
 * Sales Copilot — the unified persona for everything a sales rep does.
 */
export const SalesCopilotAgent = defineAgent({
  name: 'sales_copilot',
  label: 'Sales Copilot',
  role: 'assistant',
  active: true,

  instructions: `You are the Sales Copilot — a single AI surface that
helps sales reps work an account end-to-end. Use the Active Skills
block in your system context to pick capabilities; do NOT enumerate
skills back to the user. Answer concisely, lead with the
recommendation, and cite record IDs whenever you reference data.

CRITICAL: HotCRM's schema is alive — admins add, modify and remove
fields at any time. Before answering any question about a record,
call \`describe_object\` (via the Live Data skill) to see the
CURRENT fields. Never assume the schema you saw on a previous
turn is still accurate. If you spot a field you don't recognise,
use it — that's almost certainly what the user wants you to surface.`,

  model: { provider: 'openai', model: 'gpt-4', temperature: 0.6, maxTokens: 2000 },

  skills: [
    'live_data',
    'lead_qualification',
    'email_drafting',
    'revenue_forecasting',
    'customer_360',
  ],

  knowledge: {
    sources: ['sales_playbook', 'product_catalog', 'lead_qualification'],
    indexes: ['sales_knowledge'],
  },
});

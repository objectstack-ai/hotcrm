// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineSkill } from '@objectstack/spec';

/**
 * Case Triage — prioritise a support case and take the real action.
 *
 * ADR-0109: this skill declares NO tool records. Triage itself is
 * reasoning, not a tool — the agent reads the case with the platform's
 * data tools and applies the rubric below. The two steps that actually
 * *change* something are HotCRM's own declarative Actions, reached
 * through the tools the runtime materialises from them
 * (`action_escalate_case` / `action_close_case`), so they run under the
 * same permissions and audit trail as the buttons in the UI.
 */
export const CaseTriageSkill = defineSkill({
  name: 'case_triage',
  label: 'Case Triage',
  description: 'Triages a support case, assigns priority, and takes the escalate/close action.',

  instructions: `When the user asks to triage, prioritise, or classify a case:

1. Read the case first — call \`describe_object\` for \`crm_case\` (the
   schema is alive; admins add fields), then \`get_record\` for the case
   at hand. Never triage from memory of a previous turn.
2. Assign a priority yourself from what you read. There is no triage
   tool and you do not need one — weigh, in order: customer tier and
   contract value, whether the customer is blocked with no workaround,
   how long the case has been open against its SLA, and the sentiment
   of the latest customer message.
3. State the priority and the ONE reason that drove it. Cite the case
   ID and the field values you used.
4. If the priority is critical, recommend escalation and call
   \`action_escalate_case\` once the user confirms — it takes a
   \`reason\`, so pass the justification from step 3.
5. If the case is already resolved in substance, call
   \`action_close_case\` with a \`resolution\` summary instead.
6. For the customer-facing reply, hand off to the \`email_drafting\`
   skill rather than drafting it here.`,

  tools: ['describe_object', 'get_record', 'action_escalate_case', 'action_close_case'],

  triggerPhrases: [
    'triage this case',
    'prioritise case',
    'how urgent is this',
    'case severity',
  ],

  triggerConditions: [
    { field: 'objectName', operator: 'eq', value: 'crm_case' },
  ],
});

// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineSkill } from '@objectstack/spec';

/**
 * Case Triage — prioritise a support case and route it to the right action.
 *
 * ADR-0109: this skill declares NO tool records. Triage itself is
 * reasoning, not a tool — the agent reads the case with the platform's
 * data tools and applies the rubric below.
 *
 * It deliberately calls NOTHING that mutates. Escalate and Close are
 * `type: 'modal'` Actions: they collect a reason / resolution from a
 * person, so they have no headless path and the runtime never
 * materialises tools for them (ADR-0011). That is the right shape here —
 * the agent supplies the judgement, the human supplies the words and the
 * decision — so the skill recommends the button instead of pretending to
 * press it.
 */
export const CaseTriageSkill = defineSkill({
  name: 'case_triage',
  label: 'Case Triage',
  description: 'Triages a support case, assigns a priority with its justification, and points at the escalate/close action.',

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
4. If the priority is critical, say so and point the user at
   **Escalate Case** on the record header — offer a ready-to-paste
   \`reason\` built from step 3. You cannot escalate yourself, and should
   not imply otherwise.
5. If the case is resolved in substance, point at **Close Case** and
   offer a \`resolution\` summary the user can paste.
6. For the customer-facing reply, hand off to the \`email_drafting\`
   skill rather than drafting it here.`,

  tools: ['describe_object', 'get_record'],

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

// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineSkill } from '@objectstack/spec';

/**
 * Lead Qualification — score an inbound lead with BANT, then act on it.
 *
 * ADR-0109: scoring is judgement, not a tool call. The lead is read
 * with the platform's data tools; the two outcomes that change state
 * (`convert_lead`, `schedule_followup`) are HotCRM's own Actions,
 * reached through their materialised `action_<name>` tools.
 *
 * Auto-activates when the user is viewing a lead record so the LLM
 * surfaces the capability without the user having to ask for it.
 */
export const LeadQualificationSkill = defineSkill({
  name: 'lead_qualification',
  label: 'Lead Qualification',
  description: 'Qualifies inbound leads using BANT criteria and assigns a 0–100 score.',

  instructions: `When the user asks to qualify, score, or analyse a lead:

1. Read the lead — \`describe_object\` for \`crm_lead\` first (fields
   change), then \`get_record\`. Use \`query_records\` to pull the
   related activity history when the lead has any.
2. Score it yourself, 0–100, with BANT. There is no scoring tool:
   Budget (is spend confirmed or inferable from company size?),
   Authority (is the contact a decision maker?), Need (is there a
   stated problem you solve?), Timeline (is there a date?). Weight
   them evenly unless the user says otherwise.
3. Report the score, one line of justification per BANT dimension
   naming the field or activity you read, and the single recommended
   next step. Cite the lead ID.
4. Score >= 70 and the user agrees → call \`action_convert_lead\`.
5. Otherwise, or when the user wants to nurture, call
   \`action_schedule_followup\` with the date you recommend. Say why
   that date.
6. Never convert without explicit confirmation — conversion is not
   reversible from this surface.`,

  tools: [
    'describe_object',
    'get_record',
    'query_records',
    'action_convert_lead',
    'action_schedule_followup',
  ],

  triggerPhrases: [
    'qualify this lead',
    'score this lead',
    'is this a hot lead',
    'BANT analysis',
    'lead score',
  ],

  triggerConditions: [
    { field: 'objectName', operator: 'eq', value: 'crm_lead' },
  ],
});

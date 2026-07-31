// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineSkill } from '@objectstack/spec';

/**
 * Customer 360 — one profile assembled from the records that already exist.
 *
 * ADR-0109: this skill declares no bespoke tools. It used to list a
 * `search_knowledge` tool that nothing defines — the last survivor of the
 * ten fictional tools #512 removed — and the runtime silently drops an
 * unresolved tool, so the skill shipped with a single declared capability
 * that never resolved, while its instructions promised an aggregation it
 * had no tool to read.
 *
 * Authoring the missing tool would not have helped: `ToolSchema` is a
 * READ-ONLY PROJECTION for Studio discovery — it carries no
 * `implementation` and no framework executor loads it, so a hand-authored
 * `search_knowledge` would validate, build, and still never run. The
 * knowledge base here is not a search service anyway; it is
 * `crm_knowledge_article`, a normal CRM object, so `query_records` reaches
 * it exactly like every other object this skill reads.
 */
export const Customer360Skill = defineSkill({
  name: 'customer_360',
  label: 'Customer 360',
  description: 'Aggregates account, recent cases, open opportunities, and knowledge hits into a single customer profile.',

  instructions: `When the user asks for "the full picture" of a
customer / account / contact:

1. Read the shape first — \`describe_object\` for \`crm_account\`, and for
   each related object before you query it. Admins add fields; never
   summarise from memory of a previous turn.
2. \`get_record\` the account, then pull the related work with
   \`query_records\`, each filtered to this account:
   - \`crm_contact\` — who the people are, primary contact first.
   - \`crm_case\` — cases where \`is_closed\` is false, newest first.
   - \`crm_opportunity\` — open deals with stage, amount and close date.
   Quote totals from \`aggregate_data\` (open pipeline amount, case count
   by status) rather than adding up rows yourself.
3. For the policy or playbook context, \`query_records\` on
   \`crm_knowledge_article\` — \`status\` published, matched on the
   \`category\` or \`tags\` of the cases you just read. There is no
   knowledge-search tool and you do not need one: the knowledge base is
   an object like any other.
4. Summarise into three sections: **Account Snapshot** · **Active Work** ·
   **Risks & Notes**. Every risk names the record and the signal that
   raised it — an escalated case, a close date already past, a deal with
   no activity in 30+ days. Do not infer risk you cannot cite.
5. Cite record IDs inline (e.g. "case CASE-01234", "article KA-0007") so
   the UI can deep link. If a section has no records, say so plainly
   instead of filling it.`,

  tools: ['describe_object', 'get_record', 'query_records', 'aggregate_data'],

  triggerPhrases: [
    'customer 360',
    'tell me about this account',
    'give me the full picture',
    'account summary',
  ],
});

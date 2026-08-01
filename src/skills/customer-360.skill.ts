// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineSkill } from '@objectstack/spec';

/**
 * Customer 360 — one profile assembled from the records that already exist.
 *
 * ADR-0109: this skill declares no bespoke tools. Its whole tool list used
 * to be `search_knowledge`, while the instructions promised an account +
 * cases + opportunities + knowledge roll-up it had no tool to read — it
 * could not fetch a single record.
 *
 * `search_knowledge` is NOT fictional; #557 dropped it on that premise and
 * the premise was wrong. It is a real platform tool, listed in
 * `PLATFORM_PROVIDED_TOOL_NAMES` (`@objectstack/spec@17`) and documented
 * back in 16.1.0 at `spec/src/ai/knowledge-source.zod.ts:114`.
 *
 * It is left out for a narrower reason: it has nothing here to search.
 * `search_knowledge` retrieves over a declared knowledge source, and
 * `AIKnowledgeSchema` mounts only on `AgentSchema.knowledge` — the
 * `indexes: [...]` block that #512 deleted along with the agents. A
 * skills-only app has nowhere to declare a source, so the tool would
 * resolve and return nothing. That is the same lie one layer down.
 *
 * The knowledge base is `crm_knowledge_article`, a normal CRM object, so
 * `query_records` reaches it exactly like every other object this skill
 * reads. Revisit if a stack-level knowledge source ever becomes
 * declarable.
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
   \`category\` or \`tags\` of the cases you just read. You have no
   knowledge-search tool in this skill and do not need one: the knowledge
   base is an object like any other.
4. Summarise into three sections: **Account Snapshot** · **Active Work** ·
   **Risks & Notes**. Every risk names the record and the signal that
   raised it — an escalated case, a close date already past, a deal with
   no activity in 30+ days. Do not infer risk you cannot cite.
5. Cite record IDs inline (e.g. "case CASE-01234", "article KA-0007") so
   the UI can deep link. If a section has no records, say so plainly
   instead of filling it.`,

  tools: ['describe_object', 'get_record', 'query_records', 'aggregate_data'],

});

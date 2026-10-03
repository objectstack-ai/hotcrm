// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineSkill } from '@objectstack/spec';

/**
 * Live Data — the foundation of HotCRM's "Wow #1" demo.
 *
 * Wires the platform's built-in metadata + data tools into the
 * assistant so it always sees the current schema before querying.
 * This is what makes "add a field, AI uses it 30s later" actually
 * work — `describe_object` re-reads metadata on every call.
 */
export const LiveDataSkill = defineSkill({
  name: 'live_data',
  label: 'Live Data Access',
  description:
    'Queries any CRM object using the current live schema. Always inspects the object structure first so newly added fields are picked up immediately.',

  instructions: `When the user asks a question that touches a CRM
record (account, contact, lead, opportunity, case, quote, etc.):

1. **Always** call \`describe_object\` for the relevant object FIRST,
   even if you think you remember the fields. The schema can change
   between turns — trust the tool, not your memory.
2. Use \`list_objects\` if you are not sure which object holds the
   data the user is asking about.
3. Use \`query_records\` (filters, sort, limit) for lists,
   \`get_record\` for a single ID, \`aggregate_data\` for sums /
   counts / averages.
4. When you reference data, cite the record ID inline so the UI
   can deep-link (e.g. "opportunity OPP-1234").
5. If \`describe_object\` shows a field you've never seen before,
   USE IT — that's the user's whole point in adding it. Surface it
   in your answer when relevant.`,

  tools: [
    'describe_object',
    'list_objects',
    'query_records',
    'get_record',
    'aggregate_data',
  ],

});

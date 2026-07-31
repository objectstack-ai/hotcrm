// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Demo-org bootstrap — bind the seeded demo data to the first real user.
 *
 * A seed cannot name a user. Lookup values resolve against the target's
 * externalId and that only works for objects in the app's own graph, so
 * `owner: 'Dev Admin'` stores the literal string rather than an id, and
 * `cel\`os.user.id\`` inside a seed evaluates to nothing (both verified
 * against 16.1.0). A hook on `sys_user` is rejected at build time —
 * cross-reference validation refuses hooks on objects the app doesn't
 * declare. The user id only exists after first boot, so this has to be a
 * scheduled sweep.
 *
 * Without it a freshly seeded org comes up with every record ownerless, and
 * that quietly disables a tier of the product: "My Leads" / "My Deals" /
 * "My Cases" are empty for everyone, and any `notify` addressed to a record's
 * owner reaches nobody.
 *
 * Idempotent: once a record has an owner the query no longer returns it and
 * each pass is a no-op. `runAs: 'system'` because a scheduled run has no
 * trigger user and these writes must bypass RLS (ADR-0049).
 *
 * Per-record updates inside a loop, not one filtered mass update: the
 * `update_record` node calls `data.update(...)` without `options.multi`, so a
 * filter matching more than one row fails with "Update requires an ID or
 * options.multi=true". Same shape as `case_sla_monitor`.
 *
 * Scoped to a demo install by intent — it claims records for whoever the first
 * user is. A real deployment assigns ownership through import or territory
 * rules instead, and by then nothing is ownerless for this to pick up.
 */

/** One find + loop + stamp-owner pass over an object. */
const claim = (key: string, objectName: string, label: string) => ({
  find: {
    id: `find_${key}`,
    type: 'get_record' as const,
    label: `Find ownerless ${label}`,
    config: {
      objectName,
      filter: { owner: null },
      limit: 500,
      outputVariable: `${key}List`,
    },
  },
  loop: {
    id: `loop_${key}`,
    type: 'loop' as const,
    label: `Claim each ${label}`,
    config: {
      collection: `{${key}List}`,
      iteratorVariable: `current_${key}`,
      body: {
        nodes: [
          {
            id: `stamp_${key}`,
            type: 'update_record' as const,
            label: `Set owner on ${label}`,
            config: {
              objectName,
              filter: { id: `{current_${key}.id}` },
              fields: { owner: '{firstUser.id}' },
            },
          },
        ],
        edges: [],
      },
    },
  },
});

const TARGETS = [
  claim('leads', 'crm_lead', 'Leads'),
  claim('accounts', 'crm_account', 'Accounts'),
  claim('contacts', 'crm_contact', 'Contacts'),
  claim('opportunities', 'crm_opportunity', 'Opportunities'),
  claim('cases', 'crm_case', 'Cases'),
  claim('tasks', 'crm_task', 'Tasks'),
  // Quotes and contracts are seeded ownerless too — without claiming them the
  // contract_renewal / contract_expiration / quote_expiration notifies address
  // a null owner and reach nobody (the exact failure this flow exists to fix).
  claim('quotes', 'crm_quote', 'Quotes'),
  claim('contracts', 'crm_contract', 'Contracts'),
];

/**
 * The whole flow is one straight line: check for a user, then find/loop each
 * object in turn. Edges are just consecutive pairs of this list.
 */
const CHAIN = [
  'start',
  'get_user',
  'has_user',
  ...TARGETS.flatMap((t) => [t.find.id, t.loop.id]),
  'end',
];

export const DemoBootstrapFlow: Flow = {
  name: 'demo_bootstrap',
  label: 'Demo Bootstrap',
  description: 'Claim ownerless seeded demo records for the first user so the "My …" views work.',
  type: 'schedule',
  status: 'active',
  runAs: 'system',

  variables: [],

  nodes: [
    {
      id: 'start', type: 'start', label: 'Start (every 10 minutes)',
      config: { schedule: '*/10 * * * *' },
    },
    {
      id: 'get_user', type: 'get_record', label: 'First User',
      config: { objectName: 'sys_user', filter: {}, outputVariable: 'firstUser' },
    },
    {
      id: 'has_user', type: 'decision', label: 'Any user yet?',
      config: { condition: P`vars.firstUser != null` },
    },
    ...TARGETS.flatMap((t) => [t.find, t.loop]),
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    // The straight line, one edge per consecutive pair.
    ...CHAIN.slice(0, -1).map((source, i) => ({
      id: `e${i}`,
      source,
      target: CHAIN[i + 1],
      type: 'default' as const,
      // The only branch: leaving `has_user` towards the first claim step.
      ...(source === 'has_user' ? { condition: P`vars.firstUser != null`, label: 'Yes' } : {}),
    })),
    // Nothing to claim before anyone exists — skip the whole chain.
    {
      id: 'e_nouser', source: 'has_user', target: 'end', type: 'default',
      condition: P`vars.firstUser == null`, label: 'No user yet',
    },
  ],
};

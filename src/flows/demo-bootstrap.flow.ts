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
 *
 * ─── This flow must NOT staff anybody (#640) ─────────────────────────────
 *
 * The demo org now also has PEOPLE — an NA rep, an EU rep and a sales manager
 * holding the positions the sharing rules and `opportunity_approval` route to
 * (`src/sharing/demo-staffing.ts`). That staffing deliberately does not happen
 * here, and the obvious "just add a create_record on sys_user" is refused twice
 * over:
 *
 *   - This flow ships in the ARTIFACT, so it runs in a customer's org too. The
 *     one outcome #640 rules out unconditionally is synthetic users appearing
 *     there, and the only way to make that impossible rather than unlikely is
 *     for the artifact to contain no mechanism that can create one.
 *     `test/demo-staffing.test.ts` fails on any flow node that writes an
 *     identity table.
 *   - It would not produce usable people anyway: identity tables are
 *     `managedBy: 'better-auth'` (ADR-0092), and a row inserted around that
 *     surface has no credential — an account nobody can sign in as.
 *
 * Staffing therefore lives in `pnpm demo:staff`, which drives a LOCAL dev
 * server through the platform's own admin endpoints. It also depends on this
 * flow's behaviour staying exactly as it is: the demo's whole point is that a
 * rep reads accounts they do NOT own (a `private` OWD already admits the owner,
 * so a share to the owner proves nothing). The reps are created after the dev
 * admin and appended to `sys_user`, so `get_user`'s unordered "first user" is
 * unchanged by staffing — and the staffing script re-checks that from the other
 * side, failing if any demo user turns out to own a seeded account. Ownership
 * itself is #548's subject; do not redefine it here.
 *
 * ─── TWO ownership columns, not one (#622) ───────────────────────────────
 *
 * Every claimed object carries two:
 *
 *   - `owner`    — the app's own `lookup(sys_user)` field. Drives the "My …"
 *                  views, the owner-addressed `notify` in every sweep, and the
 *                  owner axis of the analytics datasets.
 *   - `owner_id` — the PLATFORM ownership column ObjectQL injects into every
 *                  user-owned object. This is the one — and the only one — the
 *                  sharing service reads: under `sharingModel: 'private'` the
 *                  OWD baseline admits the owner of `owner_id` and a share can
 *                  only WIDEN from there.
 *
 * They are independent columns, so claiming one does not claim the other, and
 * an app field that happens to be named `owner` is not the platform's owner.
 * This flow used to stamp `owner` alone. A row that reached the platform
 * ownerless therefore came out of the sweep looking claimed (`owner` = the dev
 * admin) while still being owned by nobody as far as access control is
 * concerned — `PATCH` answered 403 for EVERY user including the admin, and the
 * attachment surface, which gates on `canEdit(parent)`, answered 403
 * `ATTACHMENT_PARENT_ACCESS` on upload. Worse, the sweep's own filter then read
 * `owner != null` and never looked at the row again: the state was terminal.
 *
 * Why rows reach the platform ownerless at all: seed writes run under
 * `{ isSystem: true }`, which by the seeder's documented contract DISABLES the
 * security plugin's auto-injection of `organization_id` / `owner_id` — "seeds
 * either declare those fields explicitly per record". HotCRM's seeds cannot
 * declare it: `cel\`os.user.id\`` does not resolve at seed time (boot logs
 * "Unknown variable: os" for exactly these fields), which is why this flow
 * exists in the first place. So ownership at the platform level is THIS flow's
 * job, and nothing else's.
 *
 * Hence: every pass stamps BOTH columns, and each object is swept twice — once
 * for rows missing `owner`, once for rows missing `owner_id`. Two single-field
 * filters rather than one `$or`: `{ field: null }` is the only filter shape
 * these sweeps have ever used against the real driver, and a half-claimed row
 * (the state above) must still be reachable, which a single `owner`-keyed pass
 * cannot do. On a healthy org both passes select nothing.
 */

/** The two ownership columns a claim pass stamps together. See the note above. */
const OWNERSHIP_COLUMNS = ['owner', 'owner_id'] as const;
type OwnershipColumn = (typeof OWNERSHIP_COLUMNS)[number];

/** Both columns, pointed at the first user — the payload of every claim. */
const CLAIM_FIELDS: Record<OwnershipColumn, string> = {
  owner: '{firstUser.id}',
  owner_id: '{firstUser.id}',
};

/**
 * One find + loop + stamp-owner pass over an object, selecting the rows that
 * are ownerless in `column` and stamping BOTH ownership columns on each.
 */
const claim = (key: string, objectName: string, label: string, column: OwnershipColumn) => ({
  find: {
    id: `find_${key}`,
    type: 'get_record' as const,
    label: `Find ${label} with no ${column}`,
    config: {
      objectName,
      filter: { [column]: null },
      limit: 500,
      outputVariable: `${key}List`,
    },
  },
  loop: {
    id: `loop_${key}`,
    type: 'loop' as const,
    label: `Claim each ${label} with no ${column}`,
    config: {
      collection: `{${key}List}`,
      iteratorVariable: `current_${key}`,
      body: {
        nodes: [
          {
            id: `stamp_${key}`,
            type: 'update_record' as const,
            label: `Set owner + owner_id on ${label}`,
            config: {
              objectName,
              filter: { id: `{current_${key}.id}` },
              fields: { ...CLAIM_FIELDS },
            },
          },
        ],
        edges: [],
      },
    },
  },
});

/**
 * The objects whose seeded rows this flow claims.
 *
 * Quotes and contracts are in the list because they are seeded ownerless too —
 * without claiming them the contract_renewal / contract_expiration /
 * quote_expiration notifies address a null owner and reach nobody (the exact
 * failure this flow exists to fix), and `crm_contract` additionally becomes
 * uneditable for everyone (#622).
 */
const CLAIMED_OBJECTS: ReadonlyArray<[key: string, objectName: string, label: string]> = [
  ['leads', 'crm_lead', 'Leads'],
  ['accounts', 'crm_account', 'Accounts'],
  ['contacts', 'crm_contact', 'Contacts'],
  ['opportunities', 'crm_opportunity', 'Opportunities'],
  ['cases', 'crm_case', 'Cases'],
  ['tasks', 'crm_task', 'Tasks'],
  ['quotes', 'crm_quote', 'Quotes'],
  ['contracts', 'crm_contract', 'Contracts'],
];

/**
 * One pass per (object, ownership column). Ordered column-major so the whole
 * `owner` sweep runs before the whole `owner_id` sweep — the `owner` pass
 * stamps both columns, so by the time the `owner_id` sweep is reached it only
 * has genuinely half-claimed rows left to repair.
 */
const TARGETS = OWNERSHIP_COLUMNS.flatMap((column) =>
  CLAIMED_OBJECTS.map(([key, objectName, label]) => claim(`${key}_by_${column}`, objectName, label, column)),
);

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
  description:
    'Claim ownerless seeded demo records for the first user — both the app `owner` lookup (the "My …" views) and the platform `owner_id` column (sharing / who may edit).',
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

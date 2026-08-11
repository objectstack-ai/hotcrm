// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Demo-org bootstrap — bind the seeded demo data to the first real user.
 *
 * A seed cannot name a user. Lookup values resolve against the target's
 * externalId and that only works for objects in the app's own graph, so
 * `owner_id: 'Dev Admin'` would store the literal string rather than an id
 * (verified against 16.1.0). A hook on `sys_user` is rejected at build time —
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
 * side, failing if any demo user turns out to own a seeded account — a check
 * that now reads `owner_id`, the one column ownership lives in (#548).
 *
 * ─── ONE ownership column (#548, and the #622 lesson it settles) ─────────
 *
 * `owner_id` is the ONLY owner this app has. It is the column ObjectQL injects
 * into every user-owned object, and the only one the sharing service reads:
 * under `sharingModel: 'private'` the OWD baseline admits the owner of
 * `owner_id` and a share can only WIDEN from there. It also drives the "My …"
 * views, the owner-addressed `notify` in every sweep, and the owner axis of the
 * analytics datasets — because #548 pointed all of those at it.
 *
 * Until #548 the app ALSO authored its own `owner` lookup, and this flow had to
 * stamp both. That is what #622 was: a row claimed on `owner` alone came out of
 * the sweep looking claimed everywhere a human would check, while still being
 * owned by nobody as far as access control was concerned — `PATCH` answered 403
 * for EVERY user including the admin, and the attachment surface, which gates on
 * `canEdit(parent)`, answered 403 `ATTACHMENT_PARENT_ACCESS` on upload. Worse,
 * the sweep's own filter then read `owner != null` and never looked at the row
 * again: the state was terminal. With one column that whole failure mode is
 * structurally gone, not merely guarded against — there is no second column left
 * to disagree with the first.
 *
 * Why rows reach the platform ownerless at all — unchanged by #548, and the
 * reason this flow still exists: seed writes run under `{ isSystem: true }`,
 * which short-circuits the security middleware entirely, so the insert-time
 * auto-stamp of `owner_id` never fires ("seeds either declare those fields
 * explicitly per record"). HotCRM's seeds cannot declare it — no seed can name a
 * user. So ownership at the platform level is THIS flow's job, and nothing
 * else's.
 *
 * One pass per object, selecting `{ owner_id: null }`. On a healthy org it
 * selects nothing.
 */

/** The app's one ownership column — the platform anchor. See the note above. */
const OWNERSHIP_COLUMN = 'owner_id';

/**
 * One find + loop + stamp-owner pass over an object, selecting the rows that
 * are ownerless and stamping the first user onto each.
 */
const claim = (key: string, objectName: string, label: string) => ({
  find: {
    id: `find_${key}`,
    type: 'get_record' as const,
    label: `Find ownerless ${label}`,
    config: {
      objectName,
      filter: { [OWNERSHIP_COLUMN]: null },
      limit: 500,
      outputVariable: `${key}List`,
    },
  },
  loop: {
    id: `loop_${key}`,
    type: 'loop' as const,
    label: `Claim each ownerless ${label}`,
    config: {
      collection: `{${key}List}`,
      iteratorVariable: `current_${key}`,
      body: {
        nodes: [
          {
            id: `stamp_${key}`,
            type: 'update_record' as const,
            label: `Set ${OWNERSHIP_COLUMN} on ${label}`,
            config: {
              objectName,
              filter: { id: `{current_${key}.id}` },
              // A foreign owner on an update is an ownership TRANSFER, denied
              // without `allowTransfer` — but this flow is `runAs: 'system'`,
              // which short-circuits the security middleware before that guard
              // (#548). The claim is deliberately outside the user gate: there
              // is no user to hold the grant when it runs.
              fields: { [OWNERSHIP_COLUMN]: '{firstUser.id}' },
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
 * failure this flow exists to fix), and they additionally stay uneditable for
 * everyone under a `private` OWD (#622).
 *
 * `crm_forecast` is here for the same reason plus one sharper one (#702). A
 * forecast row IS a per-owner object — `sharingModel: 'private'`, and
 * `sales_rep` reads it with `readScope: 'own'` — so an ownerless snapshot is
 * not merely blank on the owner axis of `forecast_metrics` and absent from "My
 * Forecast": it is invisible to every rep and editable by nobody, admin
 * included. It was the one owner-scoped seeded object this list omitted.
 *
 * Claiming it is only CORRECT because the seeds no longer ship a row in the
 * window `forecast_snapshot` owns (`src/data/revenue.seed.ts`). While they did,
 * stamping an owner here would have moved the phantom onto the first user
 * rather than removing it — and left a permanent duplicate on any boot where
 * the 03:00 sweep reached the window before this ten-minute sweep did. Order
 * independence comes from the seeds staying out of that window, not from this
 * claim; the claim only settles who owns the SETTLED periods.
 *
 * `crm_campaign` and `crm_knowledge_article` came next (#716). Cross the
 * registered objects three ways — seeded × declares `owner_id` × claimed here —
 * and after those two the "seeded and owner-scoped but unclaimed" cell was
 * EMPTY. `test/flow-scheduled.test.ts` computes that cross-table rather than
 * reading a hand-written roster, so the next seeded owner-scoped object cannot
 * be forgotten the way these two were — and `crm_event` at the foot of this
 * list is that mechanism paying out for the first time (see below).
 *
 * What hid them is their OWD. The nine above are `private` (or
 * `controlled_by_parent`), where an ownerless row is INVISIBLE and the defect
 * announces itself on the first list view. These two are `public_read`, so
 * their seeded rows read fine for everybody and look perfectly healthy. But
 * `public_read` opens the read baseline only — the platform's write filter
 * applies to it exactly as it does to `private`: "public_read is read-open but
 * write-owned; only a fully public object is write-open"
 * (`@objectstack/plugin-sharing` 17.0.0-rc.2, `buildWriteFilter`). A write
 * still needs owner-match, or a share at a write level.
 *
 * Which turns two GRANTED permissions into permanent 403s. `marketing_user`
 * holds `crm_campaign` at `allowEdit: true, modifyAllRecords: false`, and
 * `service_agent` holds `crm_knowledge_article` the same way. With
 * `modifyAllRecords: false` and no `writeScope`, the effective write depth is
 * `own`, whose filter is `owner_id == caller` — a predicate no null-owner row
 * can ever satisfy. So the permission table says "can edit" while every seeded
 * row answers 403 for everyone but `system_admin`. That is #622's failure shape
 * on two more objects, and it is why this is worth fixing past the cosmetic
 * complaint of a blank owner column (empty "My …" lists, an empty owner axis in
 * the campaign analytics, owner-addressed `notify` reaching nobody).
 *
 * The `campaign_leadership_*` criteria shares (`src/sharing/campaign.sharing.ts`)
 * are not a substitute: they widen edit to two marketing POSITIONS and only
 * while a campaign is `planning`/`in_progress`, so they cover neither the
 * finished seeded campaigns nor any knowledge article, and nobody holding the
 * plain `marketing_user` grant is reached by them at all.
 *
 * Both objects are owner-scoped by history rather than shared catalogue:
 * `scripts/backfill-owner-id.ts` lists both in its `OBJECTS`, i.e. both carried
 * the app-level `owner` lookup #548 retired. `crm_product` — the other seeded
 * `public_read` object — declares no `owner_id` at all and stays OUT: it is a
 * shared catalogue, so there is no ownership to claim and stamping one would
 * write a column the object does not have. Until #669 it was also the e2e
 * suite's ownership-blind probe, which gave it a second reason to stay out;
 * that suite no longer reads seeded rows at all, so the first reason is the
 * only one left — and it is the one that was always doing the work.
 *
 * Who owns a seeded knowledge article, recorded rather than decided (#716, PM
 * ruling): the first user, by the same demo convention every other object here
 * follows. Whether a real deployment's article owner means its AUTHOR or its
 * MAINTAINER is a product question, and this claim deliberately does not
 * prejudge it — a real deployment assigns ownership through import or territory
 * rules before this sweep has anything to pick up (see the header). The demo's
 * job is only that no seeded row is left owned by nobody.
 *
 * `crm_event` joins the list the day the activity model gets demo rows (#671),
 * and it is the computed cross-table above doing its job rather than an
 * obstacle: `crm_event` declares `owner_id`, so the moment `src/data/` shipped
 * events the "seeded AND owner-scoped AND unclaimed" cell stopped being empty
 * and `test/flow-scheduled.test.ts` went red. Its OWD is `private` and
 * `sales_rep` reads it `own`-only, which is #702's shape exactly: an ownerless
 * interaction is invisible to every rep, absent from the owner axis of
 * `event_metrics` (the Sales Activity dashboard's "Activity by Rep" bar) and
 * editable by nobody, `system_admin` aside.
 *
 * `crm_event_attendee` is seeded alongside it and deliberately stays OUT. It
 * declares no `owner_id` at all — `sharingModel: 'controlled_by_parent'`, its
 * access derived from the event it hangs off — so there is no ownership to
 * claim, and stamping one would write a column the object does not have. That
 * is the cross-table's OTHER direction, which the same test asserts.
 *
 * No collision with the runtime writer, the question #702 taught us to ask
 * before claiming anything: `log_call` / `log_meeting` / `schedule_meeting`
 * insert their `crm_event` row with an explicit `owner_id` (an action body runs
 * `isSystem`, so it stamps ownership itself — see `src/actions/global.actions.ts`),
 * which means a rep's own interactions are never ownerless and this sweep never
 * selects them. Unlike `crm_forecast` there is no shared window to keep clear:
 * seeds and the actions write disjoint rows, not two producers of one row.
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
  ['forecasts', 'crm_forecast', 'Forecasts'],
  ['campaigns', 'crm_campaign', 'Campaigns'],
  ['knowledge', 'crm_knowledge_article', 'Knowledge Articles'],
  ['events', 'crm_event', 'Events'],
];

/** One pass per object. */
const TARGETS = CLAIMED_OBJECTS.map(([key, objectName, label]) => claim(key, objectName, label));

/**
 * The whole flow is one straight line: check for a user, then find/loop each
 * object in turn. Edges are just consecutive pairs of this list.
 */
const CHAIN = [
  'start',
  'get_user',
  'bind_first_user',
  'has_user',
  ...TARGETS.flatMap((t) => [t.find.id, t.loop.id]),
  'end',
];

export const DemoBootstrapFlow: Flow = {
  name: 'demo_bootstrap',
  label: 'Demo Bootstrap',
  description:
    'Claim ownerless seeded demo records for the first user by stamping the platform `owner_id` column — the one that decides the "My …" views, owner-addressed notifications and who may edit.',
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
      // A LIST read, deliberately (#4419). 17.0.0-rc.2 refuses a `findOne` that
      // names no record: `filter: {}` with no ordering made the platform pick an
      // arbitrary row and hand it back as if it were "the" user, so the read is
      // now rejected outright — `get_record(sys_user) failed: findOne('sys_user')
      // selects no particular record`. That aborts the sweep on its second node
      // and leaves every seeded row ownerless, which is the whole failure this
      // flow exists to prevent.
      //
      // "Any row will genuinely do" is the honest description here — see the
      // header: the reps are appended after the dev admin, and `demo:staff`
      // asserts from the other side that no demo rep owns a seeded record. The
      // prescription for that case is `find`, and the only way to reach `find`
      // from this node is `limit > 1` (the executor routes `limit <= 1` to
      // `findOne`, and offers no `orderBy` at all) — hence 2, not 1. The pick is
      // the same first row as before; what changed is that it is now STATED as
      // "some row out of this set" instead of smuggled through a call that
      // claimed to name one.
      id: 'get_user', type: 'get_record', label: 'First Users',
      config: { objectName: 'sys_user', limit: 2, outputVariable: 'userList' },
    },
    {
      // `{userList.0}` is absent on an empty org, so every downstream read of
      // `vars.firstUser` is guarded with `has()` — an unguarded read aborts the
      // predicate, and 17.0.0-rc.2 turns an unevaluable condition into a failed
      // step rather than a skipped one.
      id: 'bind_first_user', type: 'assignment', label: 'Bind First User',
      config: { assignments: { firstUser: '{userList.0}' } },
    },
    {
      // Branching is on the two out-edges below; a `decision` node's singular
      // `config.condition` is never evaluated, so a copy here would be inert
      // (17.0.0-rc.2's `flow-inert-node-condition`, #4414).
      id: 'has_user', type: 'decision', label: 'Any user yet?',
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
      ...(source === 'has_user'
        ? { condition: P`has(vars.firstUser) && vars.firstUser != null`, label: 'Yes' }
        : {}),
    })),
    // Nothing to claim before anyone exists — skip the whole chain.
    {
      id: 'e_nouser', source: 'has_user', target: 'end', type: 'default',
      condition: P`!has(vars.firstUser) || vars.firstUser == null`, label: 'No user yet',
    },
  ],
};

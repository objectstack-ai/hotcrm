// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import stack from '../objectstack.config';
import caseHooks from '../src/objects/case.hook';
import {
  SERVICE_AGENT_POSITION,
  CLOSED_CASE_STATUSES,
  POOL_QUERY_LIMIT,
} from '../src/objects/_case-assignment';
import { makeHarness, makeDeniedApi, makeCtx, hookNamed, type Rec } from './helpers/hook-harness';
import { localePacks } from './helpers/metadata-fixtures';

/**
 * ═══ Case intake assignment — the app-level queue substitute (#596) ════════
 *
 * ObjectStack has no queue engine (`sys_queue` does not exist; the `queue`
 * sharing-recipient and approver enum members are deprecated upstream), so a
 * web-to-case submission — whose `owner_id` the guest-sanitisation branch of
 * `case_sla_defaults` deliberately strips — used to land ownerless with nobody
 * accountable for it and no view that could even show it.
 *
 * `src/objects/_case-assignment.ts` substitutes a load-balanced round-robin,
 * and `unassigned_triage` on `crm_case` is the second half: the empty pool is
 * the FIRST-INSTALL NORM, not an edge case, and the whole point of the card is
 * that the no-op path is VISIBLE rather than silent. Both paths are covered
 * here, and neither one is the happy path alone.
 *
 * The file opens with the precondition the ruling made blocking: whether a
 * hook-stamped `owner_id` passes the platform's `allowTransfer` write gate.
 * That question decides whether this feature is a hook change or a
 * permission-model widening, so it is MEASURED against a real engine rather
 * than inherited from the `lead_auto_assign` precedent — the guard's verdict is
 * a property of the SEAM, and `crm_case` had never been measured on it.
 */

type AnyRec = Record<string, any>;

const assign = hookNamed(caseHooks, 'case_auto_assign');
const slaDefaults = hookNamed(caseHooks, 'case_sla_defaults');

// ─────────────────────────── the blocking precondition, measured ──

describe('the transfer gate cannot see a beforeInsert owner_id stamp on crm_case', () => {
  let ql: AnyRec;
  /** Every operation the middleware seam observed, with the payload as it was THEN. */
  let seen: { object: string; operation: string; data: AnyRec }[];

  beforeAll(async () => {
    seen = [];
    ql = (await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: {
        crm_case: {
          name: 'crm_case',
          fields: {
            id: { type: 'text' },
            subject: { type: 'text' },
            status: { type: 'text' },
            owner_id: { type: 'lookup', reference: 'sys_user' },
          },
        },
      } as never,
    })) as never;

    // The SAME seam `@objectstack/plugin-security` registers the #3004 owner_id
    // write guard on. A RECORDER, not a gate: what is being measured is
    // VISIBILITY, not the verdict — what this can see, the guard can see, and
    // what it cannot see, the guard cannot either. (Standing the real plugin up
    // would test the platform's code rather than ours; same reasoning, and the
    // same technique, as `test/ownership-model.test.ts`.)
    ql.registerMiddleware(async (opCtx: AnyRec, next: () => Promise<void>) => {
      seen.push({
        object: opCtx.object,
        operation: opCtx.operation,
        data: JSON.parse(JSON.stringify(opCtx.data ?? {})) as AnyRec,
      });
      return next();
    });

    ql.registerHook?.('beforeInsert', async (ctx: AnyRec) => {
      if (ctx.object !== 'crm_case') return;
      const data = ctx.input?.data ?? ctx.data;
      if (data && !data.owner_id) data.owner_id = 'agent_round_robin';
    }, { object: 'crm_case' });
  });

  afterAll(async () => {
    await ql?.close();
  });

  it('the stamp never reaches the middleware, and still reaches storage', async () => {
    // Predicted direction, stated before running: the middleware sees NO
    // `owner_id`, and the STORED row carries the hook's agent. Measured
    // 2026-08-11 on @objectstack/* 17.0.0-rc.6 — the middleware observed
    //   {"object":"crm_case","operation":"insert","data":{"subject":"…","status":"new"}}
    // and the stored row came back with `owner_id: "agent_round_robin"`.
    //
    // So round-robin intake assignment needs NO `crm_case.allowTransfer` grant,
    // and this feature is not a permission-model widening. ⛔ If a future
    // platform release moves the guard downstream of the hook phase, the first
    // expectation below flips and this test goes red. That is the signal to
    // grant `allowTransfer` deliberately, or to stop assigning in a hook — NOT
    // to widen the permission model in order to make a red test green.
    const api = ql.createContext({ userId: 'usr_guest_form' });
    const row = await api.object('crm_case').insert({ subject: 'Printer on fire', status: 'new' });

    const observed = seen.filter((s) => s.object === 'crm_case' && s.operation === 'insert').pop();
    expect(observed, 'the middleware seam never fired for the insert').toBeTruthy();
    expect(
      observed!.data.owner_id,
      'the guard COULD see the hook-assigned owner — case round-robin now needs crm_case.allowTransfer, ' +
        'which is a permission-model change and not a hook change',
    ).toBeUndefined();

    const stored = await api.object('crm_case').findOne({ where: { id: row.id } });
    expect(stored?.owner_id, 'the hook’s assignment did not survive to storage')
      .toBe('agent_round_robin');
  });

  it('negative control: the recorder is not simply blind to owner_id', async () => {
    // Guards the guard. The assertion above is an ABSENCE, and an absence
    // proves nothing if the recorder could never have seen the key in the first
    // place. A caller-supplied `owner_id` on the same object, through the same
    // seam, must be visible — that is what makes "the hook's stamp is invisible"
    // a statement about the hook phase rather than about this test.
    const api = ql.createContext({ userId: 'usr_admin' });
    await api.object('crm_case').insert({
      subject: 'Manually owned', status: 'new', owner_id: 'agent_explicit',
    });
    const observed = seen.filter((s) => s.object === 'crm_case' && s.operation === 'insert').pop();
    expect(
      observed!.data.owner_id,
      'the recorder cannot see owner_id AT ALL — the invisibility measurement above is vacuous',
    ).toBe('agent_explicit');
  });
});

// ───────────────────────────────── the round-robin, both paths ──

describe('case_auto_assign', () => {
  /** A pool of `service_agent` holders plus a case backlog, in one store. */
  const storeWith = (agents: string[], cases: Rec[] = []) => ({
    sys_user_position: [
      // Deliberately mixed: other positions must NOT be read as service agents.
      { user_id: 'rep_1', position: 'sales_rep' },
      { user_id: 'mgr_1', position: 'service_manager' },
      ...agents.map((user_id) => ({ user_id, position: SERVICE_AGENT_POSITION })),
    ],
    crm_case: cases,
  });

  it('assigns an ownerless case to the least-loaded agent — the assigned path', async () => {
    const harness = makeHarness(storeWith(['agent_a', 'agent_b'], [
      { id: 'c1', owner_id: 'agent_a', status: 'new' },
      { id: 'c2', owner_id: 'agent_a', status: 'in_progress' },
      { id: 'c3', owner_id: 'agent_b', status: 'new' },
    ]));
    const input: Rec = { subject: 'Web submission', status: 'new', origin: 'web' };

    await assign.handler(makeCtx({ event: 'beforeInsert', input, api: harness.api }));

    expect(input.owner_id, 'did not assign the least-loaded service agent').toBe('agent_b');
    expect('owner' in input, 'wrote a second, unread ownership column (#548)').toBe(false);
  });

  it('reads the SERVICE_AGENT_POSITION pool, and only that pool', async () => {
    // The parity pin the module's header promises. The hook body must spell its
    // position literal inline — L2 bodies run body-only in QuickJS and cannot
    // reach the exported constant — so this drives the real handler and asserts
    // the predicate it actually issued. Without it the constant and the literal
    // could drift apart silently, and the hook would quietly assign from (or to)
    // the wrong pool.
    const seenQueries: Rec[] = [];
    const api: Rec = {
      object: (name: string) => ({
        async find(q: Rec = {}) {
          seenQueries.push({ object: name, ...q });
          return name === 'sys_user_position' ? [{ user_id: 'agent_a' }] : [];
        },
        async count() { return 0; },
      }),
    };
    const input: Rec = { subject: 'Web submission' };
    await assign.handler(makeCtx({ event: 'beforeInsert', input, api: api as never }));

    const poolQuery = seenQueries.find((q) => q.object === 'sys_user_position');
    expect(poolQuery, 'the hook never read the position pool').toBeTruthy();
    expect(
      poolQuery!.where?.position,
      'the position literal in the hook body drifted from SERVICE_AGENT_POSITION',
    ).toBe(SERVICE_AGENT_POSITION);
    expect(poolQuery!.top, 'the pool read bound drifted from POOL_QUERY_LIMIT').toBe(POOL_QUERY_LIMIT);
    expect(input.owner_id).toBe('agent_a');
  });

  it('counts OPEN cases only — a resolved case stops counting against its agent', async () => {
    // `is_closed` would be the wrong predicate: it only flips on `closed`, so a
    // pile of resolved cases keeps an agent looking busy forever. Here agent_a
    // has three cases but all are finished, and agent_b has one live case — so
    // agent_a must win.
    const harness = makeHarness(storeWith(['agent_a', 'agent_b'], [
      { id: 'c1', owner_id: 'agent_a', status: 'resolved' },
      { id: 'c2', owner_id: 'agent_a', status: 'closed' },
      { id: 'c3', owner_id: 'agent_a', status: 'resolved' },
      { id: 'c4', owner_id: 'agent_b', status: 'waiting_customer' },
    ]));
    const input: Rec = { subject: 'Web submission' };

    await assign.handler(makeCtx({ event: 'beforeInsert', input, api: harness.api }));

    expect(input.owner_id, 'resolved/closed cases are still counting as load').toBe('agent_a');
  });

  it('the closed-status vocabulary it counts by is exactly CLOSED_CASE_STATUSES', () => {
    // Both names are real options on the object, so the predicate cannot be
    // filtering on a status that no case can ever hold — the way a load count
    // silently degrades to "count everything".
    const caseObject = ((stack as AnyRec).objects ?? [])
      .find((o: AnyRec) => o.name === 'crm_case');
    const declared = (caseObject?.fields?.status?.options ?? [])
      .map((o: AnyRec) => o.value);
    for (const status of CLOSED_CASE_STATUSES) {
      expect(declared, `"${status}" is not a declared crm_case status`).toContain(status);
    }
  });

  it('stands down when the middleware already stamped an owner', async () => {
    // On any write that carries a user, `owner_id` is already the creator by the
    // time this hook runs — which is what keeps the round-robin scoped to
    // genuinely ownerless intake instead of re-routing every agent-created case.
    const harness = makeHarness(storeWith(['agent_a', 'agent_b']));
    const input: Rec = { subject: 'Agent-created', owner_id: 'usr_creator' };

    await assign.handler(makeCtx({ event: 'beforeInsert', input, api: harness.api }));

    expect(input.owner_id).toBe('usr_creator');
    expect(harness.callsFor('crm_case').length, 'it queried anyway — wasted reads on every case insert')
      .toBe(0);
  });

  // ── the empty-pool path: a first install, not an edge case ──

  it('is a NO-OP when nobody holds the service_agent position — the pool-empty path', async () => {
    // `sys_user_position` membership is runtime data, so a fresh org has an
    // empty pool by construction. The case must still be created, ownerless,
    // and the `unassigned_triage` view is what makes that visible.
    const harness = makeHarness(storeWith([], [{ id: 'c1', owner_id: 'someone', status: 'new' }]));
    const input: Rec = { subject: 'Web submission', status: 'new' };

    await assign.handler(makeCtx({ event: 'beforeInsert', input, api: harness.api }));

    expect('owner_id' in input, 'invented an owner out of an empty pool').toBe(false);
    // And it did not fall back to some other pool's holders (sales_rep /
    // service_manager rows are in the store above).
    expect(harness.callsFor('crm_case').length).toBe(0);
  });

  it('never rejects the insert when the pool read is DENIED', async () => {
    // The anonymous Web-to-Case grant permits create/read-back on `crm_case` and
    // denies `find` on `sys_user_position`. Propagating that denial would 403
    // the whole submission and break the public support form — so the case is
    // captured ownerless and lands in triage instead.
    const input: Rec = { subject: 'Anonymous submission', status: 'new' };
    await expect(
      assign.handler(makeCtx({ event: 'beforeInsert', input, api: makeDeniedApi() })),
    ).resolves.not.toThrow();
    expect('owner_id' in input).toBe(false);
  });

  it('does nothing without an api rather than throwing', async () => {
    const input: Rec = { subject: 'No api' };
    await assign.handler(makeCtx({ event: 'beforeInsert', input }));
    expect('owner_id' in input).toBe(false);
  });
});

// ─────────────────── ordering: the strip must run BEFORE the assign ──

describe('the guest strip and the assignment are ordered, not merely coexisting', () => {
  it('case_auto_assign runs after case_sla_defaults', () => {
    // Hooks run in ASCENDING priority order. `lead_auto_assign` shipped at 150,
    // BELOW the guest-strip hook, and every web-to-lead landed ownerless because
    // the strip deleted the owner the round-robin had just assigned — the exact
    // defect this card is about, on the sibling object. Pinning the relation
    // rather than the numbers: what matters is which side of the strip this
    // runs on.
    expect(assign.priority, 'case_auto_assign must run after the guest strip')
      .toBeGreaterThan(slaDefaults.priority as number);
    expect(assign.events).toEqual(['beforeInsert']);
  });

  it('end to end: a guest submission is stripped, then assigned', async () => {
    // Both handlers in their real order, on one input — the shape a web-to-case
    // submission actually takes, including the spoofed owner a public form can
    // always post.
    const harness = makeHarness({
      sys_user_position: [{ user_id: 'agent_a', position: SERVICE_AGENT_POSITION }],
      crm_case: [],
    });
    const input: Rec = { subject: 'Spoofed', description: 'x', owner_id: 'attacker_chosen_user' };
    const ctx = { event: 'beforeInsert', input, user: undefined, api: harness.api };

    await slaDefaults.handler(ctx as never);
    expect(input.owner_id, 'the guest strip stopped removing the spoofed owner').toBeUndefined();

    await assign.handler(ctx as never);
    expect(input.owner_id, 'the assignment did not run after the strip').toBe('agent_a');
    expect(input.origin, 'guest defaults regressed').toBe('web');
  });

  it('reverse verification: swap the order and the submission lands ownerless', async () => {
    // The direction this pin exists for. Running the assignment FIRST and the
    // strip second reproduces the original `lead_auto_assign` defect exactly —
    // the owner is assigned and then deleted — which is what makes the priority
    // relation above load-bearing rather than decorative.
    const harness = makeHarness({
      sys_user_position: [{ user_id: 'agent_a', position: SERVICE_AGENT_POSITION }],
      crm_case: [],
    });
    const input: Rec = { subject: 'Spoofed', description: 'x' };
    const ctx = { event: 'beforeInsert', input, user: undefined, api: harness.api };

    await assign.handler(ctx as never);
    expect(input.owner_id).toBe('agent_a');
    await slaDefaults.handler(ctx as never);
    expect(
      input.owner_id,
      'the strip no longer removes owner_id — the priority ordering has stopped mattering, ' +
        'and so has this pin',
    ).toBeUndefined();
  });
});

// ─────────────────────── the second deliverable: the triage view ──

describe('unassigned_triage makes the empty-pool path visible', () => {
  const caseViews = ((stack as AnyRec).views ?? [])
    .find((v: AnyRec) => v.list?.data?.object === 'crm_case');
  const triage = caseViews?.listViews?.unassigned_triage;

  it('exists on crm_case as a pinned tab', () => {
    expect(triage, 'the triage view is gone — the pool-empty path is silent again').toBeTruthy();
    expect(triage.data?.object).toBe('crm_case');
    const tab = (caseViews?.list?.tabs ?? []).find((t: AnyRec) => t.view === 'unassigned_triage');
    expect(tab, 'no tab reaches the triage view — an unreachable view is not visibility').toBeTruthy();
    expect(tab.pinned, 'the triage tab is not pinned').toBe(true);
  });

  it('filters on the ABSENCE of an owner, and excludes closed cases', () => {
    const byField = new Map<string, AnyRec>(
      (triage.filter ?? []).map((f: AnyRec) => [f.field, f]),
    );
    const owner = byField.get('owner_id');
    expect(owner, 'the view does not filter on owner_id at all').toBeTruthy();
    // `is_null`, not `equals: null`: the ownerless shape is an ABSENT column on
    // driver-memory as well as a NULL one on SQL, and only the operator form
    // answers the same way for both.
    expect(owner!.operator, 'an equals-null filter cannot see an absent column').toBe('is_null');
    expect(byField.get('is_closed'), 'closed ownerless cases are history, not backlog').toMatchObject({
      operator: 'equals', value: false,
    });
  });

  it('sorts on the materialised ordinal, never the raw priority select', () => {
    // Sorting on `priority` itself compares raw strings and inverts urgency
    // (medium > low > high > critical), burying every critical untriaged case at
    // the bottom of the one queue that exists to be worked top-down.
    const fields = (triage.sort ?? []).map((s: AnyRec) => s.field);
    expect(fields).toContain('priority_rank');
    expect(fields, 'sorting on the raw select inverts urgency').not.toContain('priority');
  });

  it('carries an empty state in all four locales', () => {
    // The one string this view shows in the state it exists to explain. The
    // generic i18n guard covers labels and empty states across the app; this is
    // the same requirement stated where a reader of THIS feature will see it.
    expect(triage.emptyState?.title).toBeTruthy();
    expect(triage.emptyState?.message).toBeTruthy();
    // `stack.translations` is a LIST of bundles, each keyed by locale — not a
    // list of per-locale records. Deriving it wrongly is how a guard spends its
    // life green over an empty collection, so `localePacks` is shared and the
    // count below is asserted before the contents.
    const missing: string[] = [];
    for (const [locale, pack] of localePacks) {
      const t = pack?.objects?.crm_case?._views?.unassigned_triage;
      if (!t?.label) missing.push(`${locale}: label`);
      if (!t?.emptyState?.title) missing.push(`${locale}: emptyState.title`);
      if (!t?.emptyState?.message) missing.push(`${locale}: emptyState.message`);
    }
    expect(localePacks.length, 'no translation packs discovered — this guard checks nothing')
      .toBeGreaterThanOrEqual(4);
    expect(missing, `untranslated triage copy:\n  ${missing.join('\n  ')}`).toEqual([]);
  });
});

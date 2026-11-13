// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { SqliteWasmDriver } from '@objectstack/driver-sqlite-wasm';
import { bootStack, type VerifyStack } from '@objectstack/verify';
import { extractHookBody } from '@objectstack/cli/hook-body';
import stack, { localePacks } from './helpers/composed-stack';
import caseHooks from '../src/service/objects/case.hook';
import {
  SERVICE_MANAGER_POSITION,
  POOL_QUERY_LIMIT,
} from '../src/service/objects/_case-assignment';
import {
  hotcrmStack, bootOptions, buildArtifactAgain, signUpPerson, systemUpdate, recordEngineWrites, type Person,
} from './helpers/verify-stack';

/**
 * The organization every write here carries: since 18.1.0 the driver creates
 * the tenant column `NOT NULL`, so a write that names none is refused at the
 * database (objectstack#24940).
 */
const ORG = 'org_1';

type Rec = Record<string, any>;

/**
 * The agent position, named here rather than imported: since #2395 no app code
 * reads it on the case path (the `case_intake` queue declares it as its
 * member), and the escalation hand-off below must never fall back to it.
 */
const SERVICE_AGENT_POSITION = 'crm_service_agent';

/**
 * ═══ Case intake — the platform's queue since #2395 ═══════════════════════
 *
 * Who owns a NEW case is no longer answered here. The app-level round-robin
 * (`case_auto_assign`, #596) and its triage sharing grant were deleted when
 * ObjectStack 18.3.0 shipped ownership queues (ADR-0142): `case_intake_assignment`
 * routes an ownerless insert to the least-loaded `crm_service_agent`, or parks it in
 * the `case_intake` queue when nobody holds the position. That behaviour is
 * pinned in `test/ownership-queues.test.ts`. What stays here is the second
 * deliverable of #596, the `unassigned_triage` view, which now lists exactly the
 * cases sitting in that queue.
 *
 * ═══ Escalation hand-off to the `crm_service_manager` pool (#1070) ═════════════
 *
 * The other half of "who should own this case", and the one the platform does
 * not answer: an assignment rule runs once, on insert, so an escalation (an
 * update) is still handed to the `crm_service_manager` pool by the app's hook.
 *
 * Its blocking precondition is measured below, because the gate's verdict is a
 * property of the seam: `beforeUpdate` input mutation (invisible), a caller's
 * own `owner_id` on that door (visible — the negative control), and the
 * `ctx.api` update an `afterUpdate` hook would issue (visible, and therefore
 * the shape that would have needed `crm_case.allowTransfer`).
 *
 * ═══ Measured on the shipped app ═══════════════════════════════════════════
 *
 * The seam measurement keeps its recording middleware (it measures the
 * platform's gate, with the app's hook shape). Every behaviour of the hook is
 * a real write on the app booted by `@objectstack/verify`: the pool is real
 * sign-ups holding the position, their load is cases they own, and the
 * escalation is written by the writer each path is for — the system's sweep
 * and a person's own save. What is asserted is the row the engine stored.
 */

type AnyRec = Record<string, any>;

const hookNamed = (name: string): AnyRec => {
  const hook = (caseHooks as AnyRec[]).find((h) => h.name === name);
  if (!hook) throw new Error(`hook "${name}" not found`);
  return hook;
};
const slaDefaults = hookNamed('case_sla_defaults');
const escalationReassign = hookNamed('case_escalation_reassign');

let verify: VerifyStack;
let admin: string;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
}, 120_000);

const storedCase = async (id: string): Promise<Rec> => (await verify.rows('crm_case', { id }))[0]!;

/** A case owned by `owner`, in `status`, written as the system. */
const caseOwnedBy = async (owner: Person | null, status = 'new', over: Rec = {}): Promise<Rec> =>
  (await verify.seed('crm_case', [{
    subject: `Backlog ${++k}`, description: 'Already in the queue.', status,
    ...(status === 'resolved' || status === 'closed' ? { resolution: 'Fixed.' } : {}),
    ...(owner ? { owner_id: owner.id } : {}), ...over,
  }]))[0]!;

/**
 * Staff `position` with one fresh person per entry, each carrying the case
 * backlog its entry names (`open` live cases, `done` resolved/closed ones), and
 * hand back the people plus `release()`, which takes the position off them
 * again through the admin's own door — the pool is everyone holding the
 * position on this stack, so each case starts from an empty one.
 */
async function staff(position: string, backlog: Array<{ open?: number; done?: number }>) {
  expect(await verify.rows('sys_user_position', { position }), `the ${position} pool is not empty at the start`).toEqual([]);
  const people: Person[] = [];
  for (const b of backlog) {
    const person = await signUpPerson(verify, `${position}.${++k}@case-assignment.test`, {
      name: `${position} ${k}`, positions: [position], permissionSets: ['service_agent'],
    });
    for (let i = 0; i < (b.open ?? 0); i++) await caseOwnedBy(person, i % 2 ? 'waiting_customer' : 'new');
    for (let i = 0; i < (b.done ?? 0); i++) await caseOwnedBy(person, i % 2 ? 'closed' : 'resolved');
    people.push(person);
  }
  return {
    people,
    release: async () => {
      for (const row of await verify.rows('sys_user_position', { position })) {
        await verify.hooks.run('sys_user_position', 'delete', { id: row.id }, { as: admin });
      }
    },
  };
}

/** The body `objectstack build` ships for `hook` — what a parity pin reads. */
const shippedBody = (hook: AnyRec): string => extractHookBody(hook.handler, `hook '${String(hook.name)}'`).source;


// ───────────────────────────── the triage view over the intake queue ──

describe('unassigned_triage lists the cases sitting in the case_intake queue', () => {
  const caseViews = ((stack as AnyRec).views ?? [])
    .find((v: AnyRec) => v.list?.data?.object === 'crm_case');
  const triage = caseViews?.listViews?.unassigned_triage;

  it('exists on crm_case, which is what puts it on the switcher strip', () => {
    // Reachability IS existence here (#1307). This used to look up a
    // `list.tabs[]` entry pointing at the view and assert it was `pinned`,
    // on the belief that a curated `tabs` array decided which views render.
    // Measured on the shipped renderer (`@objectstack/console` 17.1.0), the
    // object-view switcher builds its strip from `listViews` + the primary
    // `list` and never reads `tabs`, so a `listViews` entry is on the strip
    // by being defined and `pinned` was inert. `tabs` is gone from every view
    // file; the surviving assertion is the one that was always load-bearing.
    expect(triage, 'the triage view is gone — the pool-empty path is silent again').toBeTruthy();
    expect(triage.data?.object).toBe('crm_case');
    expect(
      Object.keys(caseViews?.listViews ?? {}),
      'the triage view left `listViews`, so the switcher no longer lists it',
    ).toContain('unassigned_triage');
  });

  it('filters on the ABSENCE of an owner, and excludes work that is no longer live', () => {
    const byField = new Map<string, AnyRec>(
      (triage.filter ?? []).map((f: AnyRec) => [f.field, f]),
    );
    const owner = byField.get('owner_id');
    expect(owner, 'the view does not filter on owner_id at all').toBeTruthy();
    // `is_null`, not `equals: null`: the ownerless shape is an ABSENT column on
    // driver-memory as well as a NULL one on SQL, and only the operator form
    // answers the same way for both.
    expect(owner!.operator, 'an equals-null filter cannot see an absent column').toBe('is_null');
    // Ownerless AND in the intake queue: the ADR-0142 meaning of "sits in a
    // queue" (#2395). A case nobody owns that names no queue is not waiting to
    // be claimed, and the backfill script gives the pre-18.3 backlog its queue.
    expect(byField.get('queue'), 'the view no longer reads the intake queue').toMatchObject({
      operator: 'equals', value: 'case_intake',
    });
    // `status not_in ['resolved','closed']`, NOT `is_closed == false` (#1145):
    // `is_closed` is derived as `status === 'closed'` and never flips on
    // `resolved`, so a resolved ownerless case used to satisfy both filters and
    // sit in the tab forever. `test/live-work-predicate-parity.test.ts` holds
    // this consumer and the other four to one set, by name.
    expect(
      byField.get('is_closed'),
      'the triage view is back on the derived flag, which never flips on `resolved`',
    ).toBeUndefined();
    expect(byField.get('status'), 'resolved/closed ownerless cases are history, not backlog').toMatchObject({
      operator: 'not_in', value: ['resolved', 'closed'],
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

// ════════════════════ #1070 — the escalation hand-off, and its own precondition ══

describe('the transfer gate on the UPDATE door: which escalation seam it can see', () => {
  let ql: AnyRec;
  /** Every operation the middleware seam observed, with the payload as it was THEN. */
  let seen: { object: string; operation: string; data: AnyRec }[];

  beforeAll(async () => {
    seen = [];
    ql = (await ObjectQL.create({
      datasources: { default: new SqliteWasmDriver({ filename: ':memory:' }) },
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
    await ql.syncSchemas();

    // Same recorder, same seam `@objectstack/plugin-security` registers the
    // #3004 guard on. Visibility is what is being measured, not the verdict.
    ql.registerMiddleware(async (opCtx: AnyRec, next: () => Promise<void>) => {
      seen.push({
        object: opCtx.object,
        operation: opCtx.operation,
        data: JSON.parse(JSON.stringify(opCtx.data ?? {})) as AnyRec,
      });
      return next();
    });

    // The shape `case_escalation_reassign` actually has: a beforeUpdate hook
    // that stamps `owner_id` onto the escalation write already in flight.
    ql.registerHook?.('beforeUpdate', async (ctx: AnyRec) => {
      if (ctx.object !== 'crm_case') return;
      const data = ctx.input?.data ?? ctx.data;
      if (data && data.status === 'escalated' && !data.owner_id) data.owner_id = 'mgr_pool_pick';
    }, { object: 'crm_case' });
  });

  afterAll(async () => {
    await ql?.close();
  });

  const lastUpdate = () => seen.filter((s) => s.object === 'crm_case' && s.operation === 'update').pop();

  it('A — a beforeUpdate stamp never reaches the middleware, and still reaches storage', async () => {
    // Predicted direction, stated before running: the middleware sees NO
    // `owner_id`, and the STORED row carries the hook's manager. Measured
    // 2026-08-11 on @objectstack/* 17.0.0-rc.6 — the middleware observed
    //   {"object":"crm_case","operation":"update","data":{"id":"…","status":"escalated"}}
    // and the row came back with `owner_id: "mgr_pool_pick"`.
    //
    // So the escalation hand-off needs NO `crm_case.allowTransfer` grant, and
    // #1070 is not a permission-model widening. ⛔ If a future platform release
    // moves the guard downstream of the hook phase, this expectation flips and
    // the test goes red. That is the signal to grant `allowTransfer`
    // deliberately, or to stop reassigning in a hook — NOT to widen the
    // permission model in order to make a red test green.
    const api = ql.createContext({ userId: 'usr_agent', tenantId: ORG });
    const row = await api.object('crm_case').insert({ subject: 'Printer on fire', status: 'new', owner_id: 'agent_a' });
    await api.object('crm_case').update({ id: row.id, status: 'escalated' }, { where: { id: row.id } });

    const observed = lastUpdate();
    expect(observed, 'the middleware seam never fired for the update').toBeTruthy();
    expect(
      observed!.data.owner_id,
      'the guard COULD see the hook-assigned manager — escalation reassignment now needs ' +
        'crm_case.allowTransfer, which is a permission-model change and not a hook change',
    ).toBeUndefined();

    const stored = await api.object('crm_case').findOne({ where: { id: row.id } });
    expect(stored?.owner_id, 'the hook’s hand-off did not survive to storage').toBe('mgr_pool_pick');
  });

  it('B — negative control: a caller’s own owner_id on the same door IS visible', async () => {
    // Guards the guard. Reading A is an ABSENCE, and an absence proves nothing
    // if the recorder could never have seen the key on an update in the first
    // place.
    const api = ql.createContext({ userId: 'usr_admin', tenantId: ORG });
    const row = await api.object('crm_case').insert({ subject: 'Manually moved', status: 'new', owner_id: 'agent_a' });
    await api.object('crm_case').update(
      { id: row.id, status: 'in_progress', owner_id: 'agent_explicit' },
      { where: { id: row.id } },
    );
    expect(
      lastUpdate()!.data.owner_id,
      'the recorder cannot see owner_id on an update AT ALL — reading A is vacuous',
    ).toBe('agent_explicit');
  });

  it('C — the afterUpdate shape the card proposed IS visible, which is why it was not used', async () => {
    // The reading that decided the seam. A hook writing through `ctx.api` from
    // `afterUpdate` issues a FRESH operation carrying the caller's identity, so
    // the guard reads its `owner_id` — that hand-off would be denied for a
    // `service_agent` without `crm_case.allowTransfer`, and granting it would
    // let an agent reassign any case they can edit. `case_escalation_reassign`
    // therefore runs on the door measured in A. If this expectation ever flips
    // to invisible, the afterUpdate seam becomes available too — but the
    // re-entrancy argument (a second write re-enters the record-change trigger
    // surface) stands on its own and does not.
    const api = ql.createContext({ userId: 'usr_agent', tenantId: ORG });
    const row = await api.object('crm_case').insert({ subject: 'Second write', status: 'new', owner_id: 'agent_a' });
    await api.object('crm_case').update(
      { id: row.id, owner_id: 'mgr_from_after_update' },
      { where: { id: row.id } },
    );
    expect(
      lastUpdate()!.data.owner_id,
      'a ctx.api update is no longer visible to the gate — re-read the seam choice in ' +
        '_case-assignment.ts before relying on this',
    ).toBe('mgr_from_after_update');
  });
});

describe('case_escalation_reassign', () => {
  /**
   * The escalation write as the system issues it — the SLA sweep's
   * `flag_breach`, the `case_escalation_stamp` subflow — through the one local
   * system-update path. An AGENT's own escalation reaches the same pool: the
   * hook reads it elevated (#2014), pinned below and in
   * `test/demo-staffing.test.ts`.
   */
  const escalationInput = (id: string): Rec => ({
    id,
    is_escalated: true,
    escalation_reason: 'Auto-escalated: critical priority',
    escalated_date: new Date().toISOString(),
    status: 'escalated',
  });
  const escalate = (id: string, over: Rec = {}) => systemUpdate(verify, 'crm_case', { ...escalationInput(id), ...over });

  /** The agent a case starts with. */
  let agent: Person;
  beforeAll(async () => {
    agent = await signUpPerson(verify, `agent.${++k}@case-assignment.test`, { name: 'Case Agent', permissionSets: ['service_agent'] });
  });

  it('hands the case to the least-loaded service manager — the acceptance path', async () => {
    const pool = await staff(SERVICE_MANAGER_POSITION, [{ open: 2 }, { open: 1 }]);
    try {
      const kase = await caseOwnedBy(agent, 'in_progress');
      await escalate(kase.id);
      const after = await storedCase(kase.id);
      expect(after.owner_id, 'the escalated case did not change hands').toBe(pool.people[1]!.id);
      // The escalation itself is untouched — the hand-off rides on that write.
      expect(after.status).toBe('escalated');
      expect(after.is_escalated).toBe(true);
      expect('owner' in after, 'wrote a second, unread ownership column (#548)').toBe(false);
    } finally {
      await pool.release();
    }
  });

  it('spreads consecutive escalations across the pool', async () => {
    // Acceptance criterion 2. Least-loaded is a self-balancing round-robin: no
    // rotation counter, no cursor — the second escalation sees the first one's
    // case counting against its new owner and goes elsewhere.
    const pool = await staff(SERVICE_MANAGER_POSITION, [{ open: 0 }, { open: 0 }]);
    try {
      const first = await caseOwnedBy(agent, 'in_progress');
      const second = await caseOwnedBy(agent, 'new');
      await escalate(first.id);
      await escalate(second.id);
      const a = (await storedCase(first.id)).owner_id;
      const b = (await storedCase(second.id)).owner_id;
      const managers = pool.people.map((p) => p.id);
      expect(managers, 'the first escalation did not reach the pool').toContain(a);
      expect(managers, 'the second escalation did not reach the pool').toContain(b);
      expect(b, 'both escalations landed on the same manager — the load count is not being read').not.toBe(a);
    } finally {
      await pool.release();
    }
  });

  it('reads the SERVICE_MANAGER_POSITION pool, and only that pool', async () => {
    // The parity pin the module's header promises: an L2 body must spell its
    // position literal inline (no module scope in QuickJS), so the shipped body
    // is read for it, and the behaviour is driven with agent and rep holders
    // present — neither may be picked.
    const body = shippedBody(escalationReassign);
    expect(body, 'the position literal in the hook body drifted from SERVICE_MANAGER_POSITION')
      .toContain(`position: "${SERVICE_MANAGER_POSITION}"`);
    expect(body, 'the pool read bound drifted from POOL_QUERY_LIMIT').toMatch(new RegExp(`top: (${POOL_QUERY_LIMIT}|${POOL_QUERY_LIMIT.toExponential().replace('+', '')})\\b`));

    const agents = await staff(SERVICE_AGENT_POSITION, [{ open: 0 }]);
    const pool = await staff(SERVICE_MANAGER_POSITION, [{ open: 3 }]);
    try {
      const kase = await caseOwnedBy(agent, 'new');
      await escalate(kase.id);
      expect((await storedCase(kase.id)).owner_id).toBe(pool.people[0]!.id);
    } finally {
      await pool.release();
      await agents.release();
    }
  });

  it('counts OPEN cases only — a manager’s resolved pile stops counting', async () => {
    const pool = await staff(SERVICE_MANAGER_POSITION, [{ done: 3 }, { open: 1 }]);
    try {
      const kase = await caseOwnedBy(agent, 'new');
      await escalate(kase.id);
      expect((await storedCase(kase.id)).owner_id, 'resolved/closed cases are still counting as manager load').toBe(pool.people[0]!.id);
    } finally {
      await pool.release();
    }
  });

  // ── the empty pool: the first-install norm, and acceptance criterion 3 ──

  it('keeps the current owner when nobody holds service_manager, and still escalates', async () => {
    // Holders of the agent pool are present, and the hand-off must not fall
    // back to them.
    const agents = await staff(SERVICE_AGENT_POSITION, [{ open: 0 }]);
    try {
      const kase = await caseOwnedBy(agent, 'new');
      await escalate(kase.id);
      const after = await storedCase(kase.id);
      expect(after.owner_id, 'invented an owner out of an empty pool').toBe(agent.id);
      // The escalation write is intact — the case is escalated, just not moved.
      expect(after.status).toBe('escalated');
      expect(after.is_escalated).toBe(true);
      expect(after.escalation_reason).toBeTruthy();
    } finally {
      await agents.release();
    }
  });

  it('hands an agent’s OWN escalation to the pool too (#2014)', async () => {
    // The agent may not read `sys_user_position`, so as the caller the read was
    // refused and the case stayed with the agent who could not get to it. The
    // hook declares `runAs: 'system'`; elevation reaches only its two reads —
    // it still issues no write of its own.
    const pool = await staff(SERVICE_MANAGER_POSITION, [{ open: 0 }]);
    const caller = await signUpPerson(verify, `escalator.${++k}@case-assignment.test`, {
      name: 'Escalating Agent', positions: [SERVICE_AGENT_POSITION], permissionSets: ['service_agent'],
    });
    try {
      await expect(verify.rows('sys_user_position', { position: SERVICE_MANAGER_POSITION }, { as: caller.token }), 'the agent can read the pool, so this case proves nothing')
        .rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
      const kase = await verify.hooks.run('crm_case', 'insert', { subject: 'Mine', description: 'x', status: 'new' }, { as: caller.token });
      await verify.hooks.run('crm_case', 'update', { id: kase.id, status: 'escalated' }, { as: caller.token });
      const after = await storedCase(kase.id);
      expect(after.status).toBe('escalated');
      expect(after.owner_id, 'the agent’s escalation did not reach the service_manager pool').toBe(pool.people[0]!.id);
    } finally {
      await pool.release();
      for (const row of await verify.rows('sys_user_position', { user_id: caller.id })) {
        await verify.hooks.run('sys_user_position', 'delete', { id: row.id }, { as: admin });
      }
    }
  });

  it('stays inside the escalating case’s organization (AGENTS.md rule 10)', async () => {
    // The pool and the load counts are organization-neutral predicates, and the
    // SLA sweep escalates as the system with NO tenant — so nothing but the
    // hook's own pin keeps a breached case from going to the least-loaded
    // manager of another organization. Two organizations, one manager each:
    // the other organization's manager is the LESS loaded one, so an unpinned
    // read picks them.
    //
    // On a boot of its own: once an install holds two organizations the engine
    // refuses every system insert that names none (it cannot tell which one
    // owns the row), which is every other fixture in this file.
    // (A build of its own, too: one configuration object holds one live kernel
    // since 18.0.0-next.0, objectstack#22301.)
    const twoOrgs = await bootStack(await buildArtifactAgain(), bootOptions());
    const orgs = await twoOrgs.seed('sys_organization', [
      { name: 'Case Org', slug: 'case-org' }, { name: 'Other Org', slug: 'other-org' },
    ]);
    const [own, other] = [String(orgs[0]!.id), String(orgs[1]!.id)];
    const ownManager = await signUpPerson(twoOrgs, 'own.manager@case-assignment.test', { name: 'Own Manager' });
    const otherManager = await signUpPerson(twoOrgs, 'other.manager@case-assignment.test', { name: 'Other Manager' });
    await twoOrgs.seed('sys_user_position', [
      { user_id: ownManager.id, position: SERVICE_MANAGER_POSITION, organization_id: own },
      { user_id: otherManager.id, position: SERVICE_MANAGER_POSITION, organization_id: other },
    ]);
    const caseIn = async (doc: Rec) =>
      (await twoOrgs.seed('crm_case', [{ subject: `Org case ${++k}`, description: 'x', status: 'new', organization_id: own, ...doc }]))[0]!;
    await caseIn({ owner_id: ownManager.id });
    const kase = await caseIn({});
    await systemUpdate(twoOrgs, 'crm_case', escalationInput(String(kase.id)));
    const [after] = await twoOrgs.rows('crm_case', { id: kase.id });
    expect(after!.status).toBe('escalated');
    expect(after!.owner_id, 'the escalation crossed into another organization’s pool').toBe(ownManager.id);
  }, 120_000);

  it('does nothing on a case BORN escalated — that is no transition', async () => {
    // The `!ctx.api` stand-down has no door on the shipped app. No `previous`
    // is the insert shape — a case born escalated is not a transition, and
    // this hook is not the intake path.
    const pool = await staff(SERVICE_MANAGER_POSITION, [{ open: 0 }]);
    try {
      const born = await caseOwnedBy(agent, 'escalated', { is_escalated: true, escalation_reason: 'Imported escalated.' });
      expect((await storedCase(born.id)).owner_id).toBe(agent.id);
    } finally {
      await pool.release();
    }
  });

  // ── re-entrancy: the risk the card named twice ──

  it('issues NO operation of its own — there is nothing to re-enter the trigger surface', async () => {
    // The whole re-entrancy argument in one assertion. This hook mutates the
    // payload of the update already in flight; it performs no insert and no
    // update, so it fires no second `record-after-update`, and neither
    // `case_escalation` nor `case_status_side_effects` can be re-triggered by
    // it. Both accidents this file's neighbourhood has had — the
    // `closed_date`-as-`resolved_date` write and the 2026-07-06 `is_escalated`
    // re-fire loop that wedged a first-boot seed — were EXTRA writes.
    const pool = await staff(SERVICE_MANAGER_POSITION, [{ open: 0 }, { open: 0 }]);
    try {
      const kase = await caseOwnedBy(agent, 'new');
      const recorder = recordEngineWrites(verify);
      try {
        await escalate(kase.id);
        await new Promise((r) => setTimeout(r, 400));
        await Promise.all(recorder.writes.map((w) => w.settled));
      } finally {
        recorder.restore();
      }
      expect(pool.people.map((p) => p.id)).toContain((await storedCase(kase.id)).owner_id);
      const caseWrites = recorder.of('crm_case');
      expect(
        caseWrites.length,
        `a second write reached the case (${caseWrites.map((w) => w.op).join(', ')}) — ` +
          'that is a second operation, a second trigger fire, and the re-entrancy risk is back',
      ).toBe(1);
    } finally {
      await pool.release();
    }
  });

  it('does not fire on a replay: the guard is the TRANSITION, not the escalated state', async () => {
    // Feed the same escalation again as the next write on the same record — the
    // shape a re-fire takes. `previous.status` is now `escalated`, so the hook
    // stands down. The 2026-07-06 loop read the boolean `is_escalated` instead,
    // which SQLite stores as `1` and `1 != true` never trips; both writes carry
    // `is_escalated: true` and neither is mistaken for a fresh escalation.
    const pool = await staff(SERVICE_MANAGER_POSITION, [{ open: 0 }, { open: 0 }]);
    try {
      const kase = await caseOwnedBy(agent, 'new');
      await escalate(kase.id);
      const handedTo = (await storedCase(kase.id)).owner_id;
      expect(pool.people.map((p) => p.id)).toContain(handedTo);
      await escalate(kase.id);
      expect((await storedCase(kase.id)).owner_id, 'a re-fire moved the case again — this is the loop shape').toBe(handedTo);
    } finally {
      await pool.release();
    }
  });

  it('an ordinary edit of an already-escalated case does not move it', async () => {
    // The scenario ONLY the transition guard catches, and the reason it is not
    // redundant with the pool short-circuit below: this case is escalated and
    // owned by an AGENT (the pool was unstaffed when it escalated, or someone
    // handed it back), so nothing else stands between a plain form save — which
    // echoes `status: 'escalated'` back with the rest of the record — and the
    // case being yanked away mid-edit, on every save, forever.
    //
    // Reverse-verified 2026-08-11: with `|| previous.status === 'escalated'`
    // deleted from the handler this expectation reads a manager and the test
    // goes red, while every other test in this describe stays green.
    const pool = await staff(SERVICE_MANAGER_POSITION, [{ open: 0 }, { open: 0 }]);
    try {
      const kase = await caseOwnedBy(agent, 'escalated', { is_escalated: true, escalation_reason: 'Escalated earlier.' });
      await systemUpdate(verify, 'crm_case', { id: kase.id, status: 'escalated', subject: 'Printer still on fire' });
      expect((await storedCase(kase.id)).owner_id, 'an ordinary save re-ran the hand-off').toBe(agent.id);
    } finally {
      await pool.release();
    }
  });

  it('leaves a case already owned by a pool member where it is — the second guard', async () => {
    // A service manager escalating their own case keeps it — otherwise the
    // hand-off would bounce work between managers on every escalation.
    //
    // Reverse-verified by hand, 2026-08-11, one guard at a time, and the
    // measurement corrected a wrong prediction worth recording: deleting the
    // pool-membership short-circuit turns exactly THIS test red (34 → 1 failed)
    // and leaves the replay test green. Deleting the transition guard
    // (`|| previous.status === 'escalated'`) does NOT turn the replay test red
    // — the replay's case is by then owned by a manager, so this short-circuit
    // catches it too. The scenario that isolates the transition guard is the
    // ordinary-edit test above, whose case stays with an AGENT; that one goes
    // red on its own. Two guards, two independent proofs, neither redundant.
    const pool = await staff(SERVICE_MANAGER_POSITION, [{ open: 2 }, { open: 0 }]);
    try {
      const busy = pool.people[0]!;
      const kase = await caseOwnedBy(busy, 'new');
      await escalate(kase.id);
      // The other manager is less loaded, and it still does not move: "already
      // with the pool" wins over "least loaded".
      expect((await storedCase(kase.id)).owner_id, 'took the case off the manager already working it').toBe(busy.id);
    } finally {
      await pool.release();
    }
  });

  it('stands down when the same write carries an explicit owner', async () => {
    // "Escalate and hand it to Dana" is a decision the caller already made.
    const pool = await staff(SERVICE_MANAGER_POSITION, [{ open: 0 }, { open: 0 }]);
    const dana = await signUpPerson(verify, `dana.${++k}@case-assignment.test`, { name: 'Dana', permissionSets: ['service_agent'] });
    try {
      const kase = await caseOwnedBy(agent, 'new');
      await escalate(kase.id, { owner_id: dana.id });
      expect((await storedCase(kase.id)).owner_id).toBe(dana.id);
    } finally {
      await pool.release();
    }
  });

  it('ignores every write that is not the escalation transition', async () => {
    const pool = await staff(SERVICE_MANAGER_POSITION, [{ open: 0 }, { open: 0 }]);
    try {
      const kase = await caseOwnedBy(agent, 'new');
      for (const doc of [{ priority: 'high' }, { status: 'in_progress' }]) {
        await systemUpdate(verify, 'crm_case', { id: kase.id, ...doc });
        expect((await storedCase(kase.id)).owner_id, `a non-escalation write (${JSON.stringify(doc)}) moved the case`).toBe(agent.id);
      }
      const escalated = await caseOwnedBy(agent, 'escalated', { is_escalated: true, escalation_reason: 'Escalated earlier.' });
      await systemUpdate(verify, 'crm_case', { id: escalated.id, status: 'closed', resolution: 'Fixed.' });
      expect((await storedCase(escalated.id)).owner_id, 'closing an escalated case moved it').toBe(agent.id);
    } finally {
      await pool.release();
    }
  });

  // ── wiring ──

  it('runs on beforeUpdate only — the seam the transfer gate cannot see', () => {
    // Not decoration: `afterUpdate` (the shape the card proposed) is measured
    // VISIBLE to the gate in reading C above, so moving this hook's events
    // there would demand `crm_case.allowTransfer` on `service_agent`.
    expect(escalationReassign.events).toEqual(['beforeUpdate']);
    expect(escalationReassign.object).toBe('crm_case');
    // It runs on the far side of the guest strip. Nothing on the update path
    // depends on that ordering today — the strip is insert-only — but the
    // ownership writer stays after the hook that sanitises its input.
    expect(escalationReassign.priority as number).toBeGreaterThan(slaDefaults.priority as number);
  });
});

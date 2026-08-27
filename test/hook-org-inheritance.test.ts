// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL, bindHooksToEngine, applySystemFields } from '@objectstack/objectql';
import { SqliteWasmDriver } from '@objectstack/driver-sqlite-wasm';
import stack from '../objectstack.config';

/**
 * Records this app's HOOKS create inherit the triggering caller's organization
 * (#1361), on a walled deployment.
 *
 * ### Why this needed measuring rather than reasoning
 *
 * Not one of these inserts names an organization. `case.hook.ts` writes an
 * escalation `crm_task`, `quote.hook.ts` drafts a `crm_contract`,
 * `task.hook.ts` clones the next occurrence of a recurring task and
 * `lead.hook.ts` opens a follow-up — all of them through `ctx.api`, all of them
 * relying on the engine to stamp `organization_id` from the execution context
 * they inherit. Under a single-org install that column is NULL and nothing can
 * go wrong; under a wall it decides which tenant owns the row, and a row born
 * outside every partition is invisible to the tenant whose work produced it.
 *
 * Three properties of the platform make the answer non-obvious enough to
 * measure instead of assume:
 *
 *  - **The stamp comes from the context, not the payload.** `buildHookApi`
 *    hands a hook a `ScopedContext` over the SAME execution context the write
 *    ran under, so the tenant id travels only as long as that object does.
 *  - **Three of these four hooks are `async: true`.** An after-event async hook
 *    is dispatched fire-and-forget — the triggering write returns before the
 *    handler runs. Context that lived in ambient storage rather than on the
 *    context object would not survive that boundary.
 *  - **A system context is genuinely unwalled**, and it is one `isSystem` away.
 *    `test/saas-composition.test.ts` measures that direction; this file
 *    measures that ordinary hook writes are NOT on it.
 *
 * ### Why a real engine on a real driver
 *
 * `test/helpers/hook-harness.ts` implements `ctx.api` over plain arrays. It can
 * prove what a hook WRITES; it cannot prove what the engine STAMPS, because it
 * has no tenant column and no driver — a hook could be leaking rows across the
 * wall and every harness-based test in this repo would stay green. So this file
 * stands up ObjectQL on `SqliteWasmDriver` and reads `organization_id` back out
 * of SQL.
 *
 * `driver-memory` is not an option and the refusal is the platform's, not a
 * preference: it "has NO row-level tenant isolation" and fails at construction
 * under any walled posture (objectstack#6915). A suite that reached for it
 * would either not start or measure nothing.
 *
 * ### What `OS_TENANCY_POSTURE` is doing here — and what it is NOT
 *
 * It is set because that is what a walled deployment sets, and because it is
 * what makes the engine's own registry organization-scoped. It is NOT the lever
 * this file measures, and saying otherwise would be a story rather than a fact:
 * flipping it to `single` and re-running was measured, and every assertion below
 * still passes.
 *
 * That is not a hole, it is the finding stated precisely. The organization
 * predicate is the DRIVER's, compiled from the execution context's tenant id,
 * beneath permissions and sharing and independent of the posture knob — which
 * is exactly why hook writes inherit it: they run on the context the triggering
 * write ran on. The property holds wherever a context carries a tenant, and a
 * posture-conditional pin would have claimed something narrower and weaker.
 *
 * ### The sentinel, and the proof these assertions can fail
 *
 * "Every row carried org_a" is worth nothing if the probe could not have
 * surfaced a row from anywhere else. The first test plants a second tenant and
 * proves the wall is up before any silence below is allowed to mean anything.
 *
 * The other direction was measured too: making `case.hook.ts` write
 * `organization_id: 'org_b'` on its escalation task turns the first assertion
 * below red (`expected 'org_b' to be 'org_a'`). Worth recording, because a
 * hook's forged organization is NOT overwritten the way a forged value on the
 * HTTP data plane is — `ctx.api` is trusted server-side code, so this pin is
 * the thing standing between an authoring slip and a cross-tenant row.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const hooks: AnyRec[] = (stack as any).hooks ?? [];

const ORG_A = 'org_a';
const ORG_B = 'org_b';

let driver: SqliteWasmDriver;
let ql: AnyRec;
let a: AnyRec;
let b: AnyRec;
let previousPosture: string | undefined;

/** Rows straight out of SQL — under the caller's own wall the point is moot. */
const sql = async (statement: string): Promise<AnyRec[]> =>
  (await driver.getKnex().raw(statement)) as AnyRec[];

/**
 * Wait for an async (fire-and-forget) hook to land its row, then return it.
 *
 * Polls to a deadline rather than sleeping a guessed interval, and THROWS when
 * nothing arrives. An absent row must never read as a pass: three of the four
 * hooks under test are `onError: 'log'`, so a refused insert is silent, and
 * "no rows, no failed assertion" is exactly the shape that would hide it.
 */
async function awaitRow(what: string, statement: string, timeoutMs = 10_000): Promise<AnyRec> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const rows = await sql(statement);
    if (rows.length > 0) return rows[0]!;
    if (Date.now() > deadline) {
      throw new Error(`${what}: no row appeared within ${timeoutMs}ms — the hook did not write one`);
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

beforeAll(async () => {
  previousPosture = process.env.OS_TENANCY_POSTURE;
  process.env.OS_TENANCY_POSTURE = 'isolated';

  const objectMap: Record<string, AnyRec> = {};
  for (const o of objects) objectMap[String(o.name)] = o;

  driver = new SqliteWasmDriver({ filename: ':memory:' });
  ql = (await ObjectQL.create({
    datasources: { default: driver as never },
    objects: objectMap as never,
  } as never)) as AnyRec;

  await driver.initObjects(
    objects.map((o) => {
      const scoped = applySystemFields(o as never, { multiTenant: true } as never) as AnyRec;
      return { name: o.name, fields: scoped.fields, indexes: scoped.indexes } as never;
    }),
  );

  // The app's REAL hooks, bound the way `defineStack({ hooks })` binds them.
  const bound = bindHooksToEngine(ql as never, hooks as never, {} as never) as AnyRec;
  expect(bound.registered, `no hooks bound: ${JSON.stringify(bound.errors)}`).toBeGreaterThan(0);

  a = ql.createContext({ userId: 'usr_a', tenantId: ORG_A });
  b = ql.createContext({ userId: 'usr_b', tenantId: ORG_B });
}, 90_000);

afterAll(async () => {
  await ql?.close?.();
  if (previousPosture === undefined) delete process.env.OS_TENANCY_POSTURE;
  else process.env.OS_TENANCY_POSTURE = previousPosture;
});

describe('the wall is up — sentinel', () => {
  it('a row written by one tenant is invisible to the other, and stamped', async () => {
    const rowA = (await a
      .object('crm_account')
      .insert({ name: 'Tenant A Co', type: 'customer', owner_id: 'usr_a' })) as AnyRec;
    const rowB = (await b
      .object('crm_account')
      .insert({ name: 'Tenant B Co', type: 'customer', owner_id: 'usr_b' })) as AnyRec;

    expect(rowA.organization_id).toBe(ORG_A);
    expect(rowB.organization_id).toBe(ORG_B);

    const seenByA = (await a.object('crm_account').find({})) as AnyRec[];
    expect(seenByA.map((r) => String(r.name))).toEqual(['Tenant A Co']);

    // Both rows really are in the one table — the wall is hiding one, not
    // measuring an empty database.
    expect((await sql('select id from crm_account')).length).toBe(2);
  }, 30_000);
});

describe('hook-created records inherit the triggering organization', () => {
  it("case.hook.ts — the escalation task lands in the escalating tenant's org", async () => {
    const account = (await a
      .object('crm_account')
      .insert({ name: 'Escalation Co', type: 'customer', owner_id: 'usr_a' })) as AnyRec;
    const kase = (await a.object('crm_case').insert({
      subject: 'org inheritance — case',
      description: 'raised by the org-inheritance pin',
      status: 'new',
      priority: 'high',
      crm_account: account.id,
      owner_id: 'usr_a',
    })) as AnyRec;
    expect(kase.organization_id).toBe(ORG_A);

    await a.object('crm_case').update({ id: kase.id, status: 'escalated' });

    const task = await awaitRow(
      'case escalation task',
      `select id, organization_id, subject from crm_task where related_to_case = '${kase.id}'`,
    );
    expect(task.organization_id).toBe(ORG_A);
    // The row is genuinely the hook's, not any row that happened to be there.
    expect(String(task.subject)).toContain('Escalated');

    // …and it is inside the wall: the other tenant cannot reach it.
    const seenByB = (await b.object('crm_task').find({ where: { id: task.id } })) as AnyRec[];
    expect(seenByB).toEqual([]);
  }, 30_000);

  it("quote.hook.ts — the auto-drafted contract lands in the accepting tenant's org", async () => {
    const account = (await a
      .object('crm_account')
      .insert({ name: 'Quote Co', type: 'customer', owner_id: 'usr_a' })) as AnyRec;
    const contact = (await a.object('crm_contact').insert({
      first_name: 'Quinn',
      last_name: 'Buyer',
      email: 'quinn.buyer@org-inheritance.test',
      crm_account: account.id,
      owner_id: 'usr_a',
    })) as AnyRec;
    const quote = (await a.object('crm_quote').insert({
      name: 'org inheritance — quote',
      status: 'draft',
      crm_account: account.id,
      crm_contact: contact.id,
      owner_id: 'usr_a',
      expiration_date: '2030-01-01',
    })) as AnyRec;
    expect(quote.organization_id).toBe(ORG_A);

    await a.object('crm_quote').update({ id: quote.id, status: 'accepted' });

    const contract = await awaitRow(
      'auto-drafted contract',
      `select id, organization_id, crm_account from crm_contract where crm_account = '${account.id}'`,
    );
    expect(contract.organization_id).toBe(ORG_A);
    // The lookup it carries points INSIDE the same organization — a contract
    // stamped org_a but pointing at another tenant's account would be the
    // subtler half of the same defect.
    expect(contract.crm_account).toBe(account.id);
  }, 30_000);

  it("task.hook.ts — the next occurrence of a recurring task stays in the org", async () => {
    const seed = (await a.object('crm_task').insert({
      subject: 'org inheritance — recurring',
      status: 'not_started',
      priority: 'normal',
      is_recurring: true,
      recurrence_type: 'weekly',
      recurrence_interval: 1,
      due_date: '2030-01-01',
      owner_id: 'usr_a',
    })) as AnyRec;
    expect(seed.organization_id).toBe(ORG_A);

    await a.object('crm_task').update({ id: seed.id, status: 'completed', is_completed: true });

    const clone = await awaitRow(
      'recurring task clone',
      `select id, organization_id, due_date from crm_task ` +
        `where subject = 'org inheritance — recurring' and id != '${seed.id}'`,
    );
    expect(clone.organization_id).toBe(ORG_A);
    expect(String(clone.due_date)).not.toBe('2030-01-01');
  }, 30_000);

  it("lead.hook.ts — the qualified-lead follow-up stays in the org", async () => {
    const lead = (await a.object('crm_lead').insert({
      first_name: 'Lena',
      last_name: 'Prospect',
      company: 'Org Inheritance Co',
      email: 'lena.prospect@org-inheritance.test',
      status: 'new',
      owner_id: 'usr_a',
    })) as AnyRec;
    expect(lead.organization_id).toBe(ORG_A);

    await a.object('crm_lead').update({ id: lead.id, status: 'qualified' });

    const followUp = await awaitRow(
      'qualified-lead follow-up task',
      `select id, organization_id, subject from crm_task where related_to_lead = '${lead.id}'`,
    );
    expect(followUp.organization_id).toBe(ORG_A);
  }, 30_000);

  it('NOTHING this suite created escaped the partition', async () => {
    // The sweep the per-hook assertions cannot do: no row anywhere in the
    // hook-written objects is org-less. A NULL `organization_id` is not untidy
    // — it is outside every tenant's reads and outside every
    // `(organization_id, …)` unique index.
    const orgless: string[] = [];
    for (const object of ['crm_task', 'crm_contract']) {
      const rows = await sql(`select id from ${object} where organization_id is null`);
      for (const row of rows) orgless.push(`${object}:${row.id}`);
    }
    expect(orgless, `rows born outside every organization:\n  ${orgless.join('\n  ')}`).toEqual([]);

    // Not vacuous: those tables do hold the rows this suite produced.
    const taskCount = (await sql('select id from crm_task')).length;
    expect(taskCount).toBeGreaterThan(0);
  }, 30_000);
});

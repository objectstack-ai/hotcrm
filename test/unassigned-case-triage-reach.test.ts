// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectKernel } from '@objectstack/core';
import { DefaultDatasourcePlugin, AppPlugin } from '@objectstack/runtime';
import { ObjectQLPlugin } from '@objectstack/objectql';
import { MetadataPlugin } from '@objectstack/metadata';
import {
  SecurityPlugin,
  appDefaultPermissionSetName,
  buildContextForUser,
} from '@objectstack/plugin-security';
import { SharingServicePlugin } from '@objectstack/plugin-sharing';
import { SysUser, SysMember, SysOrganization } from '@objectstack/platform-objects/identity';
import stack from '../objectstack.config';
import caseHooks from '../src/objects/case.hook';
import { CLAIMABLE_TARGET_STATUSES } from '../src/objects/_case-assignment';

/**
 * Who really sees the `Unassigned — triage` tab's rows (#1096) — measured
 * against the real enforcement stack, on BOTH row shapes.
 *
 * ### What this file answers
 *
 * #596 shipped the queue substitute: a round-robin intake hook plus a pinned
 * `Unassigned — triage` view. `case_auto_assign` is a deliberate no-op whenever
 * the `service_agent` pool is empty or unreadable, so cases land ownerless — and
 * `service_agent` holds `crm_case` with `readScope: 'own'`, which an unowned row
 * matches for nobody. The tab was pinned in every Cases list *including the
 * agent's* and returned zero rows for the persona it exists for.
 *
 * `case_unassigned_triage_sharing` (`src/sharing/case.sharing.ts`) is the ruled
 * fix. Every other test in this repo reads METADATA; none can answer whether the
 * engine turns that declaration into rows on an agent's screen. So this one boots
 * the shipped stack — ObjectQL + `plugin-security` + `plugin-sharing`, the same
 * plugins `objectstack serve` mounts — over the app's own `objectstack.config.ts`
 * and asks the engine, as a real `service_agent`, what comes back.
 *
 * ### ⚠️ The hazard is the ROW SHAPE, and the two shapes are different inputs
 *
 * "No owner" is not one thing in storage:
 *
 *   - `driver-memory` (and `driver-mongodb`) store only the columns a row was
 *     actually written with, so an ownerless case has **no `owner_id` key at
 *     all**;
 *   - a SQL driver materialises every declared column, so the same case has
 *     `owner_id` **present and NULL**.
 *
 * A marketplace app does not choose its host's datasource, so a predicate that
 * answers on one and not the other is a rule that works on half its installs.
 * The whole matrix below therefore runs TWICE, once per driver, off one shared
 * fixture builder — and `the two drivers really do store different shapes`
 * asserts the difference is real, so the two runs cannot be the same measurement
 * twice.
 *
 * ### ⚠️ Why the rule carries NO `has()` guard
 *
 * A sharing condition is not interpreted per record. `plugin-sharing` lowers it
 * to a pushdown filter through `compileCelToFilter`, which rejects the entire
 * function-call class — `has(record.owner_id)` makes the rule *untranslatable*,
 * and the seeder then drops it rather than degrading it to match-all. The rule
 * would be declared, documented and silently unseeded: the #621 defect, exactly.
 * AGENTS.md's totality rule (#630) governs the two INTERPRETED CEL surfaces
 * (object `validations[]` / field predicates, and record-change flow
 * conditions); it does not reach this one, and applying it here is actively
 * harmful. `test/sharing-seeding.test.ts` pins the compiler's verdict on
 * `has()`; what THIS file pins is that the unguarded form nevertheless answers
 * correctly on the absent-key shape, which is the reason the guard is not
 * needed: `record.owner_id == null` lowers to `{ owner_id: { $null: true } }`,
 * and `$null` reads an absent key and a NULL column alike.
 *
 * ### How to read a failure here
 *
 * A red `an agent sees every unowned OPEN case` means the queue-pull story is
 * broken again — the tab is back to being empty for the persona it is pinned
 * for. A red `an agent sees no case owned by someone else` is the opposite and
 * far worse: the grant stopped being self-limiting and agents are reading other
 * people's customer cases. Every visibility case carries a positive control (a
 * row that MUST come back), so none of them can pass by returning nothing.
 *
 * ### The write half (#1096, second pass)
 *
 * #1134 shipped the sight and left the card open on *"and can take ownership"*.
 * The final block per driver — `the write half — taking ownership` — is that
 * half, driven the same way: real writes, real contexts, both row shapes.
 *
 * The seam is `case_self_claim` (`src/objects/_case-assignment.ts`), and the
 * one thing to understand before reading those cases is WHY it is a gesture
 * rather than an adjudicated value. Measured, the #3004 transfer gate refuses a
 * payload carrying `owner_id` inside the middleware, UPSTREAM of the hook phase
 * — a hook that would sanitise the key never fires. So "an agent may set
 * `owner_id` to themselves" is unimplementable as written, and is implemented
 * one level up instead: the agent moves an unowned open case into a worked
 * status, and the hook stamps the only user id it has, the caller's own.
 *
 * That is why `writing owner_id BY HAND is still denied` is still here and
 * still green. It is no longer the card's open half; it is the safety half.
 */

type AnyRec = Record<string, any>;

// The object registry announces every registered object on stdout at `info`.
process.env.OS_REGISTRY_LOG ??= 'silent';

const SYS = { isSystem: true } as AnyRec;

/** The rule under test. */
const RULE = 'case_unassigned_triage_sharing';

interface Fixture {
  kernel: AnyRec;
  ql: AnyRec;
  /** ids by fixture label. */
  id: Record<string, string>;
  /** The `service_agent` execution context under test. */
  agentCtx: AnyRec;
  /** The platform-admin context — the actor that can reach what the rule hides. */
  adminCtx: AnyRec;
  /** What `agent` can see of `object`, as sorted fixture labels. */
  sees: (object: string) => Promise<string[]>;
  /** Attempt an agent-context update; returns a stable outcome label. */
  writes: (object: string, rowId: string, patch: AnyRec) => Promise<string>;
  /** The same, under any context — the admin, or the system. */
  writesAs: (context: AnyRec, object: string, rowId: string, patch: AnyRec) => Promise<string>;
  /** The stored row as the driver hands it back, under a system context. */
  raw: (object: string, rowId: string) => Promise<AnyRec>;
  /**
   * The stored `owner_id` as a PRIMITIVE, read fresh from the driver.
   *
   * ⚠️ Deliberately not "the row before" and "the row after". The in-memory
   * driver can hand back the very object it stores, so a "before" ROW captured
   * into a variable is the same reference the write then mutates — comparing it
   * afterwards compares a row against itself and passes on unfixed code. A
   * string (or null) copied out at read time cannot do that.
   */
  ownerOf: (rowId: string) => Promise<string | null>;
}

/**
 * Boot the shipped stack on `driver` and populate the triage fixture.
 *
 * ⚠️ ORDER IS LOad-BEARING: the ownerless cases are inserted BEFORE anyone holds
 * the `service_agent` position, because `case_auto_assign` would otherwise
 * round-robin them onto an agent and there would be nothing ownerless left to
 * measure. That is not a trick — it is the exact first-install state #596
 * describes, where an empty pool is the norm rather than an edge case.
 */
async function boot(driver: string, config: AnyRec): Promise<Fixture> {
  const kernel: AnyRec = new ObjectKernel({ logger: { level: 'silent' } } as never);
  await kernel.use(new DefaultDatasourcePlugin({ driver, config } as never));
  await kernel.use(
    new MetadataPlugin({ watch: false, artifactWatch: false, environmentId: 'proj_test' } as never),
  );
  await kernel.use(new ObjectQLPlugin({ environmentId: 'proj_test' } as never));
  await kernel.use(new AppPlugin(stack as never, undefined as never, { skipSeedData: true } as never));
  await kernel.use(
    new SecurityPlugin({
      fallbackPermissionSet: appDefaultPermissionSetName((stack as AnyRec).permissions),
    } as never),
  );
  await kernel.use(new SharingServicePlugin());
  await kernel.bootstrap();
  const ql: AnyRec = kernel.getService('objectql');

  // The identity objects are the platform's, not this app's, so nothing in this
  // boot declares them and a SQL driver has no DDL to create their tables from
  // (the in-memory driver creates one lazily on first write, which is exactly
  // why this gap is invisible until a SQL host runs the same code). Their real
  // schemas are imported rather than hand-mirrored — guessing the column set
  // would pin this repo's reading of the platform instead of the platform.
  const engine: AnyRec = kernel.getService('data');
  const driverName: string | undefined = engine?.getDefaultDriverName?.();
  const dataDriver: AnyRec | undefined = driverName ? engine?.getDriverByName?.(driverName) : undefined;
  await dataDriver?.initObjects?.([SysUser, SysMember, SysOrganization] as never);

  const id: Record<string, string> = {};
  const insert = async (object: string, doc: AnyRec): Promise<string> => {
    const row = await ql.insert(object, doc, { context: SYS });
    return String(row?.id ?? row?.record?.id);
  };

  // ── principals ────────────────────────────────────────────────────────
  // The FIRST human user is auto-promoted to platform admin at boot, and a
  // platform admin bypasses every filter this file measures. Burn that
  // promotion on a throwaway so the agent under test is an ordinary user.
  //
  // #1096 then gives that throwaway a second job: it is the actor that can
  // REACH a case the sharing rule hides, which is the only way to ask
  // `case_self_claim`'s own guards a question the record-level denial has not
  // already answered. See `the closed guard is the SEAM's, not just the
  // sharing rule's` below.
  id.admin = await insert('sys_user', { name: 'Platform Admin', email: 'admin@triage-reach.test' });
  id.agent = await insert('sys_user', { name: 'Triage Agent', email: 'agent@triage-reach.test' });
  id.other = await insert('sys_user', { name: 'Other Agent', email: 'other@triage-reach.test' });

  // ── the ownerless population, inserted while the pool is EMPTY ─────────
  const caseDoc = (subject: string, extra: AnyRec = {}) => ({
    subject,
    description: 'Inbound web-to-case with nobody on the rota.',
    status: 'new',
    priority: 'medium',
    ...extra,
  });
  id.unowned_open = await insert('crm_case', caseDoc('Unowned, open'));
  id.unowned_critical = await insert('crm_case', caseDoc('Unowned, critical', { priority: 'critical' }));
  // The deliberate exclusion: an ownerless case that is already CLOSED is
  // history, not backlog. `is_closed` is readonly and DERIVED from `status` by
  // `case_sla_defaults`, so it is closed the way the product closes one — by
  // moving the status — and NOT by writing the flag.
  //
  // ⚠️ It is closed on a second call rather than at insert, and that is
  // measured, not stylistic: `case_sla_defaults` treats a write with neither a
  // previous row nor a user id as a guest (web-to-case) submission, and the
  // guest branch strips `is_closed` without recomputing it. A userless insert
  // carrying `status: 'closed'` therefore stores `is_closed: false` — status
  // and flag contradicting each other — which would have put this row in the
  // triage set for a reason that has nothing to do with the rule under test.
  // On the update there IS a previous row, so the derivation runs.
  id.unowned_closed = await insert('crm_case', caseDoc('Unowned, closed'));
  await ql.update(
    'crm_case',
    { id: id.unowned_closed, status: 'closed', resolution: 'Duplicate of an earlier report.' },
    { context: SYS },
  );

  // The #1145 exclusion, and the reason it needed its own row: a RESOLVED
  // ownerless case used to satisfy `is_closed == false` — the flag is derived
  // as `status === 'closed'` and never flips on `resolved` — so it sat in the
  // triage tab forever AND carried an `edit` grant for every service agent.
  // Seeded `in_progress` first because `new → resolved` is not a declared
  // transition, then moved on a second call so the derivation runs against a
  // previous row (same reason as `unowned_closed` above).
  id.unowned_resolved = await insert('crm_case', caseDoc('Unowned, resolved', { status: 'in_progress' }));
  await ql.update(
    'crm_case',
    { id: id.unowned_resolved, status: 'resolved', resolution: 'Answered on the public thread.' },
    { context: SYS },
  );

  // ── the claim population (#1096's write half) ─────────────────────────
  // One row per boundary, because every claim case CONSUMES its row: a
  // successful claim gives the case an owner, and a second test reusing it
  // would be measuring an owned case. They are inserted HERE, inside the
  // empty-pool window, for the same reason as the three above — a row created
  // after the pool is staffed is round-robined onto an agent by
  // `case_auto_assign` and is not ownerless at all. That is also what gives
  // them the driver's genuine ownerless SHAPE (key absent on memory, column
  // NULL on SQL), which is the input `case_self_claim`'s guard 3 has to answer.
  id.claim_pickup = await insert('crm_case', caseDoc('Claimable — picked up'));
  id.claim_waiting = await insert('crm_case', caseDoc('Claimable — answered'));
  // Seeded already `waiting_customer` (an import/migration shape): the status
  // machine does not allow `new → waiting_support`, so the only realistic way
  // to reach that gesture is from a case that is already mid-conversation.
  id.claim_support = await insert('crm_case', caseDoc('Claimable — waiting on support', { status: 'waiting_customer' }));
  id.claim_escalate = await insert('crm_case', caseDoc('Escalated, not claimed'));
  // Likewise seeded `in_progress`: `new → resolved` is not a declared
  // transition, and resolving is the gesture being excluded, not tested.
  id.claim_resolve = await insert('crm_case', caseDoc('Resolved, not claimed', { status: 'in_progress' }));
  id.claim_system = await insert('crm_case', caseDoc('Touched by automation, not claimed'));
  id.claim_admin = await insert('crm_case', caseDoc('Picked up by an admin'));

  // ── the pool, staffed only now ────────────────────────────────────────
  // `sys_user_position.position` holds the position NAME (that is what
  // `expandPositionUsers` filters on) — an id here expands to nobody.
  for (const user of [id.agent, id.other]) {
    await insert('sys_user_position', { user_id: user, position: 'service_agent' });
  }
  const sets = await ql.find('sys_permission_set', { where: {} }, { context: SYS });
  const agentSet = (sets as AnyRec[]).find((s) => s.name === 'service_agent');
  for (const user of [id.agent, id.other]) {
    // `permission_set_id` ONLY. `sys_user_permission_set` declares no bare
    // `permission_set` column, and writing both keys — which a schemaless
    // in-memory driver accepts silently — is rejected outright by SQL:
    // "table sys_user_permission_set has no column named permission_set".
    await insert('sys_user_permission_set', { user_id: user, permission_set_id: agentSet?.id });
  }

  // ── the owned population ──────────────────────────────────────────────
  // `case_auto_assign` returns early when `owner_id` is already set, so these
  // land exactly where they are put.
  id.own_case = await insert('crm_case', caseDoc('Mine', { owner_id: id.agent }));
  id.other_case = await insert('crm_case', caseDoc("Somebody else's", { owner_id: id.other }));
  id.other_critical = await insert(
    'crm_case',
    caseDoc("Somebody else's, critical", { owner_id: id.other, priority: 'critical' }),
  );

  // Materialise the declared rules against the population just inserted (the
  // boot backfill ran on an empty database).
  const rules: AnyRec = kernel.getService('sharingRules');
  for (const rule of [RULE, 'case_escalation_sharing', 'case_director_sharing']) {
    // Reconciling a rule the stack does not declare is tolerated HERE and
    // nowhere else, so that deleting the rule under test produces the
    // INFORMATIVE red — "the agent sees zero unowned cases" — instead of a
    // harness crash in `beforeAll` that skips every assertion and proves
    // nothing. That is the reverse-verification lap this file is written to
    // support, and the tolerance costs no coverage: whether the rule really
    // seeded is asserted directly, per driver, by `the rule materialised share
    // rows`, which fails loudly on an empty share set.
    await rules.evaluateRule(rule, SYS).catch(() => undefined);
  }

  const agentCtx = await buildContextForUser(ql, id.agent);
  const adminCtx = await buildContextForUser(ql, id.admin);
  const byId = new Map(Object.entries(id).map(([label, value]) => [value, label]));

  const rawRow = async (object: string, rowId: string): Promise<AnyRec> => {
    const rows = await ql.find(object, { where: { id: rowId } }, { context: SYS });
    return (Array.isArray(rows) ? rows : [])[0] ?? {};
  };
  const writesAs = async (context: AnyRec, object: string, rowId: string, patch: AnyRec): Promise<string> => {
    try {
      await ql.update(object, { id: rowId, ...patch }, { context });
      return 'allowed';
    } catch (error: unknown) {
      return `denied: ${(error as AnyRec)?.name}`;
    }
  };

  return {
    kernel,
    ql,
    id,
    agentCtx,
    adminCtx,
    sees: async (object: string) => {
      const rows = await ql.find(object, { where: {} }, { context: agentCtx });
      return (Array.isArray(rows) ? rows : [])
        .map((r: AnyRec) => byId.get(String(r.id)) ?? String(r.id))
        .sort();
    },
    writes: (object: string, rowId: string, patch: AnyRec) => writesAs(agentCtx, object, rowId, patch),
    writesAs,
    raw: rawRow,
    ownerOf: async (rowId: string) => {
      const stored = (await rawRow('crm_case', rowId)).owner_id;
      return typeof stored === 'string' && stored ? stored : null;
    },
  };
}

/**
 * The two row shapes, as two real datasources.
 *
 * `memory` is the sparse one — the shape `driver-mongodb` also produces, and the
 * only place in the stack that exercises "the key is absent". `sqlite-wasm` is
 * the column-complete one, standing in for every SQL host: it goes through
 * `@objectstack/driver-sql`'s knex path, so the filter is lowered to real SQL
 * rather than evaluated in JS.
 */
const DRIVERS: Array<{ label: string; driver: string; config: AnyRec }> = [
  { label: 'driver-memory (sparse rows — the key is ABSENT)', driver: 'memory', config: {} },
  {
    label: 'sqlite-wasm (column-complete rows — the column is NULL)',
    driver: 'sqlite-wasm',
    config: { filename: ':memory:' },
  },
];

const fixtures = new Map<string, Fixture>();

beforeAll(async () => {
  for (const { driver, config } of DRIVERS) {
    fixtures.set(driver, await boot(driver, config));
  }
}, 240_000);

afterAll(async () => {
  for (const fixture of fixtures.values()) await fixture.kernel?.shutdown?.();
});

describe('the two drivers really do store different shapes', () => {
  it('memory omits the owner_id key; SQL materialises it as NULL', async () => {
    // Anti-vacuum for the whole file: if both drivers stored the same shape,
    // running the matrix twice would be one measurement repeated, and the
    // "totality" question this card turns on would go unasked.
    const sparse = await fixtures.get('memory')!.raw('crm_case', fixtures.get('memory')!.id.unowned_open);
    const complete = await fixtures
      .get('sqlite-wasm')!
      .raw('crm_case', fixtures.get('sqlite-wasm')!.id.unowned_open);

    expect(Object.keys(sparse), 'the memory fixture stored no ownerless case at all').toContain('subject');
    expect(
      'owner_id' in sparse,
      'driver-memory started materialising absent columns — the sparse shape this file ' +
        'exists to cover is no longer being exercised anywhere in the suite',
    ).toBe(false);

    expect(Object.keys(complete)).toContain('subject');
    expect(
      'owner_id' in complete,
      'the SQL fixture did not materialise owner_id — it is no longer the column-complete shape',
    ).toBe(true);
    expect(complete.owner_id ?? null).toBeNull();
  });
});

for (const { label, driver } of DRIVERS) {
  describe(`#1096 on ${label}`, () => {
    const F = () => fixtures.get(driver)!;

    it('the harness enforces — the agent is an ordinary service_agent', () => {
      const ctx = F().agentCtx;
      expect(ctx.permissions, 'the agent must carry its app profile').toContain('service_agent');
      expect(ctx.permissions).not.toContain('admin_full_access');
      expect(ctx.hasPlatformAdminGrant).toBe(false);
      expect(ctx.positions).toContain('service_agent');
    });

    it('the rule materialised share rows, and ONLY for the unowned open cases', async () => {
      const { ql, id } = F();
      const shares = await ql.find(
        'sys_record_share',
        { where: { object_name: 'crm_case', recipient_id: id.agent } },
        { context: SYS },
      );
      const byId = new Map(Object.entries(id).map(([k, v]) => [v, k]));
      const got = (shares as AnyRec[])
        .map((s) => `${byId.get(String(s.record_id)) ?? s.record_id}:${s.access_level}`)
        .sort();
      expect(
        got,
        'the triage rule seeded no share row, or seeded the wrong records — a declared rule ' +
          'that plugin-sharing could not compile is dropped silently (see test/sharing-seeding.test.ts)',
      ).toEqual([
        // The seven `claim_*` rows are #1096's write-half fixtures, one per
        // boundary. They are ordinary unowned open cases and the rule reaches
        // them for exactly that reason — which is itself worth seeing here,
        // because a claim is only interesting on a case the agent can reach.
        'claim_admin:edit',
        'claim_escalate:edit',
        'claim_pickup:edit',
        'claim_resolve:edit',
        'claim_support:edit',
        'claim_system:edit',
        'claim_waiting:edit',
        'unowned_critical:edit',
        'unowned_open:edit',
      ]);
    });

    it('an agent sees every unowned OPEN case — acceptance #1', async () => {
      // The defect this card reports, stated positively. `own_case` is the
      // positive control: without it, a run where crm_case were denied outright
      // would look the same as a run where the grant works.
      expect(
        await F().sees('crm_case'),
        'the Unassigned — triage tab is empty for the persona it is pinned for again',
      ).toEqual([
        'claim_admin',
        'claim_escalate',
        'claim_pickup',
        'claim_resolve',
        'claim_support',
        'claim_system',
        'claim_waiting',
        'own_case',
        'unowned_critical',
        'unowned_open',
      ]);
    });

    it('an agent sees NO case owned by someone else — acceptance #2', async () => {
      // The property that makes the grant safe, asserted as its own case rather
      // than left implicit in the list above: two of the three cases the other
      // agent owns are exactly the ones a wider grant would leak, and one of
      // them is `critical`, which the manager/director rules DO widen — to
      // positions this agent does not hold.
      const seen = await F().sees('crm_case');
      for (const hidden of ['other_case', 'other_critical']) {
        expect(seen, `${hidden} became visible to an agent who does not own it`).not.toContain(hidden);
      }
    });

    it('a CLOSED unowned case stays hidden — the deliberate exclusion', async () => {
      // The status exclusion is part of the predicate on purpose: an ownerless
      // case that is already closed is history, not backlog, and counting it
      // would stop the tab's row count meaning "work waiting for a human".
      expect(await F().sees('crm_case')).not.toContain('unowned_closed');
    });

    it('a RESOLVED unowned case stays hidden too — #1145, and this is a TIGHTENING', async () => {
      // ⚠️ This grant got NARROWER. Before #1145 the rule said
      // `is_closed == false`, and `is_closed` is derived as `status ===
      // 'closed'` — so it never flipped on `resolved` and every service agent
      // held `edit` on every resolved ownerless case, indefinitely. The rule
      // now says the same thing the load-balancing hooks and `case_sla_monitor`
      // say: the case is live work only while its status is neither `resolved`
      // nor `closed`.
      //
      // 🔴 If this goes green-to-red, agents have regained sight of finished
      // work — the tab's row count has stopped meaning "work waiting for a
      // human" again, which is the whole of #1145.
      const { ql, id, sees } = F();
      // The row really is in the state under test, and really is ownerless:
      // a fixture that failed to reach `resolved` would make this pass for the
      // wrong reason.
      const stored = await F().raw('crm_case', id.unowned_resolved);
      expect(stored.status, 'the resolved fixture is not resolved').toBe('resolved');
      expect(stored.owner_id ?? null, 'the resolved fixture acquired an owner').toBeNull();

      expect(await sees('crm_case')).not.toContain('unowned_resolved');

      const shares = await ql.find(
        'sys_record_share',
        { where: { object_name: 'crm_case', record_id: id.unowned_resolved } },
        { context: SYS },
      );
      expect(
        (shares as AnyRec[]).length,
        'the triage rule still grants edit on a RESOLVED ownerless case — the tightening #1145 ' +
          'ruled did not reach the seeded shares',
      ).toBe(0);
    });

    it('the share carries real EDIT — an agent can work the case they can now see', async () => {
      // `accessLevel: 'edit'` is not decoration: triage means setting a
      // priority, linking the account, leaving a note. The positive half of the
      // write side, and the control for the denial pinned below — without it,
      // "the agent cannot write owner_id" would be indistinguishable from "the
      // share grants no write at all".
      expect(
        await F().writes('crm_case', F().id.unowned_open, { internal_notes: 'Triaging — customer called back.' }),
        'the triage share stopped granting edit, so an agent can see the backlog and touch none of it',
      ).toBe('allowed');
    });

    it('writing owner_id BY HAND is still denied — to self, to a third party, on any case', async () => {
      // ═══ #1096, second pass: this pin used to be the card's open half ═════
      //
      // It shipped in #1134 reading "⚠️ taking ownership is DENIED by the
      // transfer gate — acceptance #1's write half is OPEN", and it carried
      // this instruction:
      //
      //   🔴 WHEN THIS GOES RED, that is the queue-pull story being completed
      //   — by a claim seam or by a transfer grant. Do not relax it: take it
      //   back to #1096, which is where the seam gets decided.
      //
      // The seam landed (`case_self_claim`) and this pin did NOT go red, which
      // is the whole shape of the answer rather than an oversight. MEASURED
      // 2026-08-12 on the full stack (reading D2 in `_case-assignment.ts`): the
      // #3004 gate rejects a payload carrying `owner_id` INSIDE the middleware,
      // upstream of the hook phase — a `beforeUpdate` hook that deletes the key
      // does not fire at all, and the write is still denied. No hook can
      // approve a write it never sees.
      //
      // So the claim is not a VALUE an agent supplies and something adjudicates.
      // It is a GESTURE the hook reads, and the hook's only possible output is
      // the caller's own id. This test is now the safety half of that: the hand
      // route stays shut in every direction, including the one a looser design
      // would have opened — naming a THIRD PARTY on a case nobody owns.
      //
      // 🔴 If any of these goes green, an ownership grant has appeared on
      // `service_agent` (or the gate moved). That is a permission-model change
      // and belongs on its own card — do not absorb it here.
      const { id, writes, ownerOf } = F();
      expect(
        await writes('crm_case', id.unowned_open, { owner_id: id.agent }),
        'the hand-written ownership route opened up — an agent can now name an owner directly',
      ).toBe('denied: PermissionDeniedError');
      expect(
        await writes('crm_case', id.unowned_open, { owner_id: id.other }),
        'an agent assigned an unowned case to SOMEBODY ELSE — the claim seam is supposed to make ' +
          'that unspellable, and the gate is supposed to refuse it',
      ).toBe('denied: PermissionDeniedError');
      expect(
        await writes('crm_case', id.other_case, { owner_id: id.agent }),
        'an agent grabbed a case owned by somebody else — the transfer gate is not holding',
      ).toBe('denied: PermissionDeniedError');
      // Nor can the value ride along with the gesture that IS allowed.
      expect(
        await writes('crm_case', id.unowned_open, { status: 'in_progress', owner_id: id.agent }),
        'owner_id smuggled alongside a claim gesture was accepted',
      ).toBe('denied: PermissionDeniedError');
      // A denied claim leaves nothing behind: the case is still unowned, so no
      // half of the refused write landed.
      expect(await ownerOf(id.unowned_open), 'a denied ownership write partially applied').toBeNull();
    });

    it('the grant is SELF-LIMITING — it evaporates the moment the case has an owner', async () => {
      // The property the whole option-A argument rests on: the rule cannot
      // accumulate a permission surface, because its own condition destroys it.
      // The claim is performed by the SYSTEM here, not by the agent, only
      // because the agent cannot yet perform it (see the pin above) — what is
      // under test is the rule's reaction to a case acquiring an owner, not who
      // performed the write.
      const { id, ql, kernel, sees, raw } = F();
      await ql.update('crm_case', { id: id.unowned_critical, owner_id: id.agent }, { context: SYS });
      expect(String((await raw('crm_case', id.unowned_critical)).owner_id)).toBe(id.agent);

      await kernel.getService('sharingRules').evaluateRule(RULE, SYS);
      const shares = await ql.find(
        'sys_record_share',
        { where: { object_name: 'crm_case', record_id: id.unowned_critical, recipient_id: id.agent } },
        { context: SYS },
      );
      expect(
        (shares as AnyRec[]).length,
        'the share survived the case acquiring an owner — the grant is no longer self-limiting, ' +
          'and a case that passed through triage stays reachable through the rule forever',
      ).toBe(0);

      // …and the OTHER agent, who never owned it, loses sight of it entirely —
      // the same reconcile, from the side that proves the revocation is real
      // rather than the row merely being re-reached by its new owner.
      const otherShares = await ql.find(
        'sys_record_share',
        { where: { object_name: 'crm_case', record_id: id.unowned_critical, recipient_id: id.other } },
        { context: SYS },
      );
      expect((otherShares as AnyRec[]).length).toBe(0);
      expect(await sees('crm_case')).toContain('unowned_critical'); // now theirs, by own-scope
    });

    // ══════════ #1096, write half — claiming a case out of triage ══════════
    //
    // Everything above is about SIGHT. These are about TAKING, and they run
    // last because every one of them consumes its fixture: a claimed case has
    // an owner, and re-using it would be measuring a different question.
    //
    // ⚠️ How the "before" state is read matters here. `ownerOf()` copies a
    // STRING (or null) out of a fresh read, never a row object: the in-memory
    // driver can hand back the object it stores, so a row captured into a
    // variable and re-inspected after the write is the same reference the write
    // mutated — a comparison against itself, green on unfixed code (#1132).
    describe('the write half — taking ownership', () => {
      it('an agent CLAIMS an unowned open case by picking it up — acceptance #1', async () => {
        const { id, writes, ownerOf, raw, sees } = F();

        // The input shape this driver actually presents to the seam's guard 3.
        // Asserted per driver, so a claim on the sparse (key-absent) shape and
        // a claim on the column-complete (NULL) shape are two measurements and
        // never one repeated — the same reason the whole matrix runs twice.
        const stored = await raw('crm_case', id.claim_pickup);
        expect(
          'owner_id' in stored,
          driver === 'memory'
            ? 'the memory fixture materialised owner_id — the absent-key shape is no longer covered'
            : 'the SQL fixture did not materialise owner_id — the NULL-column shape is no longer covered',
        ).toBe(driver !== 'memory');
        expect(await ownerOf(id.claim_pickup), 'the fixture was not ownerless to begin with').toBeNull();

        expect(
          await writes('crm_case', id.claim_pickup, { status: 'in_progress' }),
          'an agent could not pick up a case from their own triage tab',
        ).toBe('allowed');

        expect(
          await ownerOf(id.claim_pickup),
          'the case was not claimed — #1096 acceptance #1 is back to half-delivered: the tab has ' +
            'rows and nobody can take one',
        ).toBe(id.agent);
        expect((await raw('crm_case', id.claim_pickup)).status, 'the gesture itself did not land').toBe('in_progress');
        // …and it is still theirs to work, now by ordinary own-scope rather
        // than by the triage grant.
        expect(await sees('crm_case')).toContain('claim_pickup');
      });

      it('the claim gesture is exactly CLAIMABLE_TARGET_STATUSES — every member, driven', async () => {
        // The parity pin. The handler spells these three strings INLINE (the L2
        // sandbox gives it no module scope), so the exported constant and the
        // body can only be kept in step behaviourally: every member is driven
        // through a real write here, and the two exclusions below are driven too.
        const { id, writes, ownerOf } = F();
        expect([...CLAIMABLE_TARGET_STATUSES].sort()).toEqual(['in_progress', 'waiting_customer', 'waiting_support']);

        expect(await writes('crm_case', id.claim_waiting, { status: 'waiting_customer' })).toBe('allowed');
        expect(
          await ownerOf(id.claim_waiting),
          'answering the customer on an unowned case did not claim it, so it stays in the triage ' +
            'tab while an agent is already handling it',
        ).toBe(id.agent);

        expect(await writes('crm_case', id.claim_support, { status: 'waiting_support' })).toBe('allowed');
        expect(await ownerOf(id.claim_support)).toBe(id.agent);
      });

      it('ESCALATING is not claiming — that transition belongs to the hand-off', async () => {
        // `case_escalation_reassign` (#1070) owns `→ escalated` and routes the
        // case to the `service_manager` pool. Two hooks answering "who owns
        // this case" for one status change is the shape `_case-assignment.ts`
        // exists to prevent, so `escalated` is deliberately not claimable. The
        // manager pool is unstaffed in this fixture — the first-install norm —
        // so the hand-off is a no-op and the case stays ownerless, which is
        // exactly what makes this a clean reading of OUR hook standing down.
        const { id, writes, ownerOf, raw } = F();
        expect(await writes('crm_case', id.claim_escalate, { status: 'escalated' })).toBe('allowed');
        expect((await raw('crm_case', id.claim_escalate)).status).toBe('escalated');
        expect(
          await ownerOf(id.claim_escalate),
          'escalating an unowned case claimed it for the escalating agent — the escalation ' +
            'hand-off and the claim seam are both writing owner_id on the same transition',
        ).toBeNull();
      });

      it('RESOLVING is not claiming — finishing a case is not picking it up', async () => {
        // ⚠️ This is also #1145's claim-seam check, and it is the reason the
        // tightening does not break anything. Record access is resolved against
        // the STORED row, so the case is still OPEN at the moment of this
        // write — the agent reaches it, resolves it, and #1143's "finishing a
        // case is not picking it up" is untouched. What #1145 changes is what
        // happens NEXT: the row leaves the grant instead of staying in it.
        const { id, ql, kernel, writes, ownerOf } = F();
        expect(
          await writes('crm_case', id.claim_resolve, { status: 'resolved' }),
          'an agent can no longer resolve an unowned case out of triage — #1145 was supposed to ' +
            'tighten what happens AFTER the resolve, not block the resolve itself',
        ).toBe('allowed');
        expect(
          await ownerOf(id.claim_resolve),
          'resolving an unowned case claimed it — the ownership column should stay honest about ' +
            'the fact that nobody ever took the work',
        ).toBeNull();

        // …and now the row is no longer live work, so the grant lets go of it.
        // Before #1145 it stayed shared forever, because the derived flag it
        // keyed on never flips on `resolved`.
        await kernel.getService('sharingRules').evaluateRule(RULE, SYS);
        const shares = await ql.find(
          'sys_record_share',
          { where: { object_name: 'crm_case', record_id: id.claim_resolve } },
          { context: SYS },
        );
        expect(
          (shares as AnyRec[]).length,
          'a case an agent resolved out of triage stayed shared with every agent — the resolved ' +
            'ownerless row is back to reading as backlog',
        ).toBe(0);
      });

      it('an unowned CLOSED case cannot be claimed — the record-level half', async () => {
        // Layer one: the sharing rule's status exclusion never grants the agent
        // the row, so the write is refused before any hook runs. This is
        // a record-level FORBIDDEN, not the transfer gate's PermissionDenied —
        // a different refusal from the one pinned above, which is why it is
        // matched loosely and asserted on the stored row as well.
        const { id, writes, ownerOf } = F();
        expect(
          await writes('crm_case', id.unowned_closed, { status: 'in_progress' }),
          'a closed unowned case became writable by an agent — the triage grant is leaking ' +
            'past its own predicate',
        ).toMatch(/^denied/);
        expect(await ownerOf(id.unowned_closed)).toBeNull();
      });

      it('the closed guard is the SEAM’s too, not only the sharing rule’s', async () => {
        // Layer two, and the reason it needs its own case: the denial above
        // proves the agent cannot REACH the row, which would look identical if
        // `case_self_claim` had no closed guard at all. So the same question is
        // asked by an actor that CAN reach it, with a control that differs in
        // one property only — whether the case is closed.
        const { id, adminCtx, writesAs, ownerOf } = F();
        expect(adminCtx.hasPlatformAdminGrant, 'the admin cannot reach the row either — this case proves nothing').toBe(true);

        expect(await writesAs(adminCtx, 'crm_case', id.unowned_closed, { status: 'in_progress' })).toBe('allowed');
        expect(
          await ownerOf(id.unowned_closed),
          'the seam claimed a CLOSED case for whoever touched it — history is not backlog, and ' +
            'the guard that says so has gone',
        ).toBeNull();

        // The control: same actor, same payload, an OPEN case. It claims — so
        // the refusal above is about closedness and not about the caller.
        expect(await writesAs(adminCtx, 'crm_case', id.claim_admin, { status: 'in_progress' })).toBe('allowed');
        expect(
          await ownerOf(id.claim_admin),
          'the control did not claim either, so the closed case proves nothing about the guard',
        ).toBe(id.admin);
      });

      it('a write with no user never claims — automation leaves the backlog alone', async () => {
        // #596's no-op is load-bearing: an ownerless case must STAY ownerless
        // and stay in the tab when nothing human has picked it up. A seam that
        // claimed on any write would hand the whole backlog to whichever
        // scheduled sweep touched it first.
        const { id, ql, ownerOf } = F();
        await ql.update('crm_case', { id: id.claim_system, status: 'in_progress' }, { context: SYS });
        expect(
          await ownerOf(id.claim_system),
          'a system write claimed the case — automation is now taking ownership of the triage backlog',
        ).toBeNull();
      });

      it('claiming is idempotent, and it makes the triage grant evaporate', async () => {
        // Two properties on the case claimed in the first test above.
        //
        // (1) Idempotence: the seam cannot move a case a second time, because
        //     its own success gives the row an owner and guard 3 then stops it.
        //     That is what keeps it off the re-entrancy surface this file's
        //     neighbourhood has been bitten on twice.
        // (2) The claim closes the loop with the read half: the grant that let
        //     the agent see the case destroys itself the moment they take it.
        const { id, ql, kernel, writes, ownerOf } = F();
        expect(await ownerOf(id.claim_pickup), 'the earlier claim did not stick').toBe(id.agent);

        expect(await writes('crm_case', id.claim_pickup, { status: 'waiting_customer' })).toBe('allowed');
        expect(
          await ownerOf(id.claim_pickup),
          'a second worked-status move re-ran the claim — on a case with an owner, the seam must be inert',
        ).toBe(id.agent);

        await kernel.getService('sharingRules').evaluateRule(RULE, SYS);
        const shares = await ql.find(
          'sys_record_share',
          { where: { object_name: 'crm_case', record_id: id.claim_pickup } },
          { context: SYS },
        );
        expect(
          (shares as AnyRec[]).length,
          'the triage share outlived the claim — a claimed case stays reachable by every other ' +
            'agent through the rule',
        ).toBe(0);
      });
    });
  });
}

/**
 * The seam's registered shape (#1096).
 *
 * Metadata rather than behaviour, and here rather than in a shape-only suite
 * because both halves of the priority argument are measured in this file: 260
 * puts `case_self_claim` AFTER `case_escalation_reassign` (250), and the
 * escalation case above is what proves the two do not both write.
 */
describe('case_self_claim is registered on the seam it was measured on', () => {
  const claim = (caseHooks as AnyRec[]).find((h) => h.name === 'case_self_claim');

  it('exists, on beforeUpdate, after the escalation hand-off', () => {
    expect(claim, 'the claim hook is not registered on crm_case at all').toBeTruthy();
    expect(claim!.object).toBe('crm_case');
    expect(
      claim!.events,
      'the claim seam moved off beforeUpdate — every other phase is VISIBLE to the #3004 transfer ' +
        'gate (readings C and D in _case-assignment.ts), so the claim would start needing ' +
        'crm_case.allowTransfer on service_agent',
    ).toEqual(['beforeUpdate']);

    const escalation = (caseHooks as AnyRec[]).find((h) => h.name === 'case_escalation_reassign');
    expect(
      claim!.priority,
      'the claim hook must run after the escalation hand-off, so an escalation that has already ' +
        'chosen an owner is never second-guessed',
    ).toBeGreaterThan(escalation!.priority as number);
  });
});

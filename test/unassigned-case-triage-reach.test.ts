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
  /** What `agent` can see of `object`, as sorted fixture labels. */
  sees: (object: string) => Promise<string[]>;
  /** Attempt an agent-context update; returns a stable outcome label. */
  writes: (object: string, rowId: string, patch: AnyRec) => Promise<string>;
  /** The stored row as the driver hands it back, under a system context. */
  raw: (object: string, rowId: string) => Promise<AnyRec>;
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
  await insert('sys_user', { name: 'Platform Admin', email: 'admin@triage-reach.test' });
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
  const byId = new Map(Object.entries(id).map(([label, value]) => [value, label]));

  return {
    kernel,
    ql,
    id,
    agentCtx,
    sees: async (object: string) => {
      const rows = await ql.find(object, { where: {} }, { context: agentCtx });
      return (Array.isArray(rows) ? rows : [])
        .map((r: AnyRec) => byId.get(String(r.id)) ?? String(r.id))
        .sort();
    },
    writes: async (object: string, rowId: string, patch: AnyRec) => {
      try {
        await ql.update(object, { id: rowId, ...patch }, { context: agentCtx });
        return 'allowed';
      } catch (error: unknown) {
        return `denied: ${(error as AnyRec)?.name}`;
      }
    },
    raw: async (object: string, rowId: string) => {
      const rows = await ql.find(object, { where: { id: rowId } }, { context: SYS });
      return (Array.isArray(rows) ? rows : [])[0] ?? {};
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
      ).toEqual(['unowned_critical:edit', 'unowned_open:edit']);
    });

    it('an agent sees every unowned OPEN case — acceptance #1', async () => {
      // The defect this card reports, stated positively. `own_case` is the
      // positive control: without it, a run where crm_case were denied outright
      // would look the same as a run where the grant works.
      expect(
        await F().sees('crm_case'),
        'the Unassigned — triage tab is empty for the persona it is pinned for again',
      ).toEqual(['own_case', 'unowned_critical', 'unowned_open']);
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
      // `is_closed == false` is part of the predicate on purpose: an ownerless
      // case that is already closed is history, not backlog, and counting it
      // would stop the tab's row count meaning "work waiting for a human".
      expect(await F().sees('crm_case')).not.toContain('unowned_closed');
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

    it('⚠️ taking ownership is DENIED by the transfer gate — acceptance #1’s write half is OPEN', async () => {
      // MEASURED, and it is the finding this card turns on. The dispatch
      // presumed the sharing rule alone would deliver "sees them and can take
      // ownership". The read half it does deliver. The write half it cannot:
      // `owner_id` is system-managed, and the platform's #3004 transfer gate
      // refuses ANY ownership change on update without `allowTransfer` or
      // `modifyAllRecords` — it does not exempt assigning to YOURSELF, and it
      // does not exempt a record that currently has NO owner:
      //
      //   [Security] Access denied: 'owner_id' on 'crm_case' is system-managed
      //   — changing record ownership on update requires the transfer grant
      //   (allowTransfer or modifyAllRecords)
      //
      // `service_agent` holds `allowTransfer` on `crm_task` ONLY, deliberately
      // (`src/profiles/service-agent.profile.ts`): granting it on `crm_case`
      // would let an agent reassign any case they can edit, which is a
      // permission-model widening the #1096 ruling did not take. So this is
      // pinned as the measured status quo rather than "fixed" here.
      //
      // 🔴 WHEN THIS GOES RED, that is the queue-pull story being completed —
      // by a claim seam or by a transfer grant. Do not relax it: take it back
      // to #1096, which is where the seam gets decided.
      const { id, writes } = F();
      expect(
        await writes('crm_case', id.unowned_open, { owner_id: id.agent }),
        'claiming an unowned case became possible — #1096’s open half has been answered ' +
          'somewhere; update the card and this pin together',
      ).toBe('denied: PermissionDeniedError');
      expect(
        await writes('crm_case', id.other_case, { owner_id: id.agent }),
        'an agent grabbed a case owned by somebody else — the transfer gate is not holding',
      ).toBe('denied: PermissionDeniedError');
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
  });
}

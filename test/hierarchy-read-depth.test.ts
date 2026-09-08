// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectKernel } from '@objectstack/core';
import { DefaultDatasourcePlugin, AppPlugin } from '@objectstack/runtime';
import { ObjectQLPlugin } from '@objectstack/objectql';
import { MetadataPlugin } from '@objectstack/metadata';
import {
  SecurityPlugin,
  PermissionEvaluator,
  appDefaultPermissionSetName,
  buildContextForUser,
} from '@objectstack/plugin-security';
import { SharingServicePlugin } from '@objectstack/plugin-sharing';
import { tenancyProbe } from './helpers/tenancy-probe';
import { defineStack, PLATFORM_CAPABILITY_PROVIDERS } from '@objectstack/spec';
import stack from '../objectstack.config';

/**
 * The READ half of the hierarchy-scope edition boundary (#1378) — the
 * counterpart of `test/contract-write-depth.test.ts`.
 *
 * ### What this file states
 *
 * On the community edition a hierarchy-valued `readScope` resolves
 * **owner-only**: the depth is computed exactly as declared, and then
 * `SharingService.resolveOwnerScopeIds` fails CLOSED to the caller alone
 * because the `hierarchy-scope-resolver` service ships only in
 * `@objectstack/security-enterprise`, which this repo does not depend on.
 *
 * That is the same boundary `contract-write-depth.test.ts` pins for `writeScope`
 * on `crm_contract`. The write half could pin it through the app's own
 * declaration, because the app authors one (`sales_manager.crm_contract.
 * writeScope = 'own_and_reports'`). The read half has no such declaration and
 * — per the #1378 ruling of 2026-09-08 — deliberately gains none, so the grants
 * below are **throwaway permission sets created inside this test**. No profile
 * is touched by this file, and none may be to satisfy it.
 *
 * ### Why the app authors no hierarchy `readScope` — the amendment, measured
 *
 * The 2026-08-31 ruling on #1378 named an action: give `sales_manager` a
 * `crm_opportunity.readScope` of `own_and_reports`. It was measured **inert**
 * and the ruling was amended on 2026-09-08. The mechanism is asserted in
 * `a hierarchy readScope beside viewAllRecords: true is never consulted` below,
 * and it is this: `PermissionEvaluator.getEffectiveScope` short-circuits to
 * `'org'` on `viewAllRecords || modifyAllRecords` (`@objectstack/plugin-security`
 * 17.3.0, `dist/index.mjs:1996`) one line BEFORE it reads `op.readScope`
 * (`dist/index.mjs:1998`) — and that line 1998 is the only runtime read of
 * `op.readScope` in any installed `@objectstack` package. `sales_manager` holds
 * `viewAllRecords: true` on `crm_opportunity`, so a `readScope` written there
 * would be stored, reported by a capability census as coverage, and never once
 * consulted. The platform accepts it with no diagnostic; that trap is filed
 * upstream as objectstack-ai/objectstack#16870 and is not compensated for here.
 *
 * ### ⭐ What would make this test WRONG — it is built to be falsifiable
 *
 * A pin that merely asserted "owner-only" would pass on any engine and prove
 * nothing. Every case below is arranged so the PRESENCE of the enterprise
 * resolver flips it:
 *
 *  1. **An enterprise-edition rig** — install `@objectstack/security-enterprise`
 *     and let it register `hierarchy-scope-resolver`. Then
 *     `resolveOwnerScopeIds` returns the manager's report chain,
 *     `buildReadFilter` widens `owner_id IN (…)`, and the hierarchy probe reads
 *     **two** deals instead of one. Cases `no hierarchy-scope resolver is
 *     registered`, `the manager reads only their OWN deal` and `own_and_reports
 *     conveys nothing beyond the own baseline` all go red together. This is the
 *     reversal path the ruling names, and it is the correct way for this file
 *     to fail: the pin is then obsolete and should be rewritten for the
 *     enterprise reality, not deleted.
 *  2. **The platform moving hierarchy resolution into the open edition** — the
 *     capability-registry case notices, read off the platform's own vocabulary
 *     rather than off this app's beliefs.
 *  3. **`resolveOwnerScopeIds` ceasing to fail closed** — if a hierarchy scope
 *     ever widened with no resolver installed, the hierarchy probe would see
 *     the report's deal here. That is a security regression to report upstream,
 *     ⛔ not a stale expectation to relax.
 *  4. **`crm_opportunity` losing `sharingModel: 'private'` or its owner field** —
 *     `buildReadFilter` abstains on both, every probe would see all five deals,
 *     and the subject of this pin would have moved out from under it.
 *
 * The fixtures are wired so that none of those can be confused with missing
 * data: the report's `manager_id` really points at the hierarchy probe's
 * manager (asserted by read-back), so the one row it sees is a statement about
 * the absent resolver and not about an unwired chain.
 */

type AnyRec = Record<string, any>;

process.env.OS_REGISTRY_LOG ??= 'silent';

const SYS = { isSystem: true } as AnyRec;

/** ADR-0057 hierarchy scopes — the values that need the enterprise resolver. */
const HIERARCHY_SCOPES = new Set(['unit', 'unit_and_below', 'own_and_reports']);

/**
 * The three throwaway grants. They exist only as rows this test inserts into
 * `sys_permission_set`; ⛔ none of them is authored in `src/profiles/`, and the
 * #1378 ruling forbids adding one there. Each differs from the next in exactly
 * one field, so a difference in what their holders can read is attributable.
 */
const PROBE_GRANTS = {
  // THE subject: the depth the app would declare if a hierarchy read were
  // authorable here.
  probe_read_hierarchy: {
    allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false,
    viewAllRecords: false, modifyAllRecords: false,
    readScope: 'own_and_reports' as const,
  },
  // The `own` baseline, for the comparison that gives the pin its edge: unset
  // `readScope` is `own` (`getEffectiveScope`'s documented default).
  probe_read_owner_only: {
    allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false,
    viewAllRecords: false, modifyAllRecords: false,
  },
  // The control that shows narrowing is DETECTABLE by this harness: the same
  // rig, one bit different, sees every seeded row.
  probe_read_org_wide: {
    allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false,
    viewAllRecords: true, modifyAllRecords: false,
  },
} as const;

let kernel: AnyRec;
let ql: AnyRec;
const id: Record<string, string> = {};
const ctx: Record<string, AnyRec> = {};

const insert = async (object: string, doc: AnyRec): Promise<string> => {
  const row = await ql.insert(object, doc, { context: SYS });
  return String(row?.id ?? row?.record?.id);
};

/** Deal NAMES the given principal can read, sorted — the unit every arm reports in. */
const dealsVisibleTo = async (principal: AnyRec): Promise<string[]> => {
  const rows = (await ql.find(
    'crm_opportunity', { where: {}, fields: ['id', 'name', 'owner_id'] }, { context: principal },
  )) as AnyRec[];
  return rows.map((r) => String(r.name)).sort();
};

// ── the vocabulary, and why no profile declares this ────────────────────
// Static: these need no kernel, so a change in the platform's edition
// vocabulary is reported as itself rather than as a puzzling row count.

describe('the hierarchy READ capability in the platform vocabulary (#1378)', () => {
  it('hierarchy-security is an ENTERPRISE capability, provided by one package', () => {
    // Read off the platform's own registry. If ObjectStack ever moves the
    // resolver into the open edition, this is the case that notices — and the
    // whole premise of this file changes with it.
    const provider = (PLATFORM_CAPABILITY_PROVIDERS as AnyRec)['hierarchy-security'];
    expect(provider?.edition).toBe('enterprise');
    expect(provider?.package).toBe('@objectstack/security-enterprise');
  });

  it('the app requires the capability and authors NO hierarchy read scope', () => {
    // Both halves of the #1378 ruling, as one assertion:
    //   ⛔ nothing is removed from `requires[]` (the 2026-08-31 refusal stands);
    //   ⛔ no hierarchy `readScope` is declared in any profile.
    // The second is why the grants in this file are throwaways. If a future
    // card authors a hierarchy read scope for real, this case is where it
    // announces itself, and this file is the argument it has to answer:
    // measure the grant first — beside `viewAllRecords: true` the key is never
    // read (next case), and without the enterprise resolver it never widens
    // (the runtime block below).
    expect((stack as AnyRec).requires).toContain('hierarchy-security');

    const authoredReads: string[] = [];
    const authoredWrites: string[] = [];
    for (const ps of ((stack as AnyRec).permissions ?? []) as AnyRec[]) {
      for (const [objName, grant] of Object.entries((ps.objects ?? {}) as Record<string, AnyRec>)) {
        if (HIERARCHY_SCOPES.has(grant?.readScope)) authoredReads.push(`${ps.name}.${objName}`);
        if (HIERARCHY_SCOPES.has(grant?.writeScope)) authoredWrites.push(`${ps.name}.${objName}`);
      }
    }
    expect(authoredReads, 'no profile may declare a hierarchy readScope (#1378 ruling)').toEqual([]);
    // The write half is declared, and `contract-write-depth.test.ts` pins it.
    // Named here so that dropping it does not quietly leave this file as the
    // app's only statement about hierarchy scopes.
    expect(authoredWrites).toEqual(['sales_manager.crm_contract']);
  });

  it('a hierarchy readScope beside viewAllRecords: true would never be consulted', () => {
    // ⭐ THE MEASUREMENT THAT AMENDED THE 2026-08-31 RULING. `getEffectiveScope`
    // returns 'org' on `viewAllRecords || modifyAllRecords` BEFORE it reads
    // `readScope` (@objectstack/plugin-security 17.3.0, dist/index.mjs:1996 vs
    // :1998), so on the grant the earlier ruling named the key is inert: stored,
    // counted by a capability census as coverage, never once read.
    const evaluator = new PermissionEvaluator() as AnyRec;
    const salesManager = ((stack as AnyRec).permissions as AnyRec[])
      .find((p) => p.name === 'sales_manager') as AnyRec;
    expect(salesManager?.objects?.crm_opportunity?.viewAllRecords, 'the premise of this case')
      .toBe(true);

    const today = evaluator.getEffectiveScope(
      'read', 'crm_opportunity', [salesManager], { isPrivate: true },
    );
    // The counterfactual the ruling refused, spliced in HERE rather than in the
    // profile — this is what "measured inert" means, kept reproducible.
    const withReadScope = {
      ...salesManager,
      objects: {
        ...salesManager.objects,
        crm_opportunity: { ...salesManager.objects.crm_opportunity, readScope: 'own_and_reports' },
      },
    };
    const ruled = evaluator.getEffectiveScope(
      'read', 'crm_opportunity', [withReadScope], { isPrivate: true },
    );
    expect(today).toBe('org');
    expect(ruled, 'adding the readScope changes nothing — it is short-circuited').toBe('org');

    // And the same key IS read the moment the bypass is off — so the case above
    // is about the short-circuit, not about `readScope` being ignored outright.
    const narrowed = evaluator.getEffectiveScope(
      'read', 'crm_opportunity',
      [{ name: 'probe', objects: { crm_opportunity: PROBE_GRANTS.probe_read_hierarchy } }],
      { isPrivate: true },
    );
    expect(narrowed).toBe('own_and_reports');
  });
});

describe('the spec gate accepts the read half and refuses the half (#1378)', () => {
  // `defineStack` THROWS on a hierarchy scope with no capability declared —
  // pinned for `readScope` as `contract-write-depth.test.ts` pins it for
  // `writeScope`, so the `requires` line cannot be deleted as "unused" without
  // a red test naming exactly why it exists.
  const minimal = (requires: string[]) => ({
    manifest: {
      id: 'app.objectstack.hierarchy-read-gate-probe',
      namespace: 'probe',
      version: '1.0.0',
      type: 'app' as const,
      name: 'Hierarchy Read Gate Probe',
      engines: { protocol: '^17.0.0-rc.6' },
    },
    requires,
    objects: [],
    permissions: [
      {
        name: 'probe_reader',
        label: 'Probe Reader',
        objects: { crm_opportunity: { ...PROBE_GRANTS.probe_read_hierarchy } },
      },
    ],
  });

  it('accepts a readScope of own_and_reports when hierarchy-security is declared', () => {
    expect(() => defineStack(minimal(['hierarchy-security']) as never)).not.toThrow();
  });

  it('refuses it when it is not — naming the package AND the fail-closed behaviour', () => {
    let thrown: Error | undefined;
    try {
      defineStack(minimal([]) as never);
    } catch (err) {
      thrown = err as Error;
    }
    expect(thrown, 'the gate must refuse an undeclared hierarchy read scope').toBeDefined();
    expect(thrown?.message).toContain('hierarchy-scope capability validation failed');
    expect(thrown?.message).toContain("readScope='own_and_reports'");
    expect(thrown?.message).toContain('@objectstack/security-enterprise');
    // ⭐ The platform's own diagnostic states the behaviour this file then
    // measures for real, two describe blocks down. The pin and the platform
    // say the same sentence, and the runtime block is what proves it true here.
    expect(thrown?.message).toContain('fail closed to owner-only');
  });
});

// ── what a hierarchy readScope resolves to on THIS edition ──────────────

beforeAll(async () => {
  kernel = new ObjectKernel({ logger: { level: 'silent' } } as never);
  await kernel.use(new DefaultDatasourcePlugin({ driver: 'memory', config: {} } as never));
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
  // NB: no `hierarchy-scope-resolver` is registered — that service ships in
  // `@objectstack/security-enterprise`, which this repo does not depend on.
  // That absence is the whole subject of this file.
  // Mounted BEFORE SharingServicePlugin, which reads the posture during its own
  // boot — see `test/helpers/tenancy-probe.ts`.
  await kernel.use(tenancyProbe('single') as never);
  await kernel.use(new SharingServicePlugin());
  await kernel.bootstrap();
  ql = kernel.getService('objectql');

  // The FIRST human user is auto-promoted to platform admin at boot and would
  // bypass every gate below — burn that promotion on a throwaway.
  await insert('sys_user', { name: 'Platform Admin', email: 'admin@hierarchy-read.test' });

  // Three managers, one per throwaway grant, so the three arms differ ONLY in
  // the grant and never in who is reading or in how the rows are owned.
  id.mgrHier = await insert('sys_user', { name: 'Hierarchy Manager', email: 'hier@hierarchy-read.test' });
  id.mgrOwn = await insert('sys_user', { name: 'Baseline Manager', email: 'own@hierarchy-read.test' });
  id.mgrOrg = await insert('sys_user', { name: 'Org-wide Manager', email: 'org@hierarchy-read.test' });
  // One direct report each. `manager_id` is the chain `own_and_reports` is
  // defined over (`@objectstack/spec`: "me + my sys_user.manager_id report
  // chain"), and it is wired for real so that owner-only below is a reading of
  // the ABSENT RESOLVER rather than of absent data.
  id.repHier = await insert('sys_user', {
    name: 'Hierarchy Report', email: 'hier-rep@hierarchy-read.test', manager_id: id.mgrHier,
  });
  id.repOwn = await insert('sys_user', {
    name: 'Baseline Report', email: 'own-rep@hierarchy-read.test', manager_id: id.mgrOwn,
  });
  id.outsider = await insert('sys_user', { name: 'Outsider', email: 'out@hierarchy-read.test' });

  // The throwaway permission sets, created as DATA. ⛔ Nothing here is authored
  // in `src/profiles/`; #1378 rules that no profile may gain a hierarchy
  // readScope, and this file must not become the reason one does.
  for (const [name, grant] of Object.entries(PROBE_GRANTS)) {
    const setId = await insert('sys_permission_set', {
      name,
      label: `#1378 probe — ${name}`,
      description: 'Throwaway grant created by test/hierarchy-read-depth.test.ts. Not an app profile.',
      object_permissions: JSON.stringify({ crm_opportunity: grant }),
      active: true,
    });
    id[`set_${name}`] = setId;
  }
  const bind = async (userId: string, setName: string) => {
    await insert('sys_user_permission_set', {
      user_id: userId,
      permission_set_id: id[`set_${setName}`],
    });
  };
  await bind(id.mgrHier, 'probe_read_hierarchy');
  await bind(id.mgrOwn, 'probe_read_owner_only');
  await bind(id.mgrOrg, 'probe_read_org_wide');

  const account = await insert('crm_account', {
    name: 'Depth Co', type: 'customer', is_active: true, owner_id: id.mgrHier,
    billing_address: { country: 'US' },
  });

  const deal = (name: string, owner: string) => ({
    name, crm_account: account, owner_id: owner, stage: 'negotiation',
    amount: 1000, close_date: '2026-12-01', is_private: false,
  });
  // Five deals. Each manager owns one, two of them have a report who owns one,
  // and one belongs to nobody in any chain.
  await insert('crm_opportunity', deal('Hierarchy manager deal', id.mgrHier));
  await insert('crm_opportunity', deal('Hierarchy REPORT deal', id.repHier));
  await insert('crm_opportunity', deal('Baseline manager deal', id.mgrOwn));
  await insert('crm_opportunity', deal('Baseline REPORT deal', id.repOwn));
  await insert('crm_opportunity', deal('Outsider deal', id.outsider));

  ctx.hier = await buildContextForUser(ql, id.mgrHier);
  ctx.own = await buildContextForUser(ql, id.mgrOwn);
  ctx.org = await buildContextForUser(ql, id.mgrOrg);
}, 120_000);

afterAll(async () => {
  await kernel?.shutdown?.();
});

describe('the harness enforces (negative controls)', () => {
  it('no hierarchy-scope resolver is registered — this IS the open edition', () => {
    // The premise of every assertion below. Stated explicitly so a failure here
    // reads as "the edition changed" rather than surfacing as a puzzling row
    // count two cases later.
    let resolver: unknown = null;
    try {
      resolver = kernel.getService('hierarchy-scope-resolver');
    } catch {
      resolver = null;
    }
    expect(resolver ?? null).toBeNull();
  });

  it('each probe principal holds exactly its throwaway set and no admin bypass', () => {
    const held: Record<string, string> = {
      hier: 'probe_read_hierarchy', own: 'probe_read_owner_only', org: 'probe_read_org_wide',
    };
    for (const [arm, setName] of Object.entries(held)) {
      const c = ctx[arm];
      expect(c.permissions, `${arm} must hold its probe set`).toContain(setName);
      // ⛔ No app profile. If one of these principals ever picked up
      // `sales_manager`, its `viewAllRecords: true` would decide the read and
      // the arms would stop measuring their own grants.
      for (const profile of ((stack as AnyRec).permissions as AnyRec[]).map((p) => p.name)) {
        expect(c.permissions, `${arm} must not hold the app profile ${profile}`)
          .not.toContain(profile);
      }
      expect(c.hasPlatformAdminGrant, `${arm} must not be a platform admin`).toBe(false);
    }
  });

  it('the manager chain is really wired — owner-only here is NOT missing data', async () => {
    // ⭐ The case that makes the pin a statement about the EDITION. If this ever
    // fails, the one row the hierarchy arm reads would be explained by an
    // unwired chain and the pin below would prove nothing.
    const rows = (await ql.find(
      'sys_user',
      { where: { id: { $in: [id.repHier, id.repOwn] } }, fields: ['id', 'name', 'manager_id'] },
      { context: SYS },
    )) as AnyRec[];
    const managerOf = Object.fromEntries(rows.map((r) => [String(r.id), String(r.manager_id ?? '')]));
    expect(managerOf[id.repHier], "the hierarchy report's manager_id must be the hierarchy manager")
      .toBe(id.mgrHier);
    expect(managerOf[id.repOwn]).toBe(id.mgrOwn);
  });

  it('all five deals exist and are owned as claimed', async () => {
    const rows = (await ql.find(
      'crm_opportunity', { where: {}, fields: ['id', 'name', 'owner_id'] }, { context: SYS },
    )) as AnyRec[];
    expect(rows.map((r) => String(r.name)).sort()).toEqual([
      'Baseline REPORT deal', 'Baseline manager deal', 'Hierarchy REPORT deal',
      'Hierarchy manager deal', 'Outsider deal',
    ]);
    const ownerOf = Object.fromEntries(rows.map((r) => [String(r.name), String(r.owner_id)]));
    expect(ownerOf['Hierarchy manager deal']).toBe(id.mgrHier);
    expect(ownerOf['Hierarchy REPORT deal']).toBe(id.repHier);
  });

  it('narrowing is DETECTABLE: the org-wide arm reads every seeded deal', async () => {
    // ⭐ THE CONTROL. One bit apart from the hierarchy arm (`viewAllRecords`),
    // this principal reads all five. So a one-row result below is a real
    // narrowing measured by a working harness, ⛔ not a rig that returns
    // nothing for everyone.
    expect(await dealsVisibleTo(ctx.org)).toEqual([
      'Baseline REPORT deal', 'Baseline manager deal', 'Hierarchy REPORT deal',
      'Hierarchy manager deal', 'Outsider deal',
    ]);
  });
});

describe('open edition: a hierarchy readScope resolves owner-only (#1378)', () => {
  it('the DEPTH resolves exactly as declared — the loss is further down', () => {
    // Not the depth computation: `getEffectiveScope` hands back
    // `own_and_reports` for this grant, faithfully. What cannot happen on this
    // edition is turning that depth into an owner-id SET, which is
    // `SharingService.resolveOwnerScopeIds` (@objectstack/plugin-sharing 17.3.0,
    // dist/index.mjs:3062) — `if (!resolver) return [me]` at :3066.
    const evaluator = new PermissionEvaluator() as AnyRec;
    const scope = evaluator.getEffectiveScope(
      'read', 'crm_opportunity',
      [{ name: 'probe_read_hierarchy', objects: { crm_opportunity: PROBE_GRANTS.probe_read_hierarchy } }],
      { isPrivate: true },
    );
    expect(scope).toBe('own_and_reports');
  });

  it('the manager reads only their OWN deal, never a REPORT-owned deal', async () => {
    // ⚠️ EDITION BOUNDARY, NOT A BROKEN GRANT. The declaration says
    // `own_and_reports` and the chain is wired (negative control above);
    // resolving that depth into owners needs the enterprise
    // `hierarchy-scope-resolver`, absent here, so `resolveOwnerScopeIds`
    // returns the caller alone and `buildReadFilter` emits `owner_id = <caller>`.
    //
    // ⭐ THIS IS THE CASE THAT FLIPS. Install
    // `@objectstack/security-enterprise` and this arm reads TWO deals — its
    // own and the report's. That red is correct and expected; rewrite this file
    // for the enterprise reality then, ⛔ do not relax it.
    expect(await dealsVisibleTo(ctx.hier)).toEqual(['Hierarchy manager deal']);
  });

  it('so own_and_reports conveys nothing beyond the own baseline here', async () => {
    // The two arms differ by exactly one authored key — one declares the
    // hierarchy depth, the other declares no depth at all — and both land on
    // "the caller's own rows, and nothing else" even though only one of them
    // asked for more. That indistinguishability IS the unexercised read half
    // #1378 reports, stated as a measurement instead of as an absence.
    //
    // On the enterprise edition the two stop being interchangeable: the
    // hierarchy arm gains its report's deal and the baseline arm does not.
    const hier = await dealsVisibleTo(ctx.hier);
    const own = await dealsVisibleTo(ctx.own);
    expect(hier).toHaveLength(1);
    expect(own).toEqual(['Baseline manager deal']);
    expect(own).toHaveLength(hier.length);
  });

  it('the depth does not leak sideways — no arm reads the outsider deal', async () => {
    // Owner-only is a floor as well as a ceiling here: a rig that had simply
    // broken sharing open would show up as the outsider's deal appearing in a
    // narrowed arm.
    for (const arm of ['hier', 'own'] as const) {
      expect(await dealsVisibleTo(ctx[arm])).not.toContain('Outsider deal');
    }
  });
});

// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PLATFORM_CAPABILITIES } from '@objectstack/spec/security';
import { applySystemFields } from '@objectstack/objectql';
import { ObjectQL } from '@objectstack/objectql';
import { SqliteWasmDriver } from '@objectstack/driver-sqlite-wasm';
import defaultStack from '../objectstack.config';
import {
  CrmSeedData,
  SaasTenantSeedData,
  COMPOSITION_ENV_VAR,
  resolveComposition,
} from '../src/data/index';
import { DemoBootstrapFlow } from '../src/flows/demo-bootstrap.flow';
import { SystemAdminProfile } from '../src/profiles/system-admin.profile';
import { TenantAdminProfile } from '../src/profiles/tenant-admin.profile';
import { DemoOrgStaffing } from '../src/sharing/demo-staffing';

/**
 * The SaaS / multi-org composition (#1361).
 *
 * `HOTCRM_COMPOSITION=saas` assembles the shape a multi-org operator deploys on
 * the enterprise runtime under a walled tenancy posture. Three registrations
 * differ from the community app and nothing else does; these tests pin BOTH
 * directions, because the two failure modes are opposite and equally bad:
 *
 *  - the SaaS shape quietly keeping something (a tenant receives another
 *    company's pipeline, or a demo sweep that crosses the wall), and
 *  - the community shape quietly losing something (this card's one hard
 *    boundary is that the default composition is behaviourally unchanged).
 *
 * The last block is not an assertion about the app at all — it MEASURES, on a
 * real engine under a walled posture, why `demo_bootstrap` is excluded. A
 * comment claiming "this would cross the wall" is a story; a failing engine is
 * evidence, and if the platform ever stops behaving that way this block goes
 * red and the exclusion can be revisited on measurement rather than on memory.
 */

type AnyRec = Record<string, any>;

/**
 * Load `objectstack.config` afresh under a given composition value.
 *
 * `value` is a plain `string`: every caller names a composition, so an
 * "unset it instead" branch here would be code no test can reach. The RESTORE
 * side below is a different question and does keep its guard — the ambient
 * environment genuinely may not have the variable set, and `delete` and
 * `= undefined` are not the same thing to `process.env`.
 */
async function loadStack(value: string): Promise<AnyRec> {
  const previous = process.env[COMPOSITION_ENV_VAR];
  process.env[COMPOSITION_ENV_VAR] = value;
  vi.resetModules();
  try {
    return ((await import('../objectstack.config')) as AnyRec).default as AnyRec;
  } finally {
    if (previous === undefined) delete process.env[COMPOSITION_ENV_VAR];
    else process.env[COMPOSITION_ENV_VAR] = previous;
    vi.resetModules();
  }
}

const nameOf = (items: AnyRec[] = []): string[] => items.map((i) => String(i.name)).sort();

// ───────────────────────────────────────── the resolver refuses, loudly ──

describe('resolveComposition', () => {
  it('treats unset, empty and whitespace as the community default', () => {
    expect(resolveComposition(undefined)).toBe('default');
    expect(resolveComposition('')).toBe('default');
    expect(resolveComposition('   ')).toBe('default');
  });

  it('accepts exactly the two declared shapes', () => {
    expect(resolveComposition('default')).toBe('default');
    expect(resolveComposition('saas')).toBe('saas');
  });

  it('THROWS on anything else rather than assembling the wrong app', () => {
    // The whole reason this is a function. A silent fall-through on a typo
    // would ship the full demo union into every tenant of a SaaS deployment,
    // and the operator would find out only after tenants had edited the rows.
    expect(() => resolveComposition('sass')).toThrow(/is not a HotCRM composition/);
    expect(() => resolveComposition('SaaS')).toThrow(/is not a HotCRM composition/);
    expect(() => resolveComposition('true')).toThrow(/Expected one of: default, saas/);
  });
});

// ──────────────────────────────── the community composition is unchanged ──

describe('the default composition is the community app, untouched', () => {
  it('registers the FULL seed union', () => {
    // Compared by CONTENT, not by reference: `defineStack` parses its input
    // through the spec schemas, so what lands on the stack is a fresh value —
    // reference identity holds only upstream of that call, which is exactly
    // where `objectstack.config.ts` does its filtering.
    const registered = ((defaultStack as AnyRec).data as AnyRec[]).map((d) => String(d.object));
    expect(registered).toEqual(CrmSeedData.map((d) => String((d as AnyRec).object)));
    const rows = (list: AnyRec[]) =>
      list.reduce((n, d) => n + (Array.isArray(d.records) ? d.records.length : 0), 0);
    expect(rows((defaultStack as AnyRec).data as AnyRec[])).toBe(rows(CrmSeedData as AnyRec[]));
  });

  it('still ships every seed family, storytelling included', () => {
    const objects = new Set(((defaultStack as AnyRec).data as AnyRec[]).map((d) => String(d.object)));
    for (const object of [
      'crm_product',      // catalog
      'crm_account',      // sales
      'crm_case',         // service
      'crm_campaign',     // marketing
      'crm_contract',     // revenue
    ]) {
      expect(objects.has(object), `the default composition dropped ${object} seeds`).toBe(true);
    }
  });

  it('still ships demo_bootstrap', () => {
    expect(nameOf((defaultStack as AnyRec).flows as AnyRec[])).toContain(DemoBootstrapFlow.name);
  });

  it('still ships system_admin, and does NOT ship tenant_admin', () => {
    const setNames = nameOf((defaultStack as AnyRec).permissions as AnyRec[]);
    expect(setNames).toContain(SystemAdminProfile.name);
    expect(setNames).not.toContain(TenantAdminProfile.name);
  });
});

// ───────────────────────────────────────────── the SaaS composition ──

describe('HOTCRM_COMPOSITION=saas', () => {
  let saas: AnyRec;

  beforeAll(async () => {
    saas = await loadStack('saas');
  }, 60_000);

  it('replays the CATALOGUE family and nothing else', () => {
    const objects = ((saas.data ?? []) as AnyRec[]).map((d) => String(d.object));
    expect(objects).toEqual(['crm_product']);
    // Same length as the module's own declaration — so a family added to
    // `SaasTenantSeedData` has to be added deliberately, and lands here.
    expect((saas.data as AnyRec[]).length).toBe(SaasTenantSeedData.length);
  });

  it('excludes every storytelling family by name', () => {
    const objects = new Set(((saas.data ?? []) as AnyRec[]).map((d) => String(d.object)));
    // Not "the list is short" — each excluded object named, so a partial
    // regression (revenue creeps back, say) fails with the family that crept.
    for (const object of [
      'crm_account', 'crm_contact', 'crm_lead', 'crm_opportunity', 'crm_opportunity_line_item',
      'crm_task', 'crm_case', 'crm_knowledge_article', 'crm_event', 'crm_event_attendee',
      'crm_campaign', 'crm_campaign_member',
      'crm_contract', 'crm_quote', 'crm_quote_line_item', 'crm_forecast',
    ]) {
      expect(objects.has(object), `${object} seeds would land in every tenant`).toBe(false);
    }
  });

  it('the catalogue seeds carry no cross-object reference to strand', () => {
    // Why the shrink is safe: `crm_product` resolves nothing against another
    // object, so no lookup is left pointing at a family that no longer ships.
    // Every other family does reference one, which is why they cannot be
    // cherry-picked back in individually.
    const referenceValues = ((saas.data ?? []) as AnyRec[])
      .flatMap((d) => (Array.isArray(d.records) ? (d.records as AnyRec[]) : []))
      .flatMap((r) => Object.keys(r))
      .filter((key) => key.startsWith('crm_'));
    expect(referenceValues).toEqual([]);
  });

  it('drops demo_bootstrap — and drops exactly it', () => {
    const flowNames = nameOf(saas.flows as AnyRec[]);
    expect(flowNames).not.toContain('demo_bootstrap');
    // The other direction, which is the one a broken filter fails: every OTHER
    // flow the community app ships is still registered. A filter that matched
    // nothing would pass the line above only if the flow were already gone.
    const communityNames = nameOf((defaultStack as AnyRec).flows as AnyRec[]);
    expect(flowNames).toEqual(communityNames.filter((n) => n !== 'demo_bootstrap'));
    expect(communityNames).toContain('demo_bootstrap');
    expect(flowNames.length).toBe(communityNames.length - 1);
  });

  it('replaces system_admin with tenant_admin, leaving the other personas alone', () => {
    const setNames = nameOf(saas.permissions as AnyRec[]);
    expect(setNames).not.toContain('system_admin');
    expect(setNames).toContain('tenant_admin');
    const communityNames = nameOf((defaultStack as AnyRec).permissions as AnyRec[]);
    expect(setNames).toEqual(
      [...communityNames.filter((n) => n !== 'system_admin'), 'tenant_admin'].sort(),
    );
  });

  it('keeps the demo staffing table out of the stack here too (#640)', () => {
    // `test/demo-staffing.test.ts` pins this for the community app. Restated
    // for the SaaS shape because that is where synthetic users would be worst:
    // they would land in a paying tenant's organization.
    const serialized = JSON.stringify(saas);
    for (const person of DemoOrgStaffing) {
      expect(serialized).not.toContain(person.email);
      expect(serialized).not.toContain(person.password);
    }
  });
});

// ─────────────────────────────── the walled admin profile, against the ──
// ─────────────────────────────── platform's OWN capability registry ──

describe('tenant_admin is an ORG admin, judged by the platform capability registry', () => {
  const scopeOf = new Map(PLATFORM_CAPABILITIES.map((c) => [c.name, c.scope]));

  it('holds the org-scoped member-management capability', () => {
    expect(TenantAdminProfile.systemPermissions).toContain('manage_org_users');
    expect(
      scopeOf.get('manage_org_users'),
      'manage_org_users is not org-scoped on the installed platform line — the substitution this profile exists for no longer holds',
    ).toBe('org');
  });

  it('grants NO platform-scoped capability', () => {
    // Read off the platform's own registry rather than a hand-listed denylist,
    // so a capability that becomes platform-scoped upstream — or a new one
    // added to this profile — is judged the day it changes.
    const platformScoped = TenantAdminProfile.systemPermissions.filter(
      (name) => scopeOf.get(name) === 'platform',
    );
    expect(
      platformScoped,
      `tenant_admin holds platform-scoped capabilities, which reach past its own organization: ${platformScoped.join(', ')}`,
    ).toEqual([]);
  });

  it('and the community admin DOES — so the rule above is not vacuous', () => {
    // The discriminator. Without it, "no platform-scoped capability" would pass
    // just as well against a registry this app referenced none of.
    const platformScoped = SystemAdminProfile.systemPermissions.filter(
      (name) => scopeOf.get(name) === 'platform',
    );
    expect(platformScoped).toContain('manage_users');
  });

  it('covers every business object with full CRUD, exactly like system_admin', () => {
    // Same rule `test/authorization-coverage.test.ts` holds the community admin
    // to. Permission sets are explicit-allow, so an object missing here is
    // permission-denied for tenant admins too.
    const objects: AnyRec[] = (defaultStack as AnyRec).objects ?? [];
    const businessObjects = objects
      .filter((o) => typeof o.name === 'string' && !o.name.startsWith('sys_'))
      .map((o) => o.name as string);
    expect(businessObjects.length).toBeGreaterThan(0);

    const bad: string[] = [];
    for (const name of businessObjects) {
      const perm = (TenantAdminProfile.objects as AnyRec)[name];
      if (!perm) {
        bad.push(`${name}: not granted`);
        continue;
      }
      for (const flag of ['allowCreate', 'allowRead', 'allowEdit', 'allowDelete'] as const) {
        if (perm[flag] !== true) bad.push(`${name}: ${flag} is not true`);
      }
    }
    expect(bad, `tenant_admin gaps:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('is a distinct value from the community admin, not an alias of it', () => {
    // The object map is DERIVED from `system_admin`, and a shared reference
    // would put one mutable map in two published permission sets.
    expect(TenantAdminProfile.objects).not.toBe(SystemAdminProfile.objects);
    expect(TenantAdminProfile.objects).toEqual(SystemAdminProfile.objects);
  });
});

// ──────────────────────── WHY demo_bootstrap is excluded — measured, not ──
// ──────────────────────── asserted: a system context has no organization ──

describe("the demo_bootstrap sweep crosses the wall — the engine's own answer", () => {
  /**
   * The flow's two moves, taken from the SHIPPED flow definition rather than
   * transcribed, so this cannot drift into measuring something the flow no
   * longer does:
   *
   *   1. select rows whose ownership column is null   (`get_record` + filter)
   *   2. stamp the first user's id onto each one      (`update_record` + fields)
   *
   * …performed through the engine surface `runAs: 'system'` gives the flow: a
   * system execution context. That context is the one the driver's organization
   * predicate does not constrain, which is the whole finding — the sweep is not
   * "unnecessary" under the wall, it is an identity crossing it.
   *
   * `OS_TENANCY_POSTURE=isolated` is set because a walled deployment sets it,
   * not because the result depends on it: the predicate is the DRIVER's,
   * compiled from the execution context's tenant id, and a system context
   * carries none. The knob makes the engine's registry organization-scoped; it
   * is not what makes the sweep unwalled. Saying so keeps this block a
   * measurement of the real mechanism rather than of an environment variable.
   */
  const claimed = (() => {
    const out: Array<{ objectName: string; column: string }> = [];
    for (const node of (DemoBootstrapFlow.nodes ?? []) as AnyRec[]) {
      if (node.type !== 'get_record') continue;
      const config = (node.config ?? {}) as AnyRec;
      const filter = (config.filter ?? {}) as AnyRec;
      const [column, value] = Object.entries(filter)[0] ?? [];
      if (typeof config.objectName !== 'string' || !column || value !== null) continue;
      out.push({ objectName: config.objectName, column });
    }
    return out;
  })();

  const probe = claimed.find((c) => c.objectName === 'crm_account');

  let driver: SqliteWasmDriver;
  let ql: AnyRec;
  let previousPosture: string | undefined;

  beforeAll(async () => {
    previousPosture = process.env.OS_TENANCY_POSTURE;
    process.env.OS_TENANCY_POSTURE = 'isolated';

    const objects: AnyRec[] = (defaultStack as AnyRec).objects ?? [];
    const account = objects.find((o) => o.name === 'crm_account')!;
    const objectMap: Record<string, AnyRec> = { crm_account: account };

    driver = new SqliteWasmDriver({ filename: ':memory:' });
    ql = (await ObjectQL.create({
      datasources: { default: driver as never },
      objects: objectMap as never,
    } as never)) as AnyRec;

    const scoped = applySystemFields(account as never, { multiTenant: true } as never) as AnyRec;
    await driver.initObjects([
      { name: 'crm_account', fields: scoped.fields, indexes: scoped.indexes } as never,
    ]);
  }, 60_000);

  afterAll(async () => {
    await ql?.close?.();
    if (previousPosture === undefined) delete process.env.OS_TENANCY_POSTURE;
    else process.env.OS_TENANCY_POSTURE = previousPosture;
  });

  it('reads the sweep out of the shipped flow rather than assuming it', () => {
    // If the flow stops selecting ownerless rows, this file must stop claiming
    // to have measured what it does.
    expect(claimed.length).toBeGreaterThan(0);
    expect(probe, 'demo_bootstrap no longer sweeps crm_account by a null ownership column').toBeTruthy();
    expect(probe!.column).toBe('owner_id');
  });

  it('SENTINEL — an ordinary tenant session cannot see the other tenant at all', () => {
    // The wall must be ON before the next test's silence means anything.
    return (async () => {
      const a = ql.createContext({ userId: 'usr_a', tenantId: 'org_a' });
      const b = ql.createContext({ userId: 'usr_b', tenantId: 'org_b' });
      await a.object('crm_account').insert({ name: 'Tenant A Co', type: 'customer', owner_id: 'usr_a' });
      await b.object('crm_account').insert({ name: 'Tenant B Co', type: 'customer', owner_id: 'usr_b' });
      const seenByA = (await a.object('crm_account').find({})) as AnyRec[];
      expect(seenByA.map((r) => String(r.name))).toEqual(['Tenant A Co']);
      expect(seenByA.every((r) => r.organization_id === 'org_a')).toBe(true);
    })();
  });

  it("a runAs:'system' sweep selects rows in EVERY organization", async () => {
    const sys = ql.createContext({ isSystem: true });
    await driver
      .getKnex()
      .raw(
        `insert into crm_account (id, name, type, organization_id, owner_id) values ` +
          `('sweep_a','Ownerless A','customer','org_a',null), ` +
          `('sweep_b','Ownerless B','customer','org_b',null)`,
      );
    const selected = (await sys
      .object(probe!.objectName)
      .find({ where: { [probe!.column]: null } })) as AnyRec[];
    const orgs = new Set(selected.map((r) => String(r.organization_id)));
    expect(
      orgs.has('org_a') && orgs.has('org_b'),
      `the sweep saw only ${[...orgs].join(', ')} — a system context is expected to be unwalled`,
    ).toBe(true);
  });

  it('and stamps ONE organization’s user onto ANOTHER organization’s row', async () => {
    // The defect in one line: `{firstUser.id}` is whoever `sys_user`'s first row
    // happens to be — one identity, written across every partition.
    const sys = ql.createContext({ isSystem: true });
    await sys.object('crm_account').update({ id: 'sweep_b', owner_id: 'usr_a' });
    const [row] = (await driver
      .getKnex()
      .raw(`select organization_id, owner_id from crm_account where id = 'sweep_b'`)) as AnyRec[];
    expect(row.organization_id).toBe('org_b');
    expect(
      row.owner_id,
      'the wall refused the cross-organization owner — re-evaluate whether demo_bootstrap still needs excluding',
    ).toBe('usr_a');
  });
});

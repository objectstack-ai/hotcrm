// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { PLATFORM_CAPABILITIES } from '@objectstack/spec/security';
import defaultStack from './helpers/composed-stack';
import {
  CrmSeedData, SaasTenantSeedData, ServiceSeedData, AppSeedData, serviceStack, appStack,
} from '../objectstack.composition';
import { COMPOSITION_ENV_VAR, resolveComposition } from '../src/sales/data/index';
import { SystemAdminProfile } from '../src/sales/profiles/system-admin.profile';
import { TenantAdminProfile } from '../src/sales/profiles/tenant-admin.profile';
import { DemoOrgStaffing } from '../src/sales/sharing/demo-staffing';

/**
 * The SaaS / multi-org composition (#1361).
 *
 * `HOTCRM_COMPOSITION=saas` assembles the shape a multi-org operator deploys on
 * the enterprise runtime under a walled tenancy posture. Two registrations
 * differ from the community app and nothing else does; these tests pin BOTH
 * directions, because the two failure modes are opposite and equally bad:
 *
 *  - the SaaS shape quietly keeping something (a tenant receives another
 *    company's pipeline), and
 *  - the community shape quietly losing something (this card's one hard
 *    boundary is that the default composition is behaviourally unchanged).
 *
 * The flows used to be a third difference: the SaaS shape dropped the
 * `demo_bootstrap` ownership sweep, which crossed the organization wall. The
 * sweep is retired from the app (#1892), so both shapes register the same
 * flows, and that is pinned below too.
 */

type AnyRec = Record<string, any>;

/**
 * Load the app's stack afresh under a given composition value — the composed
 * view of `test/helpers/composed-stack.ts`, which re-imports
 * `objectstack.composition.ts`, where the knob is resolved and the two package
 * stacks are built.
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
    return ((await import('./helpers/composed-stack')) as AnyRec).default as AnyRec;
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
    // where `objectstack.composition.ts` does its filtering.
    //
    // As a SET of families, not a sequence: each family is registered by the
    // package that owns its object (the next test), so the composed view lists
    // the service package's families first and the app package's after them.
    const objectsOf = (list: AnyRec[]) => list.map((d) => String(d.object));
    const registered = objectsOf((defaultStack as AnyRec).data as AnyRec[]);
    expect([...registered].sort()).toEqual(objectsOf(CrmSeedData as AnyRec[]).sort());
    const rows = (list: AnyRec[]) =>
      list.reduce((n, d) => n + (Array.isArray(d.records) ? d.records.length : 0), 0);
    expect(rows((defaultStack as AnyRec).data as AnyRec[])).toBe(rows(CrmSeedData as AnyRec[]));
  });

  it('registers each family with the package that owns its object, in replay order', () => {
    // `defineStack` refuses `data` naming an object the stack does not define
    // and was not told the artifact defines, so the split is not a choice —
    // and the two halves together are exactly the union, each in the order
    // `CrmSeedData` gives its families.
    const objectsOf = (list: readonly unknown[] = []) => (list as AnyRec[]).map((d) => String(d.object));
    expect(objectsOf(serviceStack.data)).toEqual(objectsOf(ServiceSeedData));
    expect(objectsOf(serviceStack.data)).toEqual(['crm_case', 'crm_knowledge_article']);
    expect(objectsOf(appStack.data)).toEqual(objectsOf(AppSeedData));
    expect([...objectsOf(serviceStack.data), ...objectsOf(appStack.data)].sort()).toEqual(
      objectsOf(CrmSeedData).sort(),
    );
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

  it('registers exactly the flows the community app does', () => {
    // Flows are no longer a difference between the shapes (#1892), so any
    // divergence here is a registration nobody decided on.
    const flowNames = nameOf(saas.flows as AnyRec[]);
    expect(flowNames, 'the SaaS composition registered no flows at all').not.toEqual([]);
    expect(flowNames).toEqual(nameOf((defaultStack as AnyRec).flows as AnyRec[]));
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

  it('holds the org-scoped presentation-authoring capability (#1369)', () => {
    // The org-bounded subset of metadata authoring. Its scope is read off the
    // installed registry, never copied here: if the platform ever widened it,
    // this and the platform-scoped pin below would both go red.
    expect(TenantAdminProfile.systemPermissions).toContain('manage_org_presentation');
    expect(
      scopeOf.get('manage_org_presentation'),
      'manage_org_presentation is not org-scoped on the installed platform line — a tenant profile must not hold it',
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

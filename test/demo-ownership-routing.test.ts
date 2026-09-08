// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from '../objectstack.config';
import accountHook from '../src/objects/account.hook';
import { CrmSeedData } from '../src/data/index';
import { DemoOrgStaffing, DemoPipelineOwnership, TERRITORY_OWNER } from '../src/sharing/demo-staffing';
import { TERRITORY_OPTIONS } from '../src/objects/_territory';
import { makeCtx } from './helpers/hook-harness';

/**
 * Who owns the demo book (#1759) — the static half of an ownership census.
 *
 * ### What was dark
 *
 * `demo_bootstrap` claims every ownerless seeded row for the FIRST user, the
 * dev admin. Over an API key that is invisible: the request runs as the human
 * and `viewAllRecords` applies, so the sales manager reads 9 accounts, 23
 * opportunities and 59 tasks. Over OAuth the agent ceiling
 * (objectstack-ai/objectstack#16549) admits only the rows the caller OWNS or
 * holds a share on, and `viewAllRecords` deliberately does not lift it — so the
 * same identity measured 5 / **0** / **0** on 2026-09-07. The demo worked for
 * scripts and failed for the exact path business users are meant to take.
 *
 * ⛔ The ceiling is the platform working. The fix is ownership, and nothing in
 * this suite or the change it guards touches a profile, a permission set or a
 * sharing rule.
 *
 * ### What this file can and cannot check
 *
 * It is a static suite: it cannot run `pnpm demo:staff`, which is where the
 * re-stamp happens (the only place it CAN happen — `test/demo-staffing.test.ts`
 * fails the build if a staffing email reaches the shipped artifact, so neither
 * the seed nor the flow may name these people). What it pins is every
 * authoring-time premise that script depends on, and the CENSUS ITSELF: the
 * intended distribution recomputed from the REAL seeds through the REAL account
 * hook, asserted to be a per-identity SUBSET that balances against the total.
 * The script re-reads the same census from the server afterwards and fails when
 * the two disagree.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const flows: AnyRec[] = (stack as any).flows ?? [];
const objectNamed = (name: string) => objects.find((o) => String(o.name) === name);
const staffKeys = new Set(DemoOrgStaffing.map((m) => m.key));
const emailOfKey = (key: string) => DemoOrgStaffing.find((m) => m.key === key)?.email ?? `(no such key: ${key})`;

/** The objects `demo_bootstrap` stamps an owner onto, read off the real flow. */
const claimedByBootstrap = (): Set<string> => {
  const flow = flows.find((f) => String(f.name) === 'demo_bootstrap');
  if (!flow) throw new Error('demo_bootstrap is not registered — the producer of ownership is gone');
  const found = new Set<string>();
  const walk = (nodes: AnyRec[]) => {
    for (const node of nodes ?? []) {
      if (String(node?.type) === 'get_record' && node?.config?.objectName) found.add(String(node.config.objectName));
      for (const region of [node?.config?.body, ...Object.values(node?.config ?? {})]) {
        if (region && typeof region === 'object' && Array.isArray((region as AnyRec).nodes)) {
          walk((region as AnyRec).nodes as AnyRec[]);
        }
      }
    }
  };
  walk((flow.nodes ?? []) as AnyRec[]);
  return found;
};

describe('the ownership routing table is well-formed', () => {
  it('routes at least the objects the OAuth measurement came back empty on', () => {
    // Guard the guard: an empty table would make every assertion below vacuous.
    // Tasks and events are here because "last follow-up" is derived from them.
    const routed = DemoPipelineOwnership.map((r) => r.object).sort();
    expect(routed).toEqual(['crm_event', 'crm_lead', 'crm_opportunity', 'crm_task']);
  });

  it('names real objects that really carry an owner', () => {
    const problems: string[] = [];
    const seen = new Set<string>();
    for (const route of DemoPipelineOwnership) {
      if (seen.has(route.object)) problems.push(`${route.object} is routed twice`);
      seen.add(route.object);
      const object = objectNamed(route.object);
      if (!object) {
        problems.push(`${route.object} is not a registered object`);
        continue;
      }
      // Stamping an owner onto an object that declares no `owner_id` writes a
      // column that does not exist — the other direction of the same mistake
      // `demo_bootstrap` documents for `crm_event_attendee` and `crm_product`.
      if (!object.fields?.owner_id) problems.push(`${route.object} declares no owner_id, so there is no ownership to route`);
      if (route.why.trim().length === 0) problems.push(`${route.object}: no 'why' — say what routing it makes visible`);
      if (route.accountField != null) {
        const field = object.fields?.[route.accountField];
        if (!field) problems.push(`${route.object}.${route.accountField} does not exist`);
        else if (field.type !== 'lookup' || field.reference !== 'crm_account') {
          problems.push(
            `${route.object}.${route.accountField} is a ${String(field.type)} to ` +
            `${String(field.reference ?? '(nothing)')}, not a lookup to crm_account, so no territory ` +
            `can be resolved through it`,
          );
        }
      }
    }
    expect(problems, `routes that cannot be applied:\n  ${problems.join('\n  ')}`).toEqual([]);
  });

  it('only re-routes rows demo_bootstrap would otherwise leave on the dev admin', () => {
    // The producer of seeded ownership is the FLOW, not the seed and not this
    // table: a seed cannot name a user, and the flow ships in the artifact so it
    // must not know the demo roster. This table only moves what that sweep
    // claims. An object outside the sweep would arrive ownerless instead, and
    // routing it here would be doing the sweep's job in a dev-only script.
    const claimed = claimedByBootstrap();
    expect(claimed.size, 'the walk over demo_bootstrap found no claimed objects at all').toBeGreaterThan(0);
    const outside = DemoPipelineOwnership.map((r) => r.object).filter((o) => !claimed.has(o));
    expect(
      outside,
      `routed objects demo_bootstrap does not claim: ${outside.join(', ')}. Ownership for seeded ` +
      `rows is the flow's job (src/flows/demo-bootstrap.flow.ts); this table redistributes, it does ` +
      `not originate.`,
    ).toEqual([]);
  });

  it('⛔ leaves crm_account OUT, because owning it would delete the territory demo', () => {
    expect(
      DemoPipelineOwnership.map((r) => r.object),
      `crm_account must never be routed. It is sharingModel: 'private', so the OWD baseline already ` +
      `admits a record's OWNER — a share to the owner proves nothing, and the two territory reps ` +
      `exist precisely to read accounts they do NOT own. It is also the one object that already ` +
      `answered non-zero over OAuth (5 of 9), and it did so through sys_record_share rather than ` +
      `ownership. Moving it here would replace the only working demonstration in that measurement.`,
    ).not.toContain('crm_account');
  });
});

describe('the territory→owner map is complete and distinguishable', () => {
  it('covers every declared territory and names only staffed people', () => {
    const declared = TERRITORY_OPTIONS.map((o) => String(o.value)).sort();
    expect(Object.keys(TERRITORY_OWNER).sort(), 'a territory with no owner would fall through silently').toEqual(declared);
    const unknown = Object.values(TERRITORY_OWNER).filter((key) => !staffKeys.has(key));
    expect(unknown, `TERRITORY_OWNER names demo staff keys nobody in DemoOrgStaffing holds: ${unknown.join(', ')}`).toEqual([]);
  });

  it('sends the two territories to DIFFERENT people', () => {
    // One person holding both would make the identity-switch demo show the same
    // rows twice — the routing would look applied while proving nothing.
    expect(TERRITORY_OWNER.na).not.toBe(TERRITORY_OWNER.emea);
    // And the territory owners must be the reps who hold that territory's
    // position, or the split is decorative.
    const holder = (position: string) => DemoOrgStaffing.find((m) => m.positions.includes(position))?.key;
    expect(TERRITORY_OWNER.na, 'the NA rows must land on whoever holds na_sales_team').toBe(holder('na_sales_team'));
    expect(TERRITORY_OWNER.emea, 'the EU rows must land on whoever holds eu_sales_team').toBe(holder('eu_sales_team'));
  });
});

/**
 * The census, recomputed from the REAL seeds through the REAL account hook —
 * the same chain `test/demo-staffing.test.ts` walks for the territory counts,
 * asked here of the rows those accounts carry.
 */
describe('what each identity ends up owning', () => {
  type Dataset = { object: string; records: AnyRec[] };
  const datasets = CrmSeedData as unknown as Dataset[];
  const recordsOf = (object: string) => datasets.filter((d) => d.object === object).flatMap((d) => d.records);

  /** Account name → the territory `account_protection` derives for it. */
  const territoryByAccount = async (): Promise<Map<string, string>> => {
    const rows = await Promise.all(
      recordsOf('crm_account').map(async (record) => {
        const input: AnyRec = { ...record };
        await (accountHook as AnyRec).handler(makeCtx({ event: 'beforeInsert', input }));
        return input;
      }),
    );
    return new Map(rows.map((r) => [String(r.name), String(r.territory ?? '')]));
  };

  /** object → owner key → row count, exactly as `handBookToRoster` computes it. */
  const census = async () => {
    const territory = await territoryByAccount();
    const out = new Map<string, Map<string, number>>();
    for (const route of DemoPipelineOwnership) {
      const per = new Map<string, number>();
      for (const record of recordsOf(route.object)) {
        const account = route.accountField ? record[route.accountField] : undefined;
        const key = TERRITORY_OWNER[(territory.get(String(account ?? '')) ?? '') as 'na'] ?? TERRITORY_OWNER.other;
        per.set(key, (per.get(key) ?? 0) + 1);
      }
      out.set(route.object, per);
    }
    return out;
  };

  it('balances: every seeded row of a routed object lands on exactly one person', async () => {
    const counts = await census();
    const problems: string[] = [];
    for (const route of DemoPipelineOwnership) {
      const seeded = recordsOf(route.object).length;
      // Anti-vacuity: a routed object with no seeded rows would balance at 0=0
      // and tell us nothing at all.
      if (seeded === 0) {
        problems.push(`${route.object} has no seeded rows, so its balance below is vacuous`);
        continue;
      }
      const assigned = [...(counts.get(route.object) ?? new Map()).values()].reduce((a, b) => a + b, 0);
      if (assigned !== seeded) {
        problems.push(`${route.object}: ${assigned} row(s) routed against ${seeded} seeded — the instrument is broken, not the fix`);
      }
    }
    expect(problems, `census does not balance:\n  ${problems.join('\n  ')}`).toEqual([]);
  });

  it('gives each demo persona a SUBSET, and nobody the lot', async () => {
    const counts = await census();
    const overall = new Map<string, number>();
    let total = 0;
    for (const per of counts.values()) {
      for (const [key, n] of per) {
        overall.set(key, (overall.get(key) ?? 0) + n);
        total += n;
      }
    }
    const held = [...overall.entries()].map(([key, n]) => `${emailOfKey(key)}=${n}`).sort();

    expect(
      overall.size,
      `the whole routed book lands on one identity (${held.join(', ')}) — that replaces "sees 0" ` +
      `with "sees all" and loses the demonstration that row-level security is on at all`,
    ).toBeGreaterThan(1);
    for (const [key, n] of overall) {
      expect(n, `${emailOfKey(key)} would own every routed row — that is not a subset`).toBeLessThan(total);
      expect(n, `${emailOfKey(key)} is routed nothing, so their agent session still reads empty`).toBeGreaterThan(0);
    }
    // The three sales personas must ALL hold something: the card is about a
    // salesperson connecting over OAuth, and an empty seat is that same zero.
    for (const key of ['na_rep', 'eu_rep', 'sales_manager']) {
      expect(overall.get(key) ?? 0, `${emailOfKey(key)} owns nothing across the routed objects`).toBeGreaterThan(0);
    }
  });

  it('splits the pipeline itself — the object that measured 0 — across both reps and the manager', async () => {
    // `crm_opportunity` is the headline of the reported defect (23 over an API
    // key, 0 over OAuth). One person owning all 23 would satisfy every other
    // assertion here while still failing the demo it exists for.
    const per = (await census()).get('crm_opportunity');
    expect(per, 'crm_opportunity is no longer routed').toBeTruthy();
    const shares = [...per!.entries()].map(([key, n]) => `${emailOfKey(key)}=${n}`).sort();
    expect(per!.size, `every opportunity on one desk: ${shares.join(', ')}`).toBeGreaterThanOrEqual(3);
    for (const key of ['na_rep', 'eu_rep', 'sales_manager']) {
      expect(per!.get(key) ?? 0, `${emailOfKey(key)} owns no opportunity at all (${shares.join(', ')})`).toBeGreaterThan(0);
    }
  });
});

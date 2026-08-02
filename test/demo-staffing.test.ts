// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { compileCelToFilter } from '@objectstack/formula';
import stack from '../objectstack.config';
import accountHook from '../src/objects/account.hook';
import { CrmSeedData } from '../src/data/index';
import { DemoOrgStaffing } from '../src/sharing/demo-staffing';
import * as sharingBarrel from '../src/sharing/index';

/**
 * Demo-org staffing (#640) — the third layer of position-based access.
 *
 * ### What was dark
 *
 * #621 made the sharing rules install; #638 gave them records to match. Nobody
 * held a position, so a matching account still materialised no grant. Measured
 * on a fresh 17.0.0-rc.1 install: `sys_user_position` 0 rows,
 * `sys_record_share` 0 rows, and `opportunity_approval`'s `manager_review`
 * opened with an empty approver slate while `lockRecord: true` held the record.
 *
 * `src/sharing/demo-staffing.ts` closes it with a TABLE of demo people, applied
 * by `pnpm demo:staff` against a local dev server. Measured after that script,
 * on the same fresh install:
 *
 *     north_america_territory  matched=6  holders=1  granted=6
 *     europe_territory         matched=2  holders=1  granted=2
 *     account_team_sharing     matched=5  holders=1  granted=5
 *     sys_record_share         13 rows, all source='rule'
 *     na.rep@objectos.ai       sees 6 accounts  [CA, US]
 *     eu.rep@objectos.ai       sees 2 accounts  [DE, UK]
 *     sys_approval_request     current_step=manager_review
 *                              pending_approvers=[sales.manager@objectos.ai]
 *
 * ### What this file can and cannot check
 *
 * It is a static suite: it cannot run the script. What it CAN pin is every
 * authoring-time premise the script depends on — that each staffed position is
 * declared, that the positions chosen are the ones the sharing rules and the
 * approval nodes actually name, that the territory arithmetic still comes out
 * 6/2/1 against the real seeds, and — the load-bearing one — that **the
 * published artifact contains no mechanism that could create these people**.
 * That last group is what keeps "a real deployment installs none of them" a
 * structural fact rather than a promise.
 */

type AnyRec = Record<string, any>;

const positions: AnyRec[] = (stack as any).positions ?? [];
const sharingRules: AnyRec[] = (stack as any).sharingRules ?? [];
const permissionSets: AnyRec[] = (stack as any).permissions ?? [];
const flows: AnyRec[] = (stack as any).flows ?? [];

const positionNames = new Set(positions.map((p) => String(p.name)));
const staffedPositions = new Set(DemoOrgStaffing.flatMap((m) => m.positions));
const holdersOf = (position: string) => DemoOrgStaffing.filter((m) => m.positions.includes(position));

/**
 * Identity/access tables only the platform may write. A seed dataset or flow
 * node naming any of these is the #640 hard constraint being violated: it would
 * mean the shipped app can conjure users, memberships or grants inside a
 * customer's org.
 */
const IDENTITY_OBJECTS = [
  'sys_user',
  'sys_member',
  'sys_user_position',
  'sys_position_permission_set',
  'sys_user_permission_set',
  'sys_record_share',
];

describe('the staffing table is well-formed', () => {
  it('has people at all', () => {
    // Guard the guard: an empty table would make every assertion below vacuous.
    expect(DemoOrgStaffing.length).toBeGreaterThanOrEqual(3);
  });

  it('gives every row a unique key, a unique email, a login and a reason', () => {
    const problems: string[] = [];
    const keys = new Set<string>();
    const emails = new Set<string>();
    for (const m of DemoOrgStaffing) {
      if (keys.has(m.key)) problems.push(`duplicate key "${m.key}"`);
      keys.add(m.key);
      if (emails.has(m.email)) problems.push(`duplicate email "${m.email}"`);
      emails.add(m.email);
      if (!/^[^@\s]+@[^@\s]+\.[a-z]+$/.test(m.email)) problems.push(`${m.key}: "${m.email}" is not an email`);
      // better-auth rejects a shorter password at create-user time, which would
      // fail the staffing run halfway through with a 400 from the auth API.
      if (m.password.length < 8) problems.push(`${m.key}: password is under better-auth's 8-char minimum`);
      if (m.positions.length === 0) problems.push(`${m.key}: holds no position, so staffing them changes nothing`);
      if (m.demonstrates.trim().length === 0) problems.push(`${m.key}: no 'demonstrates' — say what this person makes visible`);
    }
    expect(problems, `staffing rows that cannot be applied:\n  ${problems.join('\n  ')}`).toEqual([]);
  });

  it('only names positions the app declares', () => {
    // A position the app does not declare cannot be granted anything and cannot
    // grant anything (#488) — the assignment row would sit there inert.
    const unknown = [...staffedPositions].filter((p) => !positionNames.has(p));
    expect(
      unknown,
      `staffing names positions that are not in CrmPositions: ${unknown.join(', ')}`,
    ).toEqual([]);
  });
});

describe('the staffing table encodes the #640 decision, not an org chart', () => {
  it('staffs both territories and the sales manager — and nothing else', () => {
    // The three people are exactly the ones that turn a dark mechanism on:
    // two territory holders (who must not own the accounts) and one approver.
    expect(holdersOf('na_sales_team').length, 'nobody holds na_sales_team').toBe(1);
    expect(holdersOf('eu_sales_team').length, 'nobody holds eu_sales_team').toBe(1);
    expect(holdersOf('sales_manager').length, 'nobody holds sales_manager').toBe(1);
    expect(
      holdersOf('na_sales_team')[0].email,
      'the two territories must be held by DIFFERENT people, or neither rule is distinguishable',
    ).not.toBe(holdersOf('eu_sales_team')[0].email);
  });

  it('leaves the leadership bench empty on purpose', () => {
    // Decided in #640: staffing exists to make the mechanism observable, not to
    // populate an org chart. A real deployment staffs its own people, and an
    // empty bench is the honest depiction of that. Filling one of these in
    // needs the same conversation the first three had — hence a failing test,
    // not a silent addition.
    const DELIBERATELY_UNSTAFFED = [
      'executive', 'sales_director', 'service_director', 'service_manager',
      'service_agent', 'marketing_director', 'marketing_manager', 'marketing_user',
    ];
    const surprises = DELIBERATELY_UNSTAFFED.filter((p) => staffedPositions.has(p));
    expect(
      surprises,
      `these positions were deliberately left unstaffed in #640 — staffing them is a decision, ` +
      `not a tidy-up: ${surprises.join(', ')}`,
    ).toEqual([]);
  });

  it('pairs each territory position with a functional one that carries a permission set', () => {
    // A territory position is a RECORD grouping: no permission set binds to
    // `na_sales_team` / `eu_sales_team`, so on its own it widens which rows a
    // user sees without saying what they may do. Measured: a user holding only
    // `eu_sales_team` still reads the 2 EU accounts — via the platform's
    // additive `member_default` baseline (ADR-0090 D5) — i.e. the demo would
    // show a generic org member, not a sales rep.
    const setNames = new Set(permissionSets.map((p) => String(p.name)));
    const bad: string[] = [];
    for (const m of DemoOrgStaffing) {
      const territorial = m.positions.some((p) => p === 'na_sales_team' || p === 'eu_sales_team');
      if (!territorial) continue;
      // A set whose NAME matches a position is bound to it at install time.
      if (!m.positions.some((p) => setNames.has(p))) {
        bad.push(`${m.email}: holds only territory position(s) [${m.positions.join(', ')}], so no permission set applies`);
      }
    }
    expect(bad, `demo reps that would log in as generic members:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('staffing lines up with the rules that grant, and the nodes that route', () => {
  it('every staffed position is named by a sharing rule or a permission set', () => {
    const referenced = new Set<string>();
    for (const rule of sharingRules) {
      if (rule.sharedWith?.type === 'position') referenced.add(String(rule.sharedWith.value));
    }
    for (const flow of flows) {
      for (const node of (flow.nodes ?? []) as AnyRec[]) {
        for (const a of (node.config?.approvers ?? []) as AnyRec[]) {
          if (a?.type === 'position') referenced.add(String(a.value));
        }
      }
    }
    for (const ps of permissionSets) if (positionNames.has(String(ps.name))) referenced.add(String(ps.name));

    const inert = [...staffedPositions].filter((p) => !referenced.has(p));
    expect(
      inert,
      `staffed positions nothing grants through — holding them changes nothing (#488):\n  ${inert.join('\n  ')}`,
    ).toEqual([]);
  });

  it("makes opportunity_approval's manager_review resolve to a real person", () => {
    const flow = flows.find((f) => f.name === 'opportunity_approval');
    expect(flow, 'opportunity_approval is not registered').toBeTruthy();
    const node = (flow!.nodes as AnyRec[]).find((n) => n.id === 'manager_review');
    expect(node, 'manager_review node is gone').toBeTruthy();

    const approvers = (node!.config?.approvers ?? []) as AnyRec[];
    expect(approvers.length, 'manager_review declares no approvers at all').toBeGreaterThan(0);
    const unstaffed = approvers
      .filter((a) => a?.type === 'position' && !staffedPositions.has(String(a.value)))
      .map((a) => String(a.value));
    expect(
      unstaffed,
      `manager_review routes to position(s) nobody in the demo org holds (${unstaffed.join(', ')}), so a ` +
      `submitted deal opens an EMPTY approver slate and — with lockRecord: true — locks the record ` +
      `with no in-product recovery. Staff the position, or reroute the node.`,
    ).toEqual([]);
  });

  it('keeps an empty-bench policy on the approval nodes it does NOT staff', () => {
    // `director_signoff` routes to `sales_director`, deliberately unstaffed. That
    // is only safe because the node declares what happens when the bench is
    // empty; without it the record locks undecidably.
    const bad: string[] = [];
    for (const flow of flows) {
      for (const node of (flow.nodes ?? []) as AnyRec[]) {
        if (node.type !== 'approval') continue;
        const approvers = (node.config?.approvers ?? []) as AnyRec[];
        const groupRouted = approvers.filter((a) => a?.type === 'position');
        if (groupRouted.length === 0) continue;
        const allStaffed = groupRouted.every((a) => staffedPositions.has(String(a.value)));
        if (allStaffed) continue;
        if (node.config?.onEmptyApprovers == null) {
          bad.push(`${flow.name} · ${node.id}: routes to an unstaffed position and declares no onEmptyApprovers`);
        }
      }
    }
    expect(bad, `approval nodes that can strand a locked record:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

/**
 * The arithmetic the demo rests on, recomputed from the REAL seeds through the
 * REAL hook and the seeder's own CEL compiler — the same chain
 * `test/territory-seed-coverage.test.ts` walks, asked here from the staffing
 * side: what does each staffed person actually get?
 */
describe('what each staffed person actually receives', () => {
  type Dataset = { object: string; records: AnyRec[] };
  const accountRecords = (CrmSeedData as unknown as Dataset[])
    .filter((d) => d.object === 'crm_account')
    .flatMap((d) => d.records);

  const project = async (record: AnyRec): Promise<AnyRec> => {
    const input: AnyRec = { ...record };
    await (accountHook as AnyRec).handler({ event: 'beforeInsert', input });
    return input;
  };

  const matches = (filter: AnyRec, row: AnyRec): boolean => {
    const entries = Object.entries(filter);
    if (entries.length !== 1) throw new Error(`expected a single-field filter, got ${JSON.stringify(filter)}`);
    const [field, condition] = entries[0];
    if (condition && typeof condition === 'object' && !Array.isArray(condition)) {
      const ops = Object.entries(condition as AnyRec);
      if (ops.length === 1 && ops[0][0] === '$in' && Array.isArray(ops[0][1])) {
        return (ops[0][1] as unknown[]).includes(row[field]);
      }
      throw new Error(`unsupported compiled operator: ${JSON.stringify(condition)}`);
    }
    return row[field] === condition;
  };

  /** Account names one staffed member receives through a named territory rule. */
  const receives = async (ruleName: string): Promise<string[]> => {
    const rule = sharingRules.find((r) => r.name === ruleName);
    if (!rule) throw new Error(`no sharing rule named ${ruleName}`);
    const compiled = compileCelToFilter(rule.condition ?? '', { variables: {} });
    if (!compiled.ok) throw new Error(`${ruleName}: condition does not compile (${compiled.reason})`);
    const rows = await Promise.all(accountRecords.map(project));
    return rows.filter((row) => matches(compiled.filter as AnyRec, row)).map((r) => String(r.name));
  };

  it('hands the NA rep six accounts and the EU rep two', async () => {
    const na = await receives('north_america_territory');
    const eu = await receives('europe_territory');
    expect(na.length, `north_america_territory covers [${na.join(', ')}]`).toBe(6);
    expect(eu.length, `europe_territory covers [${eu.join(', ')}]`).toBe(2);
    expect(na.filter((n) => eu.includes(n)), 'an account in BOTH territories hides which rule granted it').toEqual([]);
  });

  it('leaves the out-of-territory account invisible to both reps', async () => {
    // #638 seeded one account (SG) that matches NEITHER rule, deliberately: a
    // set with nothing outside the territories cannot tell a working filter
    // apart from a match-all one. It is a probe — do not remove or retune it.
    const na = await receives('north_america_territory');
    const eu = await receives('europe_territory');
    const rows = await Promise.all(accountRecords.map(project));
    const outside = rows.map((r) => String(r.name)).filter((n) => !na.includes(n) && !eu.includes(n));
    expect(
      outside.length,
      `every seeded account falls in a territory, so a match-all regression would be invisible`,
    ).toBeGreaterThan(0);
  });
});

describe('the published artifact cannot create these people (#640 hard constraint)', () => {
  it('ships no seed dataset that writes an identity table', () => {
    const bad = (CrmSeedData as unknown as Array<{ object: string }>)
      .filter((d) => IDENTITY_OBJECTS.includes(d.object))
      .map((d) => d.object);
    expect(
      bad,
      `seed datasets targeting identity tables: ${bad.join(', ')}. A seed runs in EVERY install, ` +
      `including a customer's — synthetic users must never reach one. (It would not work either: ` +
      `identity tables are managedBy better-auth and a seed cannot name a user.)`,
    ).toEqual([]);
  });

  it('ships no flow node that writes an identity table', () => {
    const bad: string[] = [];
    const walk = (nodes: AnyRec[], flowName: string) => {
      for (const node of nodes ?? []) {
        const objectName = node?.config?.objectName;
        const writes = ['create_record', 'update_record', 'delete_record'].includes(String(node?.type));
        if (writes && IDENTITY_OBJECTS.includes(String(objectName))) {
          bad.push(`${flowName} · ${node.id}: ${node.type} on ${objectName}`);
        }
        if (node?.config?.body?.nodes) walk(node.config.body.nodes as AnyRec[], flowName);
      }
    };
    for (const flow of flows) walk((flow.nodes ?? []) as AnyRec[], String(flow.name));
    expect(
      bad,
      `flow nodes that would provision identity inside any install, customer orgs included:\n  ${bad.join('\n  ')}`,
    ).toEqual([]);
  });

  it('keeps the staffing table out of the stack entirely', () => {
    // The strongest form of the constraint: whatever `objectstack build` writes
    // into the artifact, none of these accounts are in it. The table is reached
    // only by `scripts/demo-staff.ts` and by this suite.
    expect(
      Object.keys(sharingBarrel),
      'src/sharing/index.ts must not re-export DemoOrgStaffing — the barrel is what objectstack.config.ts reads',
    ).not.toContain('DemoOrgStaffing');

    const serialized = JSON.stringify(stack, (_k, v) => (typeof v === 'function' ? undefined : v));
    for (const member of DemoOrgStaffing) {
      expect(
        serialized.includes(member.email),
        `${member.email} appears in the app manifest — it would install into a customer org`,
      ).toBe(false);
    }
  });
});

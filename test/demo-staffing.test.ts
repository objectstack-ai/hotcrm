// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { compileCelToFilter } from '@objectstack/formula';
import stack from '../objectstack.config';
import accountHook from '../src/objects/account.hook';
import caseHooks from '../src/objects/case.hook';
import { CrmSeedData } from '../src/data/index';
import { DemoOrgStaffing } from '../src/sharing/demo-staffing';
import * as sharingBarrel from '../src/sharing/index';
import { makeCtx, makeHarness, hookNamed } from './helpers/hook-harness';

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

/** Someone whose visible rows are supposed to be bounded by a territory rule. */
const territorial = (m: { positions: readonly string[] }) =>
  m.positions.some((p) => p === 'na_sales_team' || p === 'eu_sales_team');

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
    // Five since the 2026-08-31 ruling added the two case-routing pools.
    expect(DemoOrgStaffing.length).toBeGreaterThanOrEqual(5);
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
  it('staffs both territories, the sales manager and the two case pools — one holder each', () => {
    // The five people are exactly the ones that turn a dark mechanism on: two
    // territory holders (who must not own the accounts), one approver, and the
    // two case-routing pools a shipped hook picks an owner out of.
    expect(holdersOf('na_sales_team').length, 'nobody holds na_sales_team').toBe(1);
    expect(holdersOf('eu_sales_team').length, 'nobody holds eu_sales_team').toBe(1);
    expect(holdersOf('sales_manager').length, 'nobody holds sales_manager').toBe(1);
    expect(
      holdersOf('na_sales_team')[0].email,
      'the two territories must be held by DIFFERENT people, or neither rule is distinguishable',
    ).not.toBe(holdersOf('eu_sales_team')[0].email);

    // ONE is the whole allowance the 2026-08-31 ruling granted — "the minimum
    // that lights the mechanism, NOT an org chart". A second holder in either
    // pool is org-chart growth and needs the same conversation the first one
    // had, so it fails here rather than arriving as a tidy-up.
    expect(
      holdersOf('service_agent').length,
      'the case INTAKE pool must hold exactly one demo agent (2026-08-31: the minimum that lights ' +
      'case_auto_assign, not an org chart)',
    ).toBe(1);
    expect(
      holdersOf('service_manager').length,
      'the ESCALATION pool must hold exactly one demo manager (2026-08-31: the minimum that lights ' +
      'case_escalation_reassign, not an org chart)',
    ).toBe(1);
    expect(
      holdersOf('service_agent')[0].email,
      'one person holding BOTH case pools would make intake and escalation indistinguishable — the ' +
      'case would land on the same desk either way, and neither hook would prove anything',
    ).not.toBe(holdersOf('service_manager')[0].email);
  });

  it('leaves the leadership bench empty on purpose', () => {
    // Decided in #640: staffing exists to make the mechanism observable, not to
    // populate an org chart. A real deployment staffs its own people, and an
    // empty bench is the honest depiction of that. Filling one of these in
    // needs the same conversation the first three had — hence a failing test,
    // not a silent addition.
    //
    // The list is SIX, not the eight it was, and the two that left it are why
    // this message now draws a DISTINCTION instead of stating a blanket. The
    // 2026-08-31 ruling staffed `service_agent` and `service_manager` for a
    // reason none of the six shares — see the failure text, which is where the
    // next agent standing at this fence will actually read it.
    const DELIBERATELY_UNSTAFFED = [
      'executive', 'sales_director', 'service_director',
      'marketing_director', 'marketing_manager', 'marketing_user',
    ];
    const surprises = DELIBERATELY_UNSTAFFED.filter((p) => staffedPositions.has(p));
    expect(
      surprises,
      `these positions were deliberately left unstaffed in #640 — staffing them is a decision, ` +
      `not a tidy-up: ${surprises.join(', ')}\n` +
      `\n` +
      `  WHY TWO POSITIONS ARE STAFFED AND THESE SIX ARE NOT. Exactly two have ever crossed this ` +
      `fence — service_agent and service_manager, maintainer ruling 2026-08-31 — and the bar they ` +
      `cleared is the only one that opens it: a shipped HOOK PICKS AN OWNER out of that pool ` +
      `(case_auto_assign #596, case_escalation_reassign #1070 — src/objects/_case-assignment.ts), ` +
      `so an empty pool was not a bench nobody sits on but a code path that never ran on a demo ` +
      `box at all.\n` +
      `  Every position above fails that bar. Each one only RECEIVES a share or an approval — a ` +
      `mechanism the staffed sales_manager and the two territory reps already demonstrate — and ` +
      `the approval nodes routing to them declare onEmptyApprovers: 'admin_rescue', so the empty ` +
      `bench is itself part of what the demo shows. "It looks unstaffed" is NOT the bar; neither ` +
      `is "the rule has no holder". Get a ruling first, the way #640 and 2026-08-31 both did.`,
    ).toEqual([]);
  });

  it('pairs each territory position with a functional one that carries a permission set', () => {
    // A territory position is a RECORD grouping: no permission set binds to
    // `na_sales_team` / `eu_sales_team`, so on its own it says nothing about
    // what a user may DO. Measured: a user holding only `eu_sales_team` still
    // reads the 2 EU accounts — the object door is opened by the platform's
    // additive `member_default` baseline (ADR-0090 D5) and the rows come from
    // the share — i.e. the demo would show a generic org member who happens to
    // see two records, not a sales rep.
    const setNames = new Set(permissionSets.map((p) => String(p.name)));
    const bad: string[] = [];
    for (const m of DemoOrgStaffing) {
      if (!territorial(m)) continue;
      // A set whose NAME matches a position is bound to it at install time.
      if (!m.positions.some((p) => setNames.has(p))) {
        bad.push(`${m.email}: holds only territory position(s) [${m.positions.join(', ')}], so no permission set applies`);
      }
    }
    expect(bad, `demo reps that would log in as generic members:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('never gives a territory rep an org-wide view of crm_account', () => {
    // THE mechanism question, pinned. What bounds a rep to their territory is
    // NOT their profile — it is `crm_account`'s `private` OWD (rows are
    // owner-visible only, and the reps own nothing) plus the `sys_record_share`
    // rows their territory rule materialised. Read DEPTH is the "widest across
    // granting sets" (ADR-0057 D1), and both sets in play compute `own`:
    // `member_default` (the additive baseline every org member holds) and
    // `SalesRepProfile.crm_account` (`viewAllRecords: false, readScope: 'own'`).
    //
    // So a single flipped bit on any set bound to a position a rep holds —
    // `viewAllRecords: true` — widens the depth to all-rows, the rep reads all
    // nine accounts, and the territory grant proves nothing while the org still
    // looks correctly staffed. That is not hypothetical: it is exactly what
    // `sales_manager` does (measured: she reads all 9, which is right for a
    // manager). Without this assertion the whole demo would be true by
    // coincidence, and a profile edit could switch it off in silence.
    const setByName = new Map(permissionSets.map((p) => [String(p.name), p]));
    const bad: string[] = [];
    for (const m of DemoOrgStaffing) {
      if (!territorial(m)) continue;
      for (const position of m.positions) {
        const grant = (setByName.get(position)?.objects ?? {})['crm_account'];
        if (!grant) continue;
        if (grant.viewAllRecords === true) {
          bad.push(
            `${m.email}: position "${position}" grants viewAllRecords on crm_account — they would ` +
            `read every account, territory or not`,
          );
        }
        if (grant.readScope != null && grant.readScope !== 'own') {
          bad.push(
            `${m.email}: position "${position}" reads crm_account at scope "${grant.readScope}", ` +
            `which is wider than the 'own' depth the territory demo rests on`,
          );
        }
      }
    }
    expect(
      bad,
      `territory reps whose row set is no longer bounded by sharing:\n  ${bad.join('\n  ')}`,
    ).toEqual([]);
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
    await (accountHook as AnyRec).handler(makeCtx({ event: 'beforeInsert', input }));
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

/**
 * The two case-routing pools, DEMONSTRATED rather than asserted into existence.
 *
 * Everything above this point checks the TABLE. This block checks the POINT of
 * the table: it builds `sys_user_position` exactly as `pnpm demo:staff` leaves
 * it — one row per person per position they hold — and drives the two REAL
 * hooks against it. Before the 2026-08-31 ruling both pools were empty here and
 * both hooks took their no-op path on every demo box, which is what the card
 * behind that ruling was about. Delete either staffing row and these go red
 * with the sentence that says which feature went dark again.
 *
 * The pool rows key on the person's login rather than a user id: the real ids
 * are minted by better-auth when the script runs, and the email is the stable
 * identifier this table declares. The hooks only ever compare and copy the
 * value, so it stands in exactly.
 */
describe('the case-routing pools actually route (what this staffing lights)', () => {
  const assign = hookNamed(caseHooks, 'case_auto_assign');
  const escalationReassign = hookNamed(caseHooks, 'case_escalation_reassign');

  /** `sys_user_position` as the demo box would hold it after `pnpm demo:staff`. */
  const demoPositionRows = DemoOrgStaffing.flatMap((m) =>
    m.positions.map((position) => ({ user_id: m.email, position })),
  );
  const holderOf = (position: string) => holdersOf(position)[0]?.email;

  it('round-robins an ownerless case onto the demo service agent (#596)', async () => {
    const harness = makeHarness({ sys_user_position: demoPositionRows, crm_case: [] });
    const input: AnyRec = { subject: 'Web-to-case: cannot sign in', status: 'new', origin: 'web' };

    await assign.handler(makeCtx({ event: 'beforeInsert', input, api: harness.api }));

    expect(
      input.owner_id,
      `case_auto_assign left the case OWNERLESS against the demo org's own position rows — the ` +
      `service_agent pool is empty again, so intake round-robin is back to the no-op path on every ` +
      `demo box and the unassigned_triage tab is the whole story.`,
    ).toBe(holderOf('service_agent'));
  });

  it('hands an escalating case to the demo service manager (#1070)', async () => {
    const harness = makeHarness({ sys_user_position: demoPositionRows, crm_case: [] });
    const previous: AnyRec = { id: 'case_1', status: 'in_progress', owner_id: 'someone_else' };
    const input: AnyRec = { status: 'escalated' };

    await escalationReassign.handler(
      makeCtx({ event: 'beforeUpdate', input, previous, api: harness.api }),
    );

    expect(
      input.owner_id,
      `case_escalation_reassign moved NOTHING against the demo org's own position rows — the ` +
      `service_manager pool is empty again, so escalation is only a flag and a status and the ` +
      `agent who could not get to the case in time stays the only person who can work it.`,
    ).toBe(holderOf('service_manager'));
  });

  it('lands intake and escalation on DIFFERENT desks', async () => {
    // The negative control for the two assertions above: if one person held
    // both pools, each hook would still look like it worked while proving
    // nothing about which pool it read.
    expect(holderOf('service_agent')).not.toBe(holderOf('service_manager'));
  });

  it('gives each crm_case position rule its first holder — and names the one it does NOT', () => {
    // The mechanism census, pinned as an exact list because the interesting
    // part is the ZERO. The ruling that authorised this staffing counted FOUR
    // mechanisms lit, `case_director_sharing` among them — measured, that one
    // is NOT lit: its recipient is `service_director`, which the same ruling
    // leaves empty. The fourth mechanism these rows actually reach is
    // `case_unassigned_triage_sharing` (#1096's read side), which the ruling
    // did not name. Staffing service_director to "finish the set" is the
    // org-chart move the fence above exists to stop.
    const census = sharingRules
      .filter((r) => r.object === 'crm_case' && r.sharedWith?.type === 'position')
      .map((r) => `${String(r.name)}\u2192${String(r.sharedWith.value)}: ${holdersOf(String(r.sharedWith.value)).length} holder(s)`)
      .sort();
    expect(census).toEqual([
      'case_director_sharing\u2192service_director: 0 holder(s)',
      'case_escalation_sharing\u2192service_manager: 1 holder(s)',
      'case_unassigned_triage_sharing\u2192service_agent: 1 holder(s)',
    ]);
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

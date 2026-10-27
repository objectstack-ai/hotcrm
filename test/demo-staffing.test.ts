// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { VerifyStack } from '@objectstack/verify';
import stack from './helpers/composed-stack';
import { CrmSeedData } from '../objectstack.composition';
import { CASE_DESK, caseDeskOf, DemoAdminPermissionSets, DemoOrgStaffing, DemoPipelineOwnership } from '../src/sales/sharing/demo-staffing';
import * as salesSeeds from '../src/sales/data';
import * as serviceSeeds from '../src/service/data';
import { CrmSharing as sharingBarrel } from './helpers/src-roster';
import { hotcrmStack, systemUpdate, type Person } from './helpers/verify-stack';
import { regionsOf } from './helpers/flow-regions';
import { REPO_ROOT } from './helpers/repo-root';

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
 * It pins every authoring-time premise the script depends on — that each
 * staffed position is declared, that the positions chosen are the ones the
 * sharing rules and the approval nodes actually name, and — the load-bearing
 * one — that **the published artifact contains no mechanism that could create
 * these people**. That last group is what keeps "a real deployment installs
 * none of them" a structural fact rather than a promise.
 *
 * And it RUNS the script (#2129): `scripts/demo-staff.ts`'s own `main()`, its
 * `fetch` pointed at the shipped app booted by `@objectstack/verify`, so every
 * request goes through the same Hono app and routes a dev server answers. The
 * people every block below reads are the ones that run created, signed in
 * with the table's own passwords; on top of them this file reads the
 * territory arithmetic (6/2/1 against the real seeds), the two case pools,
 * and who submitted the large-deal approvals the run opened. What it cannot
 * reach: a socket and a separate server process (`pnpm dev`), and the
 * Approvals inbox as a page.
 */

type AnyRec = Record<string, any>;

/** What one run of `scripts/demo-staff.ts` left behind: its exit code and everything it printed. */
type ScriptRun = { exit: unknown; output: string[] };

/**
 * `pnpm demo:staff`, run against the shipped app.
 *
 * The script is imported the way `test/backfill-query-bodies.test.ts` imports
 * it, so its own `main()` runs its real request code; here `fetch` is pointed
 * at the booted app (`raw` injects the request into the real Hono app at the
 * origin `@objectstack/verify` serves) instead of being answered by a stub.
 * `--url` names that origin, and `process.exit` is captured rather than
 * allowed to end the worker.
 *
 * ONE call is answered by the harness instead of by the app: step 1's
 * `POST /api/v1/auth/admin/create-user`. The verify boot does not mount
 * better-auth's admin plugin (`auth.plugins.admin`; that route answers 501
 * here, while `pnpm dev` mounts it), so the person is created through the
 * harness's own sign-up door with the same email, password and name, and the
 * script receives the id the way `create-user` returns it. Every later
 * request, the persona sign-ins included, is the app's.
 */
async function runDemoStaff(on: VerifyStack): Promise<ScriptRun> {
  const origin = 'http://localhost:3000';
  const realFetch = globalThis.fetch;
  vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.origin !== origin) return realFetch(input, init);
    if (url.pathname === '/api/v1/auth/admin/create-user' && init?.method === 'POST') {
      const { email, password, name } = JSON.parse(String(init.body));
      const token = await on.signUp(email, password, name);
      const id = String((await on.contextFor(token)).userId);
      return new Response(JSON.stringify({ data: { user: { id, email } } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return on.raw(`${url.pathname}${url.search}`, init);
  });
  const output: string[] = [];
  const capture = (...parts: unknown[]) => { output.push(parts.map(String).join(' ')); };
  const log = vi.spyOn(console, 'log').mockImplementation(capture);
  const error = vi.spyOn(console, 'error').mockImplementation(capture);
  const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
  const argv = process.argv;
  process.argv = [argv[0]!, 'demo-staffing.test', '--url', origin];
  try {
    await import(pathToFileURL(join(REPO_ROOT, 'scripts', 'demo-staff.ts')).href);
    await vi.waitFor(() => {
      if (exit.mock.calls.length === 0) throw new Error('scripts/demo-staff.ts has not exited yet');
    }, { timeout: 150_000, interval: 50 });
    return { exit: exit.mock.calls[0]?.[0], output };
  } finally {
    process.argv = argv;
    exit.mockRestore();
    error.mockRestore();
    log.mockRestore();
    vi.unstubAllGlobals();
  }
}

/**
 * The demo org on the shipped app, as `pnpm demo:staff` leaves it: the script
 * creates each table row as a real, loginable account holding the positions
 * the table gives it (a position grants the permission sets its definition
 * declares in `permissionSets`, which is how the table grants anything), hands
 * them the book, re-evaluates the rules
 * and has each owner save their deals. Each person is then signed in with the
 * table's password.
 */
let verify: VerifyStack;
let admin: string;
let run: ScriptRun;
/** The dev admin's export answer on `crm_account` BEFORE the script ran: #2061's control reading. */
let adminExportBefore: ExportAnswer;
const staffed: Record<string, Person> = {};
/**
 * What the platform's logger wrote while `beforeAll` booted the app, ran the
 * script and signed each person in (#2200). The logger writes to
 * `process.stdout`, not through `console`, so that stream is what is read.
 */
const bootLog: string[] = [];
beforeAll(async () => {
  const write = process.stdout.write.bind(process.stdout);
  const capture = vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: unknown, ...rest: unknown[]) => {
    bootLog.push(String(chunk));
    return (write as (...args: unknown[]) => boolean)(chunk, ...rest);
  }) as typeof process.stdout.write);
  try {
    verify = await hotcrmStack();
    admin = await verify.signIn();
    adminExportBefore = await exportAnswer(admin, 'crm_account');
    run = await runDemoStaff(verify);
    for (const m of DemoOrgStaffing) {
      const token = await verify.signIn(m.email, m.password).catch((err: unknown) => {
        throw new Error(`${m.email} cannot sign in after scripts/demo-staff.ts ran (exit ${String(run.exit)}): ${String(err)}\n${run.output.join('\n')}`);
      });
      staffed[m.key] = { token, id: String((await verify.contextFor(token)).userId) };
    }
  } finally {
    capture.mockRestore();
  }
}, 240_000);

type ExportAnswer = { status: number; code?: string };

/** What the export door, `GET /api/v1/data/OBJECT/export`, answers `token`: the status, and a refusal's code. */
async function exportAnswer(token: string, object: string): Promise<ExportAnswer> {
  const res = await verify.apiAs(token, 'GET', `/data/${object}/export?format=json`);
  if (res.status === 200) return { status: 200 };
  const body = (await res.json().catch(() => ({}))) as AnyRec;
  return { status: res.status, code: body.code ?? body.error?.code };
}

const positions: AnyRec[] = (stack as any).positions ?? [];
const sharingRules: AnyRec[] = (stack as any).sharingRules ?? [];
const permissionSets: AnyRec[] = (stack as any).permissions ?? [];
const flows: AnyRec[] = (stack as any).flows ?? [];

const positionNames = new Set(positions.map((p) => String(p.name)));
const shippedSetNames = new Set(permissionSets.map((p) => String(p.name)));
/** The permission sets a position's own definition declares (`permissionSets`, ADR-0131 D3/D4): the only binding (#2200). */
const declaredSets = (position: string): string[] =>
  ((positions.find((p) => String(p.name) === position)?.permissionSets ?? []) as unknown[]).map(String);
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
    const bad: string[] = [];
    for (const m of DemoOrgStaffing) {
      if (!territorial(m)) continue;
      // A position grants the sets it declares, each one this app ships.
      if (!m.positions.some((p) => declaredSets(p).some((s) => shippedSetNames.has(s)))) {
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
        for (const set of declaredSets(position)) {
          const grant = (setByName.get(set)?.objects ?? {})['crm_account'];
          if (!grant) continue;
          if (grant.viewAllRecords === true) {
            bad.push(
              `${m.email}: position "${position}" (set "${set}") grants viewAllRecords on crm_account — ` +
              `they would read every account, territory or not`,
            );
          }
          if (grant.readScope != null && grant.readScope !== 'own') {
            bad.push(
              `${m.email}: position "${position}" (set "${set}") reads crm_account at scope ` +
              `"${grant.readScope}", which is wider than the 'own' depth the territory demo rests on`,
            );
          }
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
  it('every staffed position is named by a sharing rule or an approval, or declares a permission set', () => {
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
    for (const p of positionNames) if (declaredSets(p).some((s) => shippedSetNames.has(s))) referenced.add(p);

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
 * Each position names the permission sets it distributes, and none reaches a
 * set through the platform's name fold (#2200).
 *
 * The platform still folds a held position's name onto a same-named set, and
 * logs `position_name_fold_grant` when that fold, and no declaration, is what
 * granted it; the fold is ruled for retirement (objectstack#13419, ruling B).
 * Measured on 18.0.0 before the declarations: this boot logged it for
 * `sales_rep`, `sales_manager`, `service_agent` and `service_manager`, and Setup
 * showed no set on those positions and nobody on each set's Assigned Users panel.
 * The warning is read only for the positions a staffed person holds, the ones
 * this boot resolves; `marketing_user`, staffed by nobody, is held by the
 * roster pin alone.
 */
describe('each position names the sets it distributes, and none is reached by the name fold (#2200)', () => {
  it('declares the seven bindings, each to a set the app ships', () => {
    const declared = Object.fromEntries(
      [...positionNames].filter((p) => declaredSets(p).length > 0).map((p) => [p, declaredSets(p)]),
    );
    expect(declared).toEqual({
      sales_manager: ['sales_manager'],
      sales_rep: ['sales_rep'],
      // The #1779 ruling: the escalation pool works tickets with the agent's grants.
      service_manager: ['service_agent'],
      service_agent: ['service_agent'],
      // The two marketing rungs lead the marketers and hold their set (#2338 item 3).
      marketing_director: ['marketing_user'],
      marketing_manager: ['marketing_user'],
      marketing_user: ['marketing_user'],
    });
    expect(Object.values(declared).flat().filter((s) => !shippedSetNames.has(s)), 'a binding names a set the app does not ship').toEqual([]);
  });

  it('each staffed person resolves every set their positions declare', async () => {
    const missing: string[] = [];
    for (const m of DemoOrgStaffing) {
      const res = await verify.apiAs(staffed[m.key]!.token, 'GET', '/auth/me/permissions');
      expect(res.status, await res.clone().text()).toBe(200);
      const body = (await res.json()) as AnyRec;
      const resolved = new Set(((body.data ?? body).permissionSets ?? []).map(String));
      for (const set of m.positions.flatMap(declaredSets)) if (!resolved.has(set)) missing.push(`${m.email}: ${set}`);
    }
    expect(missing, 'declared sets a staffed person does not resolve').toEqual([]);
  });

  it('the boot logs no position_name_fold_grant naming a HotCRM position', () => {
    const lines = bootLog.join('').split('\n');
    expect(lines.some((l) => /\b(INFO|WARN)\b/.test(l)), 'the capture read none of the platform logger, so it proves nothing').toBe(true);
    const folded = lines
      .filter((l) => l.includes('position_name_fold_grant'))
      .filter((l) => [...positionNames].some((p) => l.includes(`'${p}'`)));
    expect(folded, 'a HotCRM position reached a set only by sharing its name: declare it in permissionSets').toEqual([]);
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
  const seededNames = (CrmSeedData as unknown as Dataset[])
    .filter((d) => d.object === 'crm_account')
    .flatMap((d) => d.records)
    .map((r) => String(r.name));

  /**
   * `pnpm demo:staff` step 4: re-evaluate the territory rules through the
   * platform's own door (`POST /sharing/rules/:idOrName/evaluate`, as the
   * admin) — the seeded accounts were written as the system, which
   * materialises no grant, and the people above did not exist yet when they
   * were.
   *
   * Both rules are declared by the app, and since @objectstack/spec
   * 18.0.0-next.4 a declared rule has no `sys_sharing_rule` row: plugin-sharing
   * reads it from the registry and its id IS its name (changeset
   * `23952-declared-sharing-rules-registry`). So each is read and evaluated
   * through the sharing door, by name.
   */
  beforeAll(async () => {
    for (const name of ['north_america_territory', 'europe_territory']) {
      const rule = await verify.apiAs(admin, 'GET', `/sharing/rules/${name}`);
      expect(rule.status, `sharing rule ${name} is not served: ${await rule.clone().text()}`).toBe(200);
      const res = await verify.apiAs(admin, 'POST', `/sharing/rules/${name}/evaluate`);
      expect(res.status, await res.clone().text()).toBe(200);
    }
  }, 120_000);

  /** The seeded accounts `key`'s person can read. */
  const receives = async (key: string): Promise<string[]> =>
    (await verify.rows('crm_account', { name: { $in: seededNames } }, { as: staffed[key]!.token })).map((r) => String(r.name));

  it('hands the NA rep six accounts and the EU rep two', async () => {
    const na = await receives('na_rep');
    const eu = await receives('eu_rep');
    expect(na.length, `the NA rep reads [${na.join(', ')}]`).toBe(6);
    expect(eu.length, `the EU rep reads [${eu.join(', ')}]`).toBe(2);
    expect(na.filter((n) => eu.includes(n)), 'an account in BOTH territories hides which rule granted it').toEqual([]);
  });

  it('leaves the out-of-territory account invisible to both reps', async () => {
    // #638 seeded one account (SG) that matches NEITHER rule, deliberately: a
    // set with nothing outside the territories cannot tell a working filter
    // apart from a match-all one. It is a probe — do not remove or retune it.
    const na = await receives('na_rep');
    const eu = await receives('eu_rep');
    const outside = seededNames.filter((n) => !na.includes(n) && !eu.includes(n));
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
  /**
   * The demo person this pool routes to — pinned as a STRING before it is
   * compared to anything.
   *
   * Measured while writing this block: comparing `owner_id` straight to the
   * holder's id passes VACUOUSLY on an unstaffed pool, because a hook that
   * no-ops leaves `owner_id` unset and the lookup returns undefined too — the
   * two demonstrations below stayed green with both staffing rows deleted,
   * i.e. exactly when the feature was dark again. So the empty pool fails
   * here, on its own line, before any comparison.
   */
  const holderOf = (position: string): string => {
    const key = holdersOf(position)[0]?.key;
    const id = key ? staffed[key]?.id : undefined;
    expect(
      id,
      `nobody in the demo org holds "${position}" — the pool the hook reads is empty, so the ` +
      `assertion below would be comparing undefined to undefined and would pass while the ` +
      `mechanism is dark`,
    ).toBeTypeOf('string');
    return String(id);
  };

  it('round-robins an ownerless case onto the demo service agent (#596)', async () => {
    // Ownerless intake: a case the system writes (an email-to-case
    // integration, an import). An anonymous web form's case reaches the same
    // pool, read elevated (#2014; pinned in case-assignment.test.ts).
    const [kase] = await verify.seed('crm_case', [{
      subject: 'Email-to-case: cannot sign in', description: 'Forwarded from support@.', status: 'new',
    }]);
    const [stored] = await verify.rows('crm_case', { id: kase!.id });
    expect(
      stored!.owner_id,
      `case_auto_assign left the case OWNERLESS against the demo org's own position rows — the ` +
      `service_agent pool is empty again, so intake round-robin is back to the no-op path on every ` +
      `demo box and the unassigned_triage tab is the whole story.`,
    ).toBe(holderOf('service_agent'));
  });

  /** A case the demo agent opened and works. */
  const agentsCase = async (): Promise<{ agent: Person; id: string }> => {
    const agent = staffed[holdersOf('service_agent')[0]!.key]!;
    const kase = await verify.hooks.run('crm_case', 'insert', {
      subject: 'Escalate me', description: 'Customer is waiting.', status: 'in_progress',
    }, { as: agent.token });
    return { agent, id: String(kase.id) };
  };

  it('hands an escalating case to the demo service manager (#1070)', async () => {
    // The escalation the SLA sweep writes — `case_sla_monitor`'s `flag_breach`
    // node sets `status: 'escalated'` as the system (`runAs: 'system'`).
    const { id } = await agentsCase();
    await systemUpdate(verify, 'crm_case', { id, status: 'escalated' });
    const [stored] = await verify.rows('crm_case', { id });

    expect(
      stored!.owner_id,
      `case_escalation_reassign moved NOTHING against the demo org's own position rows — the ` +
      `service_manager pool is empty again, so escalation is only a flag and a status and the ` +
      `agent who could not get to the case in time stays the only person who can work it.`,
    ).toBe(holderOf('service_manager'));
  });

  /**
   * An agent escalating their own case — the record form, or the
   * `escalate_case` screen action, whose `escalate` node deliberately keeps the
   * status write in the acting user's context so the hand-off "fires from the
   * ACTING USER's write" — hands it to the demo service manager too (#2014).
   * The agent may not read the pool (`sys_user_position`), so the hand-off
   * reads it elevated (`runAs: 'system'`); before it did, the read was refused,
   * the hook stood down, and the case stayed with the agent.
   */
  it('hands an agent’s own escalation to the demo service manager', async () => {
    const { agent, id } = await agentsCase();
    await verify.hooks.run('crm_case', 'update', { id, status: 'escalated' }, { as: agent.token });
    const [stored] = await verify.rows('crm_case', { id });
    expect(stored!.status).toBe('escalated');
    expect(
      stored!.owner_id,
      `case_escalation_reassign left the agent's own escalation on the agent — the hand-off no longer ` +
      `reaches the service_manager pool from a person's write, only from the SLA sweep's.`,
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

/**
 * Who asks for the large-deal approvals (#2129) — read off the run in
 * `beforeAll`, not re-enacted.
 *
 * `opportunity_approval` fires on ANY update of an open deal at or above the
 * large-deal line that is not yet in approval, and the request names the
 * writer as submitter. A seeded deal opens none (the seed loader writes with
 * `skipTriggers`), so whoever makes the first write after the seed is the one
 * who asked, and that write is the script's hand-over, a PATCH of `owner_id`
 * as the dev admin with every control in force. So the request on each of the
 * two seeded open deals over the line names the DEV ADMIN as submitter, waits
 * on the sales manager, and the deal belongs to the rep its territory routes
 * it to.
 *
 * Through 18.0.0-next.3 the script handed these deals over through the import
 * door with `runAutomations: false` and had each owner save their deal, so the
 * request named the rep. Since 18.0.0-next.4 the import door refuses that
 * opt-out to every caller but the system principal (objectstack#24348). A
 * recall does not bring the rep back as submitter either: measured on
 * 18.0.0-next.5, a recalled request leaves the deal's `approval_status` at
 * `recalled`, and the flow enters only from `not_required`, so the owner's next
 * save opens nothing (hotcrm#2179).
 */
describe('pnpm demo:staff on the shipped app: the hand-over opens each large-deal approval, as the dev admin (#2129)', () => {
  /** The two open deals the seed prices over the line, by name (`test/seed-consistency.test.ts` pins them). */
  const LARGE_OPEN_DEALS = ['Acme Platform Upgrade', 'Wayne Enterprise License'];

  it('finishes with its own verdict green', () => {
    expect(run.exit, `scripts/demo-staff.ts did not connect:\n${run.output.join('\n')}`).toBe(0);
  });

  it("opens each large deal's request on the hand-over, waiting on the sales manager", async () => {
    const adminId = String((await verify.contextFor(admin)).userId);
    const personaIds = new Set(Object.values(staffed).map((p) => p.id));
    const manager = staffed[holdersOf('sales_manager')[0]!.key]!.id;
    const deals = await verify.rows('crm_opportunity', { name: { $in: LARGE_OPEN_DEALS } });
    expect(deals.map((d) => String(d.name)).sort(), 'the seeded large open deals are not both there').toEqual(
      [...LARGE_OPEN_DEALS].sort(),
    );

    for (const deal of deals) {
      const owner = String(deal.owner_id ?? '');
      expect(personaIds.has(owner), `${deal.name} is owned by ${owner || 'nobody'}, not by a demo person`).toBe(true);
      const requests = await verify.rows('sys_approval_request', {
        object_name: 'crm_opportunity',
        record_id: deal.id,
        status: 'pending',
      });
      expect(requests.length, `${deal.name}: ${requests.length} pending approval request(s), expected its one`).toBe(1);
      const [request] = requests;
      expect(
        String(request!.submitter_id),
        `${deal.name}: the request names ${request!.submitter_id === owner ? 'the rep who owns the deal' : request!.submitter_id} ` +
        `as submitter, not the dev admin whose hand-over is the first write after the seed.`,
      ).toBe(adminId);
      expect(request!.current_step).toBe('manager_review');
      expect(String(request!.pending_approvers ?? '').split(','), `${deal.name}: not waiting on the sales manager`).toEqual([
        manager,
      ]);
    }
  });

  it("leaves the dev admin's inbox empty and decides nothing", async () => {
    // Wayne's director tier lands on the admin (`admin_rescue`) only once the
    // sales manager approves the manager tier; the script approves nothing, so
    // the admin waits on none of these and every action on them is a submit.
    const adminId = String((await verify.contextFor(admin)).userId);
    const deals = await verify.rows('crm_opportunity', { name: { $in: LARGE_OPEN_DEALS } });
    const dealIds = new Set(deals.map((d) => String(d.id)));
    const res = await verify.apiAs(admin, 'GET', `/approvals/requests?status=pending&approverId=${adminId}`);
    expect(res.status, await res.clone().text()).toBe(200);
    const inbox = ((await res.json()).data ?? []) as AnyRec[];
    expect(inbox.filter((r) => dealIds.has(String(r.record_id))).map((r) => String(r.current_step))).toEqual([]);

    const requests = await verify.rows('sys_approval_request', { object_name: 'crm_opportunity', record_id: { $in: [...dealIds] } });
    const actions = await verify.rows('sys_approval_action', { request_id: { $in: requests.map((r) => r.id) } });
    expect(actions.map((a) => String(a.action)).sort()).toEqual(requests.map(() => 'submit'));
  });
});

/**
 * Every seeded case has a named owner once `pnpm demo:staff` has run (#2206).
 *
 * Until `crm_case` was routed, which persona owned the demo's cases depended on
 * timing. Measured on 18.0.0, fresh `pnpm dev`: run while the seed was still
 * writing, `case_auto_assign` put all 38 on the service agent; run after it
 * settled, all 38 stayed with the dev admin, and the agent's
 * `GET /api/v1/data/crm_case` answered `total: 0`. The script now waits for the
 * seed and hands each case to its desk (`CASE_DESK`): escalated and critical
 * cases to the service manager, the rest to the service agent. On the same
 * fresh boot that left the agent 23 cases (12 open) and the manager 15.
 */
describe('pnpm demo:staff hands every seeded case to its service desk (#2206)', () => {
  const seededCases = (CrmSeedData as ReadonlyArray<AnyRec>)
    .filter((d) => d.object === 'crm_case')
    .flatMap((d) => (d.records ?? []) as AnyRec[]);
  const subjects = seededCases.map((c) => String(c.subject));
  const ownerOfDesk = (desk: keyof typeof CASE_DESK) => staffed[CASE_DESK[desk]]!.id;

  it("waits on every routed object's whole seed: the barrels it reads carry all of CrmSeedData's rows for them", () => {
    // `scripts/demo-staff.ts` reads the two seed barrels rather than `CrmSeedData`
    // (see `seededKeysByObject`). A routed object seeded from anywhere else would
    // be routed without being waited for, which is the #2206 race again.
    const rowsOf = (datasets: ReadonlyArray<unknown>, object: string) =>
      (datasets as AnyRec[]).filter((d) => d?.object === object).reduce((n, d) => n + (d.records?.length ?? 0), 0);
    const barrels = Object.values({ ...salesSeeds, ...serviceSeeds });
    for (const { object } of DemoPipelineOwnership) {
      const seeded = rowsOf(CrmSeedData, object);
      expect(seeded, `${object} is routed but CrmSeedData seeds no row of it`).toBeGreaterThan(0);
      expect(rowsOf(barrels, object), `${object}: the seed barrels the script reads miss some of its seeded rows`).toBe(seeded);
    }
  });

  it('puts seeded cases on both desks', () => {
    expect(seededCases.length, 'no seeded case found in CrmSeedData').toBeGreaterThan(0);
    const desks = new Set(seededCases.map(caseDeskOf));
    expect([...desks].sort(), 'every seeded case lands on one desk, so the other persona has nothing').toEqual([
      'escalation',
      'intake',
    ]);
  });

  it('leaves no seeded case with the dev admin or nobody, and each on its desk', async () => {
    const rows = await verify.rows('crm_case', { subject: { $in: subjects } });
    expect(rows.length, 'a seeded case is missing from the booted app').toBe(subjects.length);
    const misplaced = rows
      .filter((r) => String(r.owner_id ?? '') !== ownerOfDesk(caseDeskOf(r)))
      .map((r) => `${String(r.subject)} (${caseDeskOf(r)} desk) is owned by ${String(r.owner_id ?? 'nobody')}`);
    expect(misplaced, `scripts/demo-staff.ts output:\n${run.output.join('\n')}`).toEqual([]);
  });

  it('gives the service agent cases of their own to work, read as the agent', async () => {
    const agent = staffed[CASE_DESK.intake]!;
    const res = await verify.apiAs(agent.token, 'GET', '/data/crm_case');
    expect(res.status, await res.clone().text()).toBe(200);
    const records = ((await res.json()).records ?? []) as AnyRec[];
    expect(records.length, 'the service agent reads no case: their Customer Service page is all zeros').toBeGreaterThan(0);
    expect(records.filter((r) => !['resolved', 'closed'].includes(String(r.status))).length, 'no OPEN case to work').toBeGreaterThan(0);
  });
});

/**
 * The dev admin exports once `pnpm demo:staff` has run, and exports only what
 * the sets step 0 grants it name (#2061).
 *
 * Since 18.0.0 the platform's administrator sets carry no export (maintainer
 * ruling of 2026-08-15), so the dev admin's own sets export nothing and the
 * export it gets is exactly the app set's. The reading taken before the run is
 * the control: the same admin on the same boot, refused, so a 200 below is the
 * grant's and not a platform default's.
 */
describe('pnpm demo:staff gives the dev admin export, and only where system_admin grants it (#2061)', () => {
  const granted = new Set(DemoAdminPermissionSets.map((g) => g.permissionSet));
  const exportable = [...new Set(
    permissionSets
      .filter((ps) => granted.has(String(ps.name)))
      .flatMap((ps) => Object.entries((ps.objects ?? {}) as Record<string, AnyRec>)
        .filter(([, perm]) => perm.allowExport === true)
        .map(([objectName]) => objectName)),
  )].sort();

  it('names sets the app ships, each with a reason, and together they grant export', () => {
    const shipped = new Set(permissionSets.map((ps) => String(ps.name)));
    expect([...granted].filter((name) => !shipped.has(name)), 'the dev admin is granted a set the app does not ship').toEqual([]);
    expect(DemoAdminPermissionSets.filter((g) => g.demonstrates.trim() === '').map((g) => g.permissionSet)).toEqual([]);
    expect(exportable, "the dev admin's demo sets grant export on no object").not.toEqual([]);
  });

  it('refuses the dev admin before the run, and answers every object those sets export after it', async () => {
    expect(adminExportBefore, 'the control: before the run the dev admin must be refused').toEqual({
      status: 403,
      code: 'EXPORT_NOT_PERMITTED',
    });
    const after: Record<string, ExportAnswer> = {};
    for (const objectName of exportable) after[objectName] = await exportAnswer(admin, objectName);
    expect(after, `scripts/demo-staff.ts output:\n${run.output.join('\n')}`).toEqual(
      Object.fromEntries(exportable.map((objectName) => [objectName, { status: 200 }])),
    );
  });

  it('still refuses an object no granted set exports: no wildcard', async () => {
    expect(exportable).not.toContain('crm_quote');
    expect(await exportAnswer(admin, 'crm_quote')).toEqual({ status: 403, code: 'EXPORT_NOT_PERMITTED' });
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
        // Every control-flow region, not just `config.body`. Since
        // `src/flows/_guarded-iteration.ts` a loop body is one `try_catch`
        // guard and the writes sit in its `try` region — and this assertion is
        // of the "nothing anywhere does X" shape, so a walk that stopped at the
        // guard would keep passing while inspecting nothing at all.
        for (const region of regionsOf(node)) walk(region.nodes as AnyRec[], flowName);
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
      'src/sales/sharing/index.ts must not re-export DemoOrgStaffing — the barrel is what objectstack.composition.ts registers from',
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

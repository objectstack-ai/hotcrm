// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { CrmApp } from '../src/sales/apps/crm.app';
import { SalesRepProfile } from '../src/sales/profiles/sales-rep.profile';
import { SalesManagerProfile } from '../src/sales/profiles/sales-manager.profile';
import { ServiceAgentProfile } from '../src/sales/profiles/service-agent.profile';
import { MarketingUserProfile } from '../src/sales/profiles/marketing-user.profile';
import { CrmPositions } from '../src/sales/sharing/positions';
import { DemoOrgStaffing } from '../src/sales/sharing/demo-staffing';
import composedStack, { servedApp } from './helpers/composed-stack';

/** The sets a persona's position declares (`permissionSets`, #2200): what a holder of it is granted. */
const SETS: Record<string, AnyRec> = Object.fromEntries(
  [SalesRepProfile, SalesManagerProfile, ServiceAgentProfile, MarketingUserProfile].map((s) => [s.name, s]),
);
const setsOf = (position: string): AnyRec[] =>
  (CrmPositions.find((p) => p.name === position)?.permissionSets ?? []).map((name) => SETS[name]!);

/**
 * The two standing constraints on `src/apps/crm.app.ts`'s shape (#1259).
 *
 * #1259 cut the sidebar from 7 groups / 31 items back to 6 / 27, and the cut
 * was almost entirely one pattern: the same object surfaced again and again
 * through its own saved views. `crm_event` had four rows — Events, Calendar,
 * Interaction History, My Calendar — while the event list page already carried
 * a tab for every one of them. Nothing noticed it happening. The nav grew a row
 * at a time, each addition defensible on its own, and the only guard on the
 * file compared it against a docs table that was updated in the same commit.
 *
 * So this file guards the two properties that cut rests on, in the two
 * directions they can break:
 *
 *  1. **A FLOOR on variety.** HotCRM is the exemplar app: an author reading it
 *     is reading it to learn what each kind of nav item looks like. Nav items
 *     come in six kinds and every one of them must keep at least one entry —
 *     `component` is down to a single exemplar, so the next slimming pass is
 *     one deletion away from removing a demonstration silently. That is the failure this half exists to make loud.
 *
 *  2. **A CEILING on duplication.** No two entries may open the same
 *     destination, and no object may hold more than one plain list entry.
 *     Deliberately NOT "one entry per object": an object legitimately appears
 *     as its own list AND as a personal view under **My Work** (`crm_task` is
 *     Events-shaped in miniature — My Tasks is `my_open_tasks`, the whole book
 *     is the `all` tab on the page that opens). What #1259 removed was the
 *     third and fourth row for the same object, all landing on the same list
 *     page with a different tab preselected. That is what this half forbids.
 *
 * The count itself is not pinned here — `docs-quick-tour-navigation.test.ts`
 * already holds the group-by-group roster against the tour table, and pinning
 * a number twice would mean two files to edit for every legitimate addition.
 * What is pinned here are the properties a number cannot express.
 */

type AnyRec = Record<string, any>;

const NAV = ((CrmApp as AnyRec).navigation ?? []) as AnyRec[];

/** A `visible` gate's CEL source: `P\`…\`` authors an envelope, a literal stays itself. */
const sourceOf = (v: unknown): unknown => (v && typeof v === 'object' ? (v as AnyRec).source : v);

/** Every non-group node, depth-first. Groups are containers, not destinations. */
const LEAVES: AnyRec[] = (() => {
  const walk = (nodes: AnyRec[]): AnyRec[] =>
    nodes.flatMap((n) =>
      n.type === 'group' ? walk((n.children ?? []) as AnyRec[]) : [n],
    );
  return walk(NAV);
})();

/**
 * The kind of surface an entry opens.
 *
 * `type` alone does not separate them: an object entry that pins a `viewName`
 * lands on one saved view rather than on the object's own list, and those two
 * are different things to demonstrate — which is exactly the distinction
 * `docs-sales-index-navigation.test.ts` splits its two bullets on.
 */
const kindOf = (n: AnyRec): string =>
  n.type === 'object' && n.viewName ? 'view' : String(n.type);

/** The six kinds the app is meant to demonstrate. */
const REQUIRED_KINDS = ['object', 'view', 'page', 'dashboard', 'report', 'component'] as const;

describe('the app navigation keeps one exemplar of every nav-item kind (#1259)', () => {
  it('the walk finds a real navigation tree', () => {
    // Guard the guard. Every assertion below reads `LEAVES`, and a walk that
    // stopped yielding nodes — a renamed `children`, a `navigation` key that
    // moved — would make the duplication check pass by checking nothing and
    // the exemplar check fail loudly. Only one of those two is safe to leave
    // implicit, so the roster size is asserted first.
    expect(NAV.length, 'the app declares no navigation').toBeGreaterThan(0);
    expect(LEAVES.length, 'the navigation walk found no leaf entries').toBeGreaterThan(20);
    expect(
      NAV.filter((n) => n.type === 'group').length,
      'the navigation walk found no groups',
    ).toBeGreaterThan(3);
  });

  it.each(REQUIRED_KINDS)('still ships at least one `%s` entry', (kind) => {
    const found = LEAVES.filter((n) => kindOf(n) === kind);
    expect(
      found.map((n) => n.id),
      `no nav item of kind '${kind}' is left. HotCRM is the app authors read to learn what ` +
        `each kind of navigation entry looks like, so the last exemplar of a kind is not an ` +
        `ordinary item: removing it deletes a demonstration. Keep one, or change this rule ` +
        `deliberately rather than as a side effect of slimming the nav.`,
    ).not.toEqual([]);
  });

  it('accounts for every entry — no kind escapes the roster unnoticed', () => {
    // If the spec grows a seventh nav-item type and someone uses it here, that
    // is a new thing to demonstrate and this list has to be a deliberate
    // decision about it, not silence.
    const unknown = LEAVES.filter((n) => !(REQUIRED_KINDS as readonly string[]).includes(kindOf(n)));
    expect(
      unknown.map((n) => `${n.id} (${kindOf(n)})`),
      'navigation entries of a kind this rule does not know about',
    ).toEqual([]);
  });
});

describe('the app navigation opens each destination once (#1259)', () => {
  it('no two entries open the same destination', () => {
    const seen = new Map<string, string>();
    const bad: string[] = [];
    for (const n of LEAVES) {
      const target = [
        kindOf(n),
        n.objectName ?? '',
        n.viewName ?? '',
        n.pageName ?? '',
        n.dashboardName ?? '',
        n.reportName ?? '',
        n.componentRef ?? '',
      ].join('|');
      const owner = seen.get(target);
      if (owner) bad.push(`${n.id} opens the same destination as ${owner}`);
      else seen.set(target, n.id as string);
    }
    expect(bad, `duplicate navigation destinations:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('no object holds more than one plain list entry', () => {
    // A saved-view entry alongside the object's own list is fine and
    // deliberate — that is what **My Work** is. Two entries both landing on
    // the same unfiltered list are not: they differ only in the label, and the
    // second one is the row #1259 was filed about.
    const byObject = new Map<string, string[]>();
    for (const n of LEAVES) {
      if (kindOf(n) !== 'object') continue;
      const key = String(n.objectName);
      byObject.set(key, [...(byObject.get(key) ?? []), n.id as string]);
    }
    const bad = [...byObject.entries()]
      .filter(([, ids]) => ids.length > 1)
      .map(([object, ids]) => `${object}: ${ids.join(', ')}`);
    expect(bad, `objects with more than one plain list entry:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('every saved-view entry names a view, and every plain entry names none', () => {
    // The two halves of `kindOf`. An `object` entry carrying an empty-string
    // `viewName`, or a `view` entry whose `viewName` went missing in a rename,
    // would silently reclassify and could take the last `view` exemplar with
    // it while every other assertion here stayed green.
    const bad = LEAVES.filter((n) => n.type === 'object' && 'viewName' in n && !n.viewName).map(
      (n) => n.id as string,
    );
    expect(bad, `object entries with an empty viewName:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('entries built on opportunities are gated on reading them (#2060 item 5)', () => {
  // Measured on 18.0.0-next.1 (PR body has the per-persona tables): without the
  // gate a service agent was offered all five and each answered "You don't have
  // access", one 403 per opportunity query. `requiredPermissions` cannot say
  // this — the server reads it as capability names, and `crm_opportunity:read`
  // hid the entry from every user, the admin included (see `crm.app.ts`).
  const GATE = 'current_user.can("crm_opportunity", "read")';
  const GATED = [
    'nav_sales_home', 'nav_sales_dashboard', 'nav_crm_dashboard',
    'nav_report_opportunities_by_stage', 'nav_report_won_by_owner',
    'nav_report_pipeline_coverage', 'nav_report_funnel_by_owner',
  ];

  it('exactly these entries carry the opportunity read gate', () => {
    const gated = LEAVES.filter((n) => sourceOf(n.visible) === GATE).map((n) => n.id);
    expect(gated).toEqual(GATED);
    // Home carries the same read question, narrowed to its audience (below).
    // Report entries each ask for their own object (the describe after this).
    const other = LEAVES.filter(
      (n) => n.type !== 'report' && n.visible !== undefined && sourceOf(n.visible) !== GATE,
    ).map((n) => n.id);
    expect(other, 'entries gated on something else').toEqual(['nav_home']);
    expect(String(sourceOf(LEAVES.find((n) => n.id === 'nav_home')?.visible))).toMatch(/^current_user\.can\("crm_opportunity", "read"\) && /);
  });

  it('the gate parts the personas the way the permission sets say', () => {
    const reads = (position: string) => setsOf(position).some((set) => set.objects?.crm_opportunity?.allowRead === true);
    expect(['sales_rep', 'sales_manager'].map(reads)).toEqual([true, true]);
    expect(['service_agent', 'service_manager'].map(reads)).toEqual([false, false]);
  });

  it('Sales Home has a sidebar entry, second after Home', () => {
    expect(NAV.slice(0, 2).map((n) => [n.id, n.dashboardName ?? n.pageName])).toEqual([
      ['nav_home', 'executive_dashboard'],
      ['nav_sales_home', 'sales_home_page'],
    ]);
  });
});

describe('every shipped report has one entry, under Reports, gated on reading what it reads (#2073 item 1)', () => {
  // The console has no report index, so a report with no nav entry had no way
  // in but its URL (7 of 10 on 0a8f73d), and ⌘K finds a report only through a
  // nav entry. The roster is what the two packages REGISTER, so a report added
  // to either without an entry goes red here. The served tree carries the
  // service module's contributed entries (`servedApp`).
  const REPORTS = ((composedStack as AnyRec).reports ?? []) as AnyRec[];
  const DATASETS = new Map(
    (((composedStack as AnyRec).datasets ?? []) as AnyRec[]).map((d) => [d.name as string, d]),
  );
  const SERVED = (servedApp((CrmApp as AnyRec).name).navigation ?? []) as AnyRec[];
  const walk = (nodes: AnyRec[], group?: string): Array<{ n: AnyRec; group?: string }> =>
    nodes.flatMap((n) =>
      n.type === 'group' ? walk((n.children ?? []) as AnyRec[], n.id as string) : [{ n, group }],
    );
  const REPORT_ENTRIES = walk(SERVED).filter(({ n }) => n.type === 'report');

  /** The objects a report reads: its dataset's, or every block's for a joined report. */
  const objectsOf = (r: AnyRec): string[] =>
    [...new Set(
      [r.dataset, ...((r.blocks ?? []) as AnyRec[]).map((b) => b.dataset)]
        .filter(Boolean)
        .map((name) => DATASETS.get(name as string)?.object as string),
    )];

  it('reads a real roster', () => {
    expect(REPORTS.length, 'no reports registered').toBeGreaterThanOrEqual(10);
    expect(REPORT_ENTRIES.length, 'no report entries in the served navigation').toBeGreaterThan(0);
    for (const r of REPORTS) expect(objectsOf(r).filter(Boolean), r.name).not.toEqual([]);
  });

  it('each registered report is the target of exactly one entry', () => {
    const bad = REPORTS.map((r) => [r.name, REPORT_ENTRIES.filter(({ n }) => n.reportName === r.name).length])
      .filter(([, count]) => count !== 1)
      .map(([name, count]) => `${name}: ${count} entries`);
    expect(bad, `reports without exactly one nav entry:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('every report entry is in the Reports group, which the app declares collapsed', () => {
    expect(REPORT_ENTRIES.filter(({ group }) => group !== 'group_reports').map(({ n }) => n.id)).toEqual([]);
    const declared = NAV.find((n) => n.id === 'group_reports');
    expect(declared).toMatchObject({ type: 'group', label: 'Reports', expanded: false });
  });

  it('each entry asks for read on the object its report reads', () => {
    const bad: string[] = [];
    for (const { n } of REPORT_ENTRIES) {
      const report = REPORTS.find((r) => r.name === n.reportName);
      // A case report also asks that the member is not a sales rep (#2244);
      // `app-navigation-audience.test.ts` pins who that hides.
      const asked = /^current_user\.can\("(\w+)", "read"\)(?: && !\("sales_rep" in current_user\.positions\))?$/.exec(String(sourceOf(n.visible)))?.[1];
      if (!report || !asked || !objectsOf(report).includes(asked)) {
        bad.push(`${n.id}: gate ${JSON.stringify(sourceOf(n.visible))}, report reads ${report ? objectsOf(report).join(' + ') : '?'}`);
      }
    }
    expect(bad, `report entries not gated on what their report reads:\n  ${bad.join('\n  ')}`).toEqual([]);
    // The one report reading two objects asks for the one three of its four
    // panels read: a member without the other gets an access notice on the
    // fourth panel, not a broken page (measured, see `crm.app.ts`).
    expect(
      REPORT_ENTRIES.filter(({ n }) => String(sourceOf(n.visible)).includes('current_user.positions')).map(({ n }) => n.id),
      'report entries that also ask the rep position',
    ).toEqual(['nav_report_cases_by_status', 'nav_report_sla', 'nav_report_cases_opened_by_day']);
    const churn = REPORT_ENTRIES.find(({ n }) => n.reportName === 'customer_churn_signals')?.n;
    expect(sourceOf(churn?.visible)).toBe('current_user.can("crm_account", "read")');
  });

  it('the gates part the personas the way the permission sets say', () => {
    // The read half only: a rep's set reads cases, and the rep position is
    // what hides the case reports from a rep (`app-navigation-audience.test.ts`).
    const shown = (set: AnyRec): string[] =>
      REPORT_ENTRIES.filter(({ n }) => {
        const asked = /"(\w+)"/.exec(String(sourceOf(n.visible)))?.[1] as string;
        return set.objects?.[asked]?.allowRead === true;
      }).map(({ n }) => n.reportName as string);
    const ALL = REPORT_ENTRIES.map(({ n }) => n.reportName as string);
    const CASES = ['cases_by_status_priority', 'sla_performance', 'cases_opened_by_day_priority'];
    expect(shown(SalesRepProfile)).toEqual(ALL);
    expect(shown(SalesManagerProfile)).toEqual(ALL);
    for (const position of ['service_agent', 'service_manager']) {
      expect(setsOf(position).map((set) => set.name), position).toEqual(['service_agent']);
      expect(shown(setsOf(position)[0]!), position).toEqual([
        'lead_inflow_by_month_source', 'accounts_by_industry_type', 'customer_churn_signals', ...CASES,
      ]);
    }
    expect(shown(MarketingUserProfile)).toEqual(ALL.filter((name) => !CASES.includes(name)));
  });
});

describe("each persona's first entry is its home (#2060 item 5)", () => {
  // The console opens an app on the first entry the member is SHOWN
  // (objectui#12426, in the 18.0.0-next.2 console), so the landing is this
  // app's order and gates. The ruled homes: rep → Sales Home, manager / admin
  // → Executive Overview, service agent / manager → the service module's
  // dashboard. Measured per persona in a browser by the PR that made this order (its
  // body has the table); these are the source facts that measurement rests on.
  const SERVED = (servedApp((CrmApp as AnyRec).name).navigation ?? []) as AnyRec[];

  it('the sidebar opens with Home, Sales Home, then the Service group led by its dashboard', () => {
    expect(SERVED.slice(0, 3).map((n) => n.id)).toEqual(['nav_home', 'nav_sales_home', 'group_service']);
    // A contributed item lands after the group's own children: the app gives
    // this group none, so the module's first item is the group's first entry.
    expect(NAV.find((n) => n.id === 'group_service')?.children).toEqual([]);
    expect((SERVED[2].children as AnyRec[])[0]).toMatchObject({
      id: 'nav_service_dashboard', type: 'dashboard', dashboardName: 'service_dashboard',
    });
  });

  it('Home is the entry a sales rep is not shown, asked by the position a rep holds', () => {
    expect(sourceOf(NAV[0].visible)).toBe(
      'current_user.can("crm_opportunity", "read") && !("sales_rep" in current_user.positions)',
    );
    // The name in the gate is a declared position, the one both demo reps hold
    // and the manager does not, and it declares the rep's permission set.
    expect(CrmPositions.map((p) => p.name)).toContain('sales_rep');
    expect(setsOf('sales_rep')).toEqual([SalesRepProfile]);
    const holds = (key: string) => DemoOrgStaffing.find((m) => m.key === key)?.positions.includes('sales_rep');
    expect(['na_rep', 'eu_rep', 'sales_manager'].map(holds)).toEqual([true, true, false]);
  });

  it('a service persona is shown nothing ahead of the Service group', () => {
    // Both pinned entries ask for opportunity read, which the set both service
    // positions declare does not grant (asserted above), so the Service group
    // is their first slot.
    for (const n of SERVED.slice(0, 2)) {
      expect(String(sourceOf(n.visible)), n.id).toMatch(/^current_user\.can\("crm_opportunity", "read"\)/);
    }
    const readsCases = (position: string) => setsOf(position).some((set) => set.objects?.crm_case?.allowRead === true);
    expect(['service_agent', 'service_manager'].map(readsCases)).toEqual([true, true]);
  });
});

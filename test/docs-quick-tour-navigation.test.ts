// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import { CrmApp } from '../src/apps/crm.app';
import { ExecutiveDashboard } from '../src/dashboards/executive.dashboard';
import { CrmOverviewDashboard } from '../src/dashboards/crm.dashboard';
import { ServiceDashboard } from '../src/dashboards/service.dashboard';
import { ActivityDashboard } from '../src/dashboards/activity.dashboard';
import { SalesManagerProfile } from '../src/profiles/sales-manager.profile';
import { CrmPositions } from '../src/sharing/positions';

/**
 * The quick-tour page's left-nav table, pinned to `src/apps/crm.app.ts` (#960).
 *
 * This is the first table a new user reads, and its entire job is "here is what
 * the sidebar holds". Every one of its eight rows had drifted: four named
 * groups the app does not have (*Products*, *Activities*, *Analytics*, *AI*),
 * three real groups were absent entirely (**My Work**, **Activity**,
 * **Insights**), and the four rows whose group did exist each dropped items or
 * spelled a label the app never shows (*Knowledge Base* for **Knowledge**,
 * *Campaign Members* / *Approval Requests* / *Action History* for items that
 * exist nowhere).
 *
 * Nothing caught it: `os validate` and `pnpm lint` walk authored metadata and
 * never open `content/docs`, so — as with the service-index guard in
 * `docs-service-index-analytics.test.ts` (#948) — the check has to live where
 * the claim lives. Prose that enumerates an IA goes stale the first time the IA
 * moves, which is exactly what happened here.
 *
 * The rules below are two-directional, and the page's typography carries the
 * distinction:
 *
 *  - **bold** is reserved for names the app really carries. Every bold Latin run
 *    in the section must resolve to a navigation label or to the dashboard the
 *    pinned Home entry opens. (Bold runs containing CJK are the locale prose's
 *    own emphasis and are skipped — product names stay English in every locale,
 *    the same convention `docs-dashboard-tiles.test.ts` leans on.)
 *  - *italic* is reserved for a name the product does NOT carry, the spelling
 *    #927 / PR #932 established. Every retired name must still be named in
 *    italics — the convention is to say where a reader's name really lives, not
 *    to delete it silently — and no phantom may ever appear in bold.
 *  - exists ⇒ listed: the table's rows are compared against `CrmApp.navigation`
 *    group-for-group, child-for-child, in source order. Add a nav item without
 *    touching the tour and this file goes red at PR time, in all three locales.
 *
 * ## The app's own name is part of the assertion set (#998)
 *
 * The rules above pinned every name INSIDE the app and left the app's name
 * itself unguarded, and that is exactly where the next drift landed: 22 doc
 * pages called this app *Enterprise CRM*, a spelling `src/` has never carried
 * anywhere — `CrmApp.label`, all four locale bundles, the build artifact and the
 * marketplace manifest all say **HotCRM**. It looks like a hand-rearranged
 * reading of the identifier `crm_enterprise`. The name even survived a full
 * round of navigation rewrites (#927 / #938 / #943 / #963 / #976) because it was
 * never the thing under review.
 *
 * This file could not see it twice over: the guarded block STARTED at the line
 * naming the app, so the app-launcher list one paragraph above it was outside
 * every rule, and the occurrence inside the block was not bold, so the
 * "bold must be a real name" rule passed over it.
 *
 * Both holes are closed by deriving the app's name from `CrmApp.label` rather
 * than writing it down here:
 *
 *  - the block's `start` marker is built from the label, so renaming the app in
 *    `src/` fails as "block start not found" until the pages are re-taken;
 *  - each page's app-launcher bullet ({@link PAGES}`.launcher`) must name the
 *    app by exactly `CrmApp.label`;
 *  - the label joins {@link ALLOWED_BOLD}, so the page may bold it like any
 *    other real name.
 */

type AnyRec = Record<string, any>;

const NAV = ((CrmApp as AnyRec).navigation ?? []) as AnyRec[];
const GROUPS = NAV.filter((n) => n.type === 'group');
const PINNED = NAV.filter((n) => n.type !== 'group');

const childLabels = (g: AnyRec): string[] =>
  ((g.children ?? []) as AnyRec[]).map((c) => c.label as string);

const GROUP_LABELS: string[] = GROUPS.map((g) => g.label as string);
const ALL_NAV_LABELS: string[] = [
  ...PINNED.map((p) => p.label as string),
  ...GROUP_LABELS,
  ...GROUPS.flatMap(childLabels),
];

/** Groups that do NOT set `expanded: true` — `GroupNavItemSchema.expanded` defaults to false. */
const COLLAPSED: string[] = GROUPS.filter((g) => g.expanded !== true).map((g) => g.label as string);
const EXPANDED: string[] = GROUPS.filter((g) => g.expanded === true).map((g) => g.label as string);

/** The name the app ships under — `src/apps/crm.app.ts`, never written down here (#998). */
const APP_LABEL = (CrmApp as AnyRec).label as string;

const ALLOWED_BOLD = new Set<string>([
  ...ALL_NAV_LABELS,
  ExecutiveDashboard.label as string,
  APP_LABEL,
]);

/**
 * Names the old table carried that resolve to no navigation label anywhere.
 * Each must be named in italics and must never be bolded.
 */
const PHANTOMS = [
  'Activities',
  'Analytics',
  'AI',
  'Copilot',
  'Knowledge Bases',
  'Knowledge Base',
  'Campaign Members',
  'Approval Requests',
  'Action History',
  'Dashboards',
  'Reports',
  // #1259 retired these four sidebar rows. Every one of their destinations is
  // still shipping — as a tab on the list page of the object it belongs to —
  // so the page owes the reader a re-point, not a deletion. Listing them here
  // is what forces that: each must stay named in italics, and none may ever be
  // bolded again while it is not a navigation label.
  'Pipeline',
  'Calendar',
  'Interaction History',
  'All Tasks',
] as const;

/**
 * Names the old table used as a GROUP that are real only as an ITEM. Each must
 * be named in italics (as the non-existent group) and may also appear in bold
 * (as the real item), so they are exempt from the never-bold rule.
 *
 * *Products* was never a group; it is the **Products** item, which #1259 moved
 * from Marketing to Sales. *Approvals* WAS a group until #1259 dissolved it —
 * its single child, **Inbox**, is a personal work queue, so it moved to **My
 * Work**. Readers arrive holding both names; the page has to say where each
 * one really lives.
 */
const RETIRED_GROUP_NAMES = ['Products', 'Approvals'] as const;

const PAGES = [
  {
    file: 'content/docs/getting-started/quick-tour.mdx',
    lang: 'en',
    /** First line of the guarded block; the block runs to the next `## `. */
    start: `Inside ${APP_LABEL},`,
    sep: ', ',
    collapse: /collapsed when the app loads/,
    /** The app-launcher bullet; capture group 1 is the name it gives this app. */
    launcher: /^- \*\*(.+?)\*\* — the main app with all CRM functionality\./m,
  },
  {
    file: 'content/docs/getting-started/quick-tour.zh-Hans.mdx',
    lang: 'zh-Hans',
    start: `在 ${APP_LABEL} 内，`,
    sep: '、',
    collapse: /在应用加载时是折叠的/,
    launcher: /^- \*\*(.+?)\*\* —— 包含所有 CRM 功能的主应用。/m,
  },
  {
    file: 'content/docs/getting-started/quick-tour.zh-Hant.mdx',
    lang: 'zh-Hant',
    start: `在 ${APP_LABEL} 內，`,
    sep: '、',
    collapse: /在應用載入時是摺疊的/,
    launcher: /^- \*\*(.+?)\*\* —— 包含所有 CRM 功能的主應用。/m,
  },
] as const;

const blockOf = (file: string, start: string): string => {
  const lines = readFileSync(join(REPO_ROOT, file), 'utf8').split('\n');
  const from = lines.findIndex((l) => l.startsWith(start));
  expect(from, `${file}: block start '${start}' not found`).toBeGreaterThanOrEqual(0);
  const rest = lines.slice(from);
  const end = rest.findIndex((l, i) => i > 0 && l.startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
};

/** Body rows of the block's one markdown table, as trimmed cell arrays. */
const tableRows = (block: string): string[][] =>
  block
    .split('\n')
    .filter((l) => l.trim().startsWith('|'))
    .map((l) =>
      l
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim()),
    )
    .filter((cells) => !cells.every((c) => /^:?-{2,}:?$/.test(c)))
    .slice(1); // drop the header row

/**
 * The CJK range is written as escapes rather than literal characters so this
 * file stays greppable in a repo whose tooling scans it as text.
 */
const CJK = /[\u3400-\u9fff]/;

const boldNames = (block: string): string[] =>
  [...block.matchAll(/\*\*([^*\n]+)\*\*/g)].map((m) => m[1].trim()).filter((s) => !CJK.test(s));

const italicNames = (block: string): string[] =>
  [...block.replace(/\*\*[^*\n]+\*\*/g, '').matchAll(/\*([^*\n]+)\*/g)].map((m) => m[1].trim());

describe('getting-started/quick-tour names the navigation the app really ships (#960)', () => {
  describe.each(PAGES)('$file', ({ file, start, sep, collapse, launcher }) => {
    const block = () => blockOf(file, start);

    it('the app-launcher list calls this app by the label the app ships (#998)', () => {
      const text = readFileSync(join(REPO_ROOT, file), 'utf8');
      const found = launcher.exec(text);
      expect(
        found,
        `${file}: the app-launcher bullet for this app is gone (pattern ${launcher}) — this ` +
          'rule has gone blind. Re-take the pattern against the page rather than deleting it.',
      ).not.toBeNull();
      expect(
        found?.[1],
        `${file}: the app-launcher list — the very screen a new user opens — calls this app ` +
          `something other than the name it ships. \`CrmApp.label\` is '${APP_LABEL}', and the ` +
          'launcher shows that string; a page that spells it differently is naming an app ' +
          'nobody can find.',
      ).toBe(APP_LABEL);
    });

    it('lists every group, in source order, with exactly its children', () => {
      const rows = tableRows(block());
      expect(
        rows.map((r) => r[0]),
        `${file}: the table's group column must be every CrmApp group, in source order`,
      ).toEqual(GROUP_LABELS.map((l) => `**${l}**`));

      GROUPS.forEach((g, i) => {
        expect(
          rows[i][1].split(sep).map((s) => s.trim()),
          `${file}: contents of the ${g.label} row`,
        ).toEqual(childLabels(g));
      });
    });

    it('names the pinned top-level entry and the dashboard it opens', () => {
      const text = block();
      PINNED.forEach((p) => {
        expect(text, `${file}: pinned nav item '${p.label}' is not named`).toContain(
          `**${p.label}**`,
        );
      });
      expect(text).toContain(`**${ExecutiveDashboard.label}**`);
    });

    it('bolds only names the app actually carries', () => {
      const unknown = boldNames(block()).filter((n) => !ALLOWED_BOLD.has(n));
      expect(
        unknown,
        `${file}: bolded name(s) that are not a navigation label or the pinned dashboard's ` +
          'label. Bold is reserved for real names here — a name the app does not carry goes ' +
          'in *italics*.',
      ).toEqual([]);
    });

    it('still names every retired name, in italics, and never in bold', () => {
      const text = block();
      const italics = italicNames(text);
      const bold = boldNames(text);

      const unnamed = [...PHANTOMS, ...RETIRED_GROUP_NAMES].filter((n) => !italics.includes(n));
      expect(
        unnamed,
        `${file}: a name the old table carried was dropped instead of re-pointed. Readers ` +
          'arrive with these names — say where the thing really is, do not delete it silently.',
      ).toEqual([]);

      const promoted = PHANTOMS.filter((n) => bold.includes(n));
      expect(
        promoted,
        `${file}: name(s) the app does not carry, written in bold as if they were real`,
      ).toEqual([]);
    });

    it('says which groups are collapsed when the app loads, and which open themselves', () => {
      const text = block();
      expect(text, `${file}: the default-collapse note is missing`).toMatch(collapse);
      const line = text.split('\n').find((l) => collapse.test(l)) ?? '';
      COLLAPSED.forEach((l) =>
        expect(line, `${file}: '${l}' is collapsed on load but the note omits it`).toContain(
          `**${l}**`,
        ),
      );
      EXPANDED.forEach((l) =>
        expect(line, `${file}: '${l}' opens itself but the note omits it`).toContain(`**${l}**`),
      );
    });
  });
});

describe('the source facts the quick-tour table now rests on (#960)', () => {
  it('the app has one pinned top-level entry and six groups', () => {
    expect(PINNED.map((p) => p.label)).toEqual(['Home']);
    expect(GROUP_LABELS).toEqual([
      'Sales',
      'My Work',
      'Activity',
      'Marketing',
      'Service',
      'Insights',
    ]);
  });

  it('Home opens the executive dashboard, not the CRM overview one', () => {
    expect(PINNED[0].type).toBe('dashboard');
    expect(PINNED[0].dashboardName).toBe(ExecutiveDashboard.name);
  });

  it('Marketing and Insights are the groups that stay collapsed', () => {
    expect(COLLAPSED).toEqual(['Marketing', 'Insights']);
    expect(EXPANDED).toEqual(['Sales', 'My Work', 'Activity', 'Service']);
  });

  it('carries no navigation label matching any name the page calls a phantom', () => {
    const labels = new Set(ALL_NAV_LABELS);
    expect(PHANTOMS.filter((n) => labels.has(n))).toEqual([]);
  });

  it('routes crm_task through My Work only, and reaches campaign members from no nav item', () => {
    const walk = (nodes: AnyRec[]): AnyRec[] =>
      nodes.flatMap((n) => [n, ...walk((n.children ?? []) as AnyRec[])]);
    const all = walk(NAV);
    expect(all.filter((n) => n.objectName === 'crm_campaign_member')).toEqual([]);

    const taskOwners = GROUPS.filter((g) =>
      ((g.children ?? []) as AnyRec[]).some((c) => c.objectName === 'crm_task'),
    ).map((g) => g.label);
    expect(taskOwners).toEqual(['My Work']);
  });

  it('routes CRM Overview through Insights, which is collapsed on load', () => {
    const insights = GROUPS.find((g) => g.label === 'Insights');
    expect(insights?.expanded).not.toBe(true);
    const item = ((insights?.children ?? []) as AnyRec[]).find(
      (c) => c.dashboardName === CrmOverviewDashboard.name,
    );
    expect(item?.label).toBe(CrmOverviewDashboard.label);
  });

  it('keeps the labels the page spells verbatim', () => {
    const byId = new Map(
      ((): AnyRec[] => {
        const walk = (nodes: AnyRec[]): AnyRec[] =>
          nodes.flatMap((n) => [n, ...walk((n.children ?? []) as AnyRec[])]);
        return walk(NAV);
      })().map((n) => [n.id as string, n]),
    );
    expect(byId.get('nav_knowledge')?.label).toBe('Knowledge');
    expect(byId.get('nav_service_dashboard')?.label).toBe('Service Overview');
    expect(byId.get('nav_approval_requests')?.label).toBe('Inbox');
    expect(byId.get('nav_product')?.label).toBe('Products');
  });
});

/* ───────────────────────────────────────────────────────────────────────────
 * Section 1 — the landing dashboard (#971)
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * The quick tour's opening section, pinned to the dashboard **Home** really
 * opens (#971).
 *
 * The section described a dashboard that does not exist. Its name came from
 * `crm_overview_dashboard` — a real dashboard, but the one under **Insights**,
 * a group that is collapsed on load, so a new user neither lands on it nor can
 * click it without opening the group first. Its five bullets came from three
 * different dashboards: exactly one, **Open Leads**, is a tile on the dashboard
 * `nav_home` actually binds.
 *
 * The rewrite is measured against `ExecutiveDashboard.widgets` at runtime, not
 * against the file's text, and that distinction is the whole reason the issue
 * mis-counted. #971 read the source and listed EIGHT tiles, concluding that no
 * pipeline tile existed on this dashboard — but the funnel arrives from the
 * shared factory (`pipelineByStageFunnelWidget`, #539), so it carries no inline
 * `title:` literal to grep. The dashboard ships NINE tiles, and **Pipeline by
 * Stage** is one of them; the four locale bundles register it too. So the
 * page's "opportunities in your pipeline" bullet was the one claim that was
 * half-right, and the rewrite says what the tile really measures — open
 * opportunity VALUE per stage, not a count of deals. A count tile does exist,
 * **Active Deals**, and it is on **CRM Overview**.
 *
 * Rules, in both directions, using the typography section 2 already
 * establishes (#960 / PR #968):
 *
 *  - exists ⇒ listed: every widget title on `executive_dashboard` must appear
 *    in the section, so a new tile cannot land while the tour goes stale.
 *  - listed ⇒ exists: every bolded Latin run must resolve to a real widget
 *    title, dashboard label, navigation label, dashboard filter label, or the
 *    permission set the section names. (CJK bold runs are the locale prose's
 *    own emphasis — product names stay English in every locale.)
 *  - a name the reader arrives with is re-pointed, never deleted: the four
 *    retired claims must each still be named, in *italics*, and none may ever
 *    be bolded as if it were real.
 *  - the source side of the negative claims is pinned too. Bind a case or an
 *    activity dataset to either landing-candidate dashboard, add a per-account
 *    ranking, give positions a parent, or take `viewAllRecords` off the sales
 *    manager, and this file goes red — because the prose would then be wrong in
 *    the other direction.
 */

const tileTitles = (d: AnyRec): string[] =>
  ((d.widgets ?? []) as AnyRec[]).map((w) => w.title as string).filter(Boolean);

const EXEC_TILES = tileTitles(ExecutiveDashboard as AnyRec);

/** Dashboard-level filter labels the section names as controls. */
const EXEC_FILTER_LABELS = (((ExecutiveDashboard as AnyRec).globalFilters ?? []) as AnyRec[])
  .map((f) => f.label as string)
  .filter(Boolean);

const ALLOWED_BOLD_SECTION1 = new Set<string>([
  ...ALL_NAV_LABELS,
  ...EXEC_TILES,
  ...tileTitles(CrmOverviewDashboard as AnyRec),
  ...tileTitles(ServiceDashboard as AnyRec),
  ...tileTitles(ActivityDashboard as AnyRec),
  ...EXEC_FILTER_LABELS,
  ExecutiveDashboard.label as string,
  CrmOverviewDashboard.label as string,
  SalesManagerProfile.label,
]);

const SECTION1 = [
  {
    file: 'content/docs/getting-started/quick-tour.mdx',
    lang: 'en',
    heading: '## 1. The home dashboard',
    /** The tile count, stated in prose, must match the dashboard. */
    count: /nine tiles/,
    /** Each retired claim, in the exact spelling the section now italicises. */
    retired: [
      'Cases awaiting your response',
      'Top accounts by pipeline value',
      'Recent activity (last calls, meetings, emails)',
      'Team-level rollups for managers',
    ],
    /** Sentences the rewrite removed. None may come back in any locale. */
    gone: [
      'The first thing you see is the **CRM Overview** dashboard',
      'you also see team-level rollups',
    ],
  },
  {
    file: 'content/docs/getting-started/quick-tour.zh-Hans.mdx',
    lang: 'zh-Hans',
    heading: '## 1. 主页仪表盘',
    count: /9 个磁贴/,
    retired: [
      '等待你响应的案例',
      '按管道价值排名的顶级客户',
      '近期活动（最近的通话、会议、邮件）',
      '给经理看的团队级汇总',
    ],
    gone: ['你看到的第一个东西是 **CRM Overview** 仪表盘', '如果你是经理，你还会看到团队级汇总'],
  },
  {
    file: 'content/docs/getting-started/quick-tour.zh-Hant.mdx',
    lang: 'zh-Hant',
    heading: '## 1. 主頁儀表板',
    count: /9 個磁貼/,
    retired: [
      '等待你回應的案例',
      '按管道價值排名的頂級客戶',
      '近期活動（最近的通話、會議、郵件）',
      '給經理看的團隊級彙總',
    ],
    gone: ['你看到的第一個東西是 **CRM Overview** 儀表板', '如果你是經理，你還會看到團隊級彙總'],
  },
] as const;

const sectionOf = (file: string, heading: string): string => {
  const lines = readFileSync(join(REPO_ROOT, file), 'utf8').split('\n');
  const from = lines.findIndex((l) => l.trim() === heading);
  expect(from, `${file}: section heading '${heading}' not found`).toBeGreaterThanOrEqual(0);
  const rest = lines.slice(from);
  const end = rest.findIndex((l, i) => i > 0 && l.startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
};

describe("getting-started/quick-tour describes the dashboard Home really opens (#971)", () => {
  describe.each(SECTION1)('$file', ({ file, heading, count, retired, gone }) => {
    const section = () => sectionOf(file, heading);

    it('names the pinned entry, the dashboard it opens, and every one of its tiles', () => {
      const text = section();
      expect(text, `${file}: the pinned nav entry is not named`).toContain('**Home**');
      expect(text, `${file}: the dashboard Home opens is not named`).toContain(
        `**${ExecutiveDashboard.label}**`,
      );
      const missing = EXEC_TILES.filter((t) => !text.includes(`**${t}**`));
      expect(
        missing,
        `${file}: tile(s) on ${ExecutiveDashboard.name} that the section does not name. A new ` +
          'tile cannot land while the first section a user reads goes stale.',
      ).toEqual([]);
      expect(text, `${file}: the tile count in prose does not match the dashboard`).toMatch(count);
    });

    it('bolds only names the app actually carries', () => {
      const unknown = boldNames(section()).filter((n) => !ALLOWED_BOLD_SECTION1.has(n));
      expect(
        unknown,
        `${file}: bolded name(s) that are not a widget title, dashboard label, navigation ` +
          'label, dashboard filter label, or the permission set named here. Bold is reserved ' +
          'for real names — a name the app does not carry goes in *italics*.',
      ).toEqual([]);
    });

    it('re-points CRM Overview to where it really lives instead of deleting the name', () => {
      const text = section();
      expect(text, `${file}: the name readers arrive with was dropped`).toContain(
        `**${CrmOverviewDashboard.label}**`,
      );
      expect(
        text,
        `${file}: CRM Overview is named but the group it actually sits under is not`,
      ).toContain('**Insights**');
    });

    it('still names every retired claim, in italics, and never in bold', () => {
      const text = section();
      const italics = italicNames(text);
      const bold = boldNames(text);

      const unnamed = retired.filter((n) => !italics.includes(n));
      expect(
        unnamed,
        `${file}: a claim the section used to make was deleted instead of answered. Readers ` +
          'arrive with these — say where the thing really is, do not drop it silently.',
      ).toEqual([]);

      expect(
        retired.filter((n) => bold.includes(n)),
        `${file}: a claim the app does not support, written in bold as if it were real`,
      ).toEqual([]);

      gone.forEach((s) =>
        expect(text, `${file}: a removed sentence came back: ${s}`).not.toContain(s),
      );
    });
  });
});

describe('the source facts the quick-tour landing section now rests on (#971)', () => {
  it('Home binds the executive dashboard, and that dashboard ships nine tiles', () => {
    expect(PINNED[0].dashboardName).toBe(ExecutiveDashboard.name);
    expect(EXEC_TILES).toEqual([
      'Total Revenue (YTD)',
      'Active Accounts',
      'Total Contacts',
      'Open Leads',
      'Revenue Trend',
      'Revenue by Industry',
      'Pipeline by Stage',
      'New Accounts',
      'Accounts by Industry',
    ]);
  });

  it('counts the funnel that arrives from the shared factory, which no title grep finds', () => {
    // #971 read `executive.dashboard.ts` and found eight `title:` literals, so it
    // reported that the dashboard carries no pipeline tile. `pipeline_by_stage`
    // comes from `pipelineByStageFunnelWidget` (#539) and has no inline literal —
    // it is the ninth tile, and it is the reason the "opportunities in your
    // pipeline" bullet was half-right rather than simply wrong.
    const inlineTitles = (readFileSync(
      join(REPO_ROOT, 'src/dashboards/executive.dashboard.ts'),
      'utf8',
    ).match(/title: '/g) ?? []).length;
    expect(inlineTitles).toBe(EXEC_TILES.length - 1);
    expect(EXEC_TILES).toContain('Pipeline by Stage');
  });

  it('binds no case or activity dataset on either dashboard a reader might land on', () => {
    const datasets = (d: AnyRec): string[] => [
      ...new Set(((d.widgets ?? []) as AnyRec[]).map((w) => w.dataset as string).filter(Boolean)),
    ];
    expect(datasets(ExecutiveDashboard as AnyRec).sort()).toEqual([
      'account_metrics',
      'contact_metrics',
      'lead_metrics',
      'opportunity_metrics',
    ]);
    expect(datasets(CrmOverviewDashboard as AnyRec).sort()).toEqual([
      'opportunity_metrics',
      'product_metrics',
    ]);
    // The tiles the section re-points to, on the dashboards that do carry them.
    expect(datasets(ServiceDashboard as AnyRec)).toContain('case_metrics');
    expect(datasets(ActivityDashboard as AnyRec)).toContain('event_metrics');
  });

  it('ranks nothing by individual account on either dashboard', () => {
    const dims = (d: AnyRec): string[] => [
      ...new Set(
        ((d.widgets ?? []) as AnyRec[]).flatMap((w) => (w.dimensions ?? []) as string[]),
      ),
    ].sort();
    // Pinned as exact sets: adding any dimension here must force a re-read of the
    // "top accounts by pipeline value is not a tile" claim, in all three locales.
    expect(dims(ExecutiveDashboard as AnyRec)).toEqual([
      'account_industry',
      'close_date',
      'created_at',
      'industry',
      'stage',
    ]);
    expect(dims(CrmOverviewDashboard as AnyRec)).toEqual([
      'category',
      'close_date',
      'lead_source',
      'owner',
      'stage',
    ]);
  });

  it('keeps positions flat and the sales manager org-wide, as the section says', () => {
    expect(CrmPositions.filter((p) => 'parent' in p || 'parentRole' in p)).toEqual([]);
    (['crm_lead', 'crm_account', 'crm_opportunity'] as const).forEach((o) =>
      expect(
        (SalesManagerProfile.objects as AnyRec)[o]?.viewAllRecords,
        `sales_manager must read every ${o} for "org-wide totals, not a team slice" to hold`,
      ).toBe(true),
    );
  });
});

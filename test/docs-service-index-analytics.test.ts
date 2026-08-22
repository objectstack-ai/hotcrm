// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import { CrmApp } from '../src/apps/crm.app';
import { ServiceDashboard } from '../src/dashboards/service.dashboard';
import { CaseDataset } from '../src/datasets/case.dataset';
import {
  CasesByStatusPriorityReport,
  CasesOpenedByDayPriorityReport,
  SlaPerformanceReport,
} from '../src/reports/case.report';

/**
 * The service index page's "Standard dashboards & reports" section, pinned to
 * source (#948).
 *
 * All four bullets were wrong in every locale, and in two different ways:
 *
 *  1. The dashboard bullet advertised a **top agents** tile and an **oldest open
 *     cases** tile. Neither exists, and neither is a widget somebody merely
 *     forgot to build — `case_metrics` declares no owner dimension (so nothing
 *     in analytics can group, let alone rank, by agent) and every widget on the
 *     dashboard binds that dataset, i.e. aggregates it, so no tile there lists
 *     individual records by age. `content/docs/service/cases.mdx` had already
 *     written the agent half to source in #912/PR #939 — the two pages
 *     contradicted each other, and this was the page that was lying.
 *  2. The three report bullets named reports that do not exist under those
 *     names: the dimension order was inverted (`Cases Opened by Day × Priority`
 *     vs the real `Cases Opened by Priority × Day`, which #917/PR #924 had
 *     already written the right way round on the SLA page), `×` stood where the
 *     label says `and`, and `Report` was missing from the SLA report's label.
 *     The SLA bullet also repeated the "% of cases resolved within SLA target"
 *     claim PR #924 removed from the SLA page: `case_metrics` defines no such
 *     measure — what the report carries is the **SLA Violation Rate**.
 *
 * Nothing checks prose: `os validate` and `pnpm lint` walk authored metadata and
 * never open `content/docs`, so — as with the dashboards-page tile guard in
 * `docs-drift.test.ts` — the check has to live where the claim lives.
 *
 * The rules below are deliberately two-directional, because the section makes
 * both positive and negative claims:
 *
 *  - listed ⇒ exists: every **bolded** Latin name in the section must resolve to
 *    a real widget title, report label, dataset label, or the dashboard's two
 *    names. (Bold runs containing CJK are the locale prose's own emphasis and
 *    are skipped — product names stay English in every locale, which is the
 *    same convention `docs-drift.test.ts` leans on.) Phantom names are written
 *    in *italics*, the spelling this page already uses for a name the product
 *    does not carry (`*Service Dashboard*`, #927/PR #932), so a phantom can
 *    never satisfy this rule by accident.
 *  - exists ⇒ listed: every widget title on `service_dashboard` must appear, so
 *    a new tile cannot land while the summary silently goes stale.
 *  - the source side of the two negative claims is pinned too: build an
 *    agent-ranking tile, or give `case_metrics` an owner dimension, and this
 *    file goes red — which is the point, because the prose would then be wrong
 *    in the other direction.
 */

type AnyRec = Record<string, any>;

const NAV_LABEL: string = (() => {
  const walk = (nodes: AnyRec[]): AnyRec[] =>
    nodes.flatMap((n) => [n, ...walk((n.children ?? []) as AnyRec[])]);
  const item = walk(((CrmApp as AnyRec).navigation ?? []) as AnyRec[]).find(
    (n) => n.dashboardName === ServiceDashboard.name,
  );
  if (!item?.label) throw new Error('no navigation item binds service_dashboard — pin out of date');
  return item.label as string;
})();

const WIDGET_TITLES: string[] = (ServiceDashboard.widgets ?? [])
  .map((w) => (w as AnyRec).title as string)
  .filter(Boolean);

const REPORT_LABELS: string[] = [
  CasesOpenedByDayPriorityReport.label,
  CasesByStatusPriorityReport.label,
  SlaPerformanceReport.label,
].filter(Boolean) as string[];

const DATASET_LABELS: string[] = [
  ...CaseDataset.dimensions.map((d) => d.label),
  ...CaseDataset.measures.map((m) => m.label),
].filter(Boolean) as string[];

/** Every Latin name the section is allowed to bold. */
const ALLOWED_BOLD = new Set<string>([
  ...WIDGET_TITLES,
  ...REPORT_LABELS,
  ...DATASET_LABELS,
  NAV_LABEL,
  ServiceDashboard.label as string,
]);

const PAGES = [
  {
    file: 'content/docs/service/index.mdx',
    lang: 'en',
    heading: '## Standard dashboards & reports',
    /** The section must say WHY an agent ranking is impossible, not just that it is missing. */
    impossibility: /no owner dimension/,
    /** The exact claims #948 removed. None may come back in any spelling below. */
    retired: [
      'SLA performance, top agents, oldest open cases',
      'Cases Opened by Day × Priority',
      'Cases by Status × Priority',
      '% of cases resolved within SLA target',
    ],
  },
  {
    file: 'content/docs/service/index.zh-Hans.mdx',
    lang: 'zh-Hans',
    heading: '## 标准仪表盘与报表',
    impossibility: /没有负责人维度/,
    retired: [
      'SLA 表现、顶尖客服、最久未结工单',
      '每日 × 优先级开单数',
      '按状态 × 优先级划分的工单',
      '在 SLA 目标内解决的工单百分比',
    ],
  },
  {
    file: 'content/docs/service/index.zh-Hant.mdx',
    lang: 'zh-Hant',
    heading: '## 標準儀表板與報表',
    impossibility: /沒有負責人維度/,
    retired: [
      'SLA 表現、頂尖客服、最久未結工單',
      '每日 × 優先順序開單數',
      '按狀態 × 優先順序劃分的工單',
      '在 SLA 目標內解決的工單百分比',
    ],
  },
] as const;

/** The `## …` section named by `heading`, up to the next `## `. */
const sectionOf = (file: string, heading: string): string => {
  const lines = readFileSync(join(REPO_ROOT, file), 'utf8').split('\n');
  const start = lines.findIndex((l) => l.trim() === heading);
  expect(start, `${file}: heading '${heading}' not found`).toBeGreaterThanOrEqual(0);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
};

/**
 * Bold runs carrying no CJK — i.e. the product names, in every locale. The
 * range is written as escapes rather than literal characters so the pattern
 * stays greppable in a repo whose tooling scans this file as text.
 */
const CJK = /[\u3400-\u9fff]/;

const boldNames = (section: string): string[] =>
  [...section.matchAll(/\*\*([^*\n]+)\*\*/g)]
    .map((m) => m[1].trim())
    .filter((s) => !CJK.test(s));

describe('service/index names the dashboard and reports that exist (#948)', () => {
  describe.each(PAGES)('$file', ({ file, heading, impossibility, retired }) => {
    const section = () => sectionOf(file, heading);

    it('bolds only names the app actually carries', () => {
      const unknown = boldNames(section()).filter((n) => !ALLOWED_BOLD.has(n));
      expect(
        unknown,
        `${file}: bolded name(s) that are not a service_dashboard widget title, a case ` +
          'report label, a case_metrics label, or the dashboard\'s own two names. Bold is ' +
          'reserved for real names in this section — emphasis goes in *italics*.',
      ).toEqual([]);
    });

    it('lists every tile the service dashboard ships', () => {
      const text = section();
      const missing = WIDGET_TITLES.filter((t) => !text.includes(t));
      expect(
        missing,
        `${file}: the Service Overview summary omits tile(s) the dashboard now ships`,
      ).toEqual([]);
    });

    it('names the three case reports by their source labels, verbatim', () => {
      const text = section();
      const missing = REPORT_LABELS.filter((l) => !text.includes(l));
      expect(missing, `${file}: report label(s) missing or renamed`).toEqual([]);
    });

    it('does not resurrect the claims #948 removed', () => {
      const text = section();
      expect(retired.filter((phrase) => text.includes(phrase))).toEqual([]);
      // `SLA Performance` alone is the retired short name; the report is
      // `SLA Performance Report`.
      expect(text).not.toMatch(/SLA Performance(?!\s+Report)/);
    });

    it('states why an agent ranking cannot be built, not merely that it is absent', () => {
      const text = section();
      expect(text).toMatch(impossibility);
      expect(text).toContain(CaseDataset.name);
    });
  });
});

describe('the source facts those four bullets now rest on (#948)', () => {
  it('case_metrics declares no owner or agent dimension', () => {
    const dims = CaseDataset.dimensions.map((d) => `${d.name} ${d.field ?? ''}`.toLowerCase());
    expect(dims.filter((d) => /owner|agent|assign/.test(d))).toEqual([]);
  });

  it('no service dashboard widget ranks agents or ages cases', () => {
    const offenders = WIDGET_TITLES.filter((t) => /agent|oldest|owner/i.test(t));
    expect(
      offenders,
      'a tile like this would make the docs\' negative claim wrong — update both, not one',
    ).toEqual([]);
  });

  it('every service dashboard widget binds the dataset, so none lists individual cases', () => {
    const unbound = (ServiceDashboard.widgets ?? [])
      .filter((w) => (w as AnyRec).dataset !== CaseDataset.name)
      .map((w) => (w as AnyRec).id);
    expect(unbound).toEqual([]);
  });

  /**
   * NARROWED in #1213. The last line of this pin used to read "no measure whose
   * name matches /compl|within_sla|sla_met/ exists anywhere on `case_metrics`"
   * — a proxy for the prose that held only while the app had no compliance
   * measure at all. The service dashboard's gauge now plots one, so the proxy
   * would have forbidden the very metadata the page's own **SLA Compliance**
   * tile is built on.
   *
   * What the prose claims is about the REPORT: it carries the violation rate,
   * not a compliance percentage. That is pinned here from both directions, and
   * the positive half — where the compliance percentage DOES live — is the test
   * below, so the sentence cannot go stale in either direction.
   */
  it('the SLA report carries a violation rate over closed cases, not a compliance percentage', () => {
    expect(SlaPerformanceReport.values).toContain('avg_sla_violated');
    expect(SlaPerformanceReport.runtimeFilter).toMatchObject({ is_closed: true });
    const reported = (SlaPerformanceReport.values ?? []) as string[];
    expect(reported.filter((v) => /compl|within_sla|sla_met/i.test(v))).toEqual([]);
  });

  it('the compliance percentage the page points at is the dashboard gauge (#1213)', () => {
    const gauge = (ServiceDashboard.widgets ?? [])
      .find((w) => (w as AnyRec).id === 'sla_compliance_gauge') as AnyRec;
    expect(gauge, 'the page now points readers at a gauge that is gone').toBeTruthy();
    expect(gauge.values).toEqual(['sla_compliance_rate']);
    expect(CaseDataset.measures.map((m) => m.name)).toContain('sla_compliance_rate');
  });

  it('the daily-inflow report puts priority in the rows and the day in the columns', () => {
    expect(CasesOpenedByDayPriorityReport.rows).toEqual(['priority']);
    expect(CasesOpenedByDayPriorityReport.columns).toEqual(['created_date']);
    expect(CasesOpenedByDayPriorityReport.label).toBe('Cases Opened by Priority × Day');
  });
});

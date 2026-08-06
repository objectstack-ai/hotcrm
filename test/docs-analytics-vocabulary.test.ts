// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import { CrmApp } from '../src/apps/crm.app';
import * as dashboards from '../src/dashboards/index';
import * as datasets from '../src/datasets/index';
import * as reports from '../src/reports/index';
import { OpportunitiesByStageReport } from '../src/reports/opportunity.report';
import { pipelineByStageFunnelWidget } from '../src/dashboards/shared-widgets';

/**
 * The analytics landing page, and the cube vocabulary around it, pinned to
 * source (#976, #977).
 *
 * `content/docs/analytics/index.mdx` is the first screen a reader of the
 * analytics docs sees, and every count on it was a count of something else.
 * PR #954 / #975 had already written `analytics/reports` and `analytics/cubes`
 * to source; the landing page in front of them still promised *four cubes*,
 * *four dashboards*, *10+ reports including contracts*, a *Pipeline by Stage*
 * report, an *Analytics* navigation group and a Copilot reading cubes directly.
 * Eight further pages carried the same retired vocabulary (#977), two of them
 * concretely: a `src/cubes/` directory removed in #492, and a cube refresh
 * cadence nothing in `src/` configures.
 *
 * Nothing caught any of it: `os validate` and `pnpm lint` walk authored
 * metadata and never open `content/docs`, so — as with the service-index guard
 * in `docs-service-index-analytics.test.ts` (#948) and the quick-tour one in
 * `docs-quick-tour-navigation.test.ts` (#960) — the check has to live where the
 * claim lives.
 *
 * ## What is derived, and what is authored
 *
 * Every number and product name below is READ FROM `src/`: dashboard labels off
 * the dashboard barrel, report labels off the report barrel, the dataset count
 * off the dataset barrel, the navigation group and its children off
 * `CrmApp.navigation`, the refresh cadence off each dashboard's
 * `refreshInterval`. Change the app and this file goes red at PR time, in all
 * three locales — the failure mode the landing page had for months.
 *
 * The authored parts are the count WORDS (the pages spell them, and each is
 * asserted against its derived figure in the last describe) and {@link PHANTOMS}
 * — names the old page carried that resolve to nothing in the app. The
 * typography convention #927 / PR #932 established carries the distinction, and
 * the quick-tour guard leans on the same one: **bold** is reserved for names the
 * app really has, *italic* for a name a reader arrives with that the product
 * does not carry. A phantom must still be NAMED — say where the thing really
 * lives, do not delete it silently — and must never be bolded.
 *
 * ## Why the nav rules are scoped to one section
 *
 * *Dashboards*, *Reports* and *Cubes* are phantoms only as NAVIGATION items:
 * nothing in the sidebar carries those labels. They are perfectly real as the
 * three docs pages this page links to, and the "What's included" table bolds
 * them in exactly that sense. So the bold/italic rules run over the "Where to
 * find things" block alone, the way `docs-quick-tour-navigation.test.ts` scopes
 * its rules to the left-nav block, rather than over the whole page.
 *
 * ## Reverse verification (#976)
 *
 * Predicted direction: **red before this PR's content fix, green after**, and
 * measured that way — on the pre-fix page every locale failed at least four
 * rules: the dashboard count (4 against the barrel's 5), the report count
 * (`10+` plus a contract claim against the barrel's 10 with no contract
 * report), the nav block (which named an *Analytics* group and bolded
 * *Dashboards* / *Reports* / *Cubes* as if they were sidebar items) and the
 * Insights-children rule (that group was absent entirely). No rule here can
 * pass by asserting nothing: each documented count is paired with the derived
 * figure it came from, and both tree walks carry a vacuity guard.
 */

type AnyRec = Record<string, any>;

const DOCS_ROOT = join(REPO_ROOT, 'content/docs');

/* ---------------------------------------------------------------- source */

const DASHBOARD_LABELS: string[] = Object.values(dashboards as Record<string, AnyRec>).map(
  (d) => d.label as string,
);
const REPORT_LABELS: string[] = Object.values(reports as Record<string, AnyRec>).map(
  (r) => r.label as string,
);
const DATASET_LIST = Object.values(datasets as Record<string, AnyRec>);

const NAV = ((CrmApp as AnyRec).navigation ?? []) as AnyRec[];
const GROUPS = NAV.filter((n) => n.type === 'group');
const INSIGHTS = GROUPS.find((g) => g.label === 'Insights') as AnyRec | undefined;
const INSIGHTS_CHILDREN: string[] = ((INSIGHTS?.children ?? []) as AnyRec[]).map(
  (c) => c.label as string,
);

/** Every navigation label in the app, at any depth. */
const ALL_NAV_LABELS: string[] = (() => {
  const walk = (nodes: AnyRec[]): AnyRec[] =>
    nodes.flatMap((n) => [n, ...walk((n.children ?? []) as AnyRec[])]);
  return walk(NAV).map((n) => n.label as string);
})();

/** Distinct `refreshInterval` values declared across the dashboards, in seconds. */
const REFRESH_INTERVALS: number[] = [
  ...new Set(
    Object.values(dashboards as Record<string, AnyRec>)
      .map((d) => d.refreshInterval as number | undefined)
      .filter((n): n is number => typeof n === 'number'),
  ),
].sort((a, b) => a - b);

/* ----------------------------------------------------------------- pages */

const PAGES = [
  {
    file: 'content/docs/analytics/index.mdx',
    five: 'Five',
    ten: 'Ten',
    nine: 'Nine',
    noContract: 'There is no contract report',
    navHeading: '## Where to find things',
  },
  {
    file: 'content/docs/analytics/index.zh-Hans.mdx',
    five: '五个',
    ten: '十份',
    nine: '九个',
    noContract: '这里没有合同报表',
    navHeading: '## 在哪里可以找到',
  },
  {
    file: 'content/docs/analytics/index.zh-Hant.mdx',
    five: '五個',
    ten: '十份',
    nine: '九個',
    noContract: '這裡沒有合約報表',
    navHeading: '## 在哪裡可以找到',
  },
] as const;

/** Names the old nav section carried that resolve to no navigation label. */
const PHANTOMS = ['Analytics', 'Dashboards', 'Reports', 'Cubes'] as const;

/** The four cube names the page advertised. None exists anywhere in the app. */
const RETIRED_CUBES = ['Sales', 'Pipeline', 'Service', 'Marketing'] as const;

/**
 * The CJK range as escapes rather than literal characters, so this file stays
 * greppable in a repo whose tooling scans it as text — the same reason
 * `docs-quick-tour-navigation.test.ts` writes it this way.
 */
const CJK = /[\u3400-\u9fff]/;

const read = (file: string): string => readFileSync(join(REPO_ROOT, file), 'utf8');

/** The block from `heading` up to the next `## `. */
const blockOf = (text: string, heading: string): string => {
  const lines = text.split('\n');
  const from = lines.findIndex((l) => l.startsWith(heading));
  expect(from, `block start '${heading}' not found`).toBeGreaterThanOrEqual(0);
  const rest = lines.slice(from);
  const end = rest.findIndex((l, i) => i > 0 && l.startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
};

const boldNames = (text: string): string[] =>
  [...text.matchAll(/\*\*([^*\n]+)\*\*/g)].map((m) => m[1].trim()).filter((s) => !CJK.test(s));

const italicNames = (text: string): string[] =>
  [...text.replace(/\*\*[^*\n]+\*\*/g, '').matchAll(/\*([^*\n]+)\*/g)].map((m) => m[1].trim());

describe('analytics/index states the counts and names the app really ships (#976)', () => {
  describe.each(PAGES)('$file', ({ file, five, ten, nine, noContract, navHeading }) => {
    it('names all five dashboards, and says five', () => {
      const text = read(file);
      expect(text, `${file}: the dashboard count is not stated as "${five}"`).toContain(five);
      const missing = DASHBOARD_LABELS.filter((l) => !text.includes(l));
      expect(
        missing,
        `${file}: dashboard(s) the app ships but the page does not name: ${missing.join(', ')}. ` +
          'Sales Activity is the one the old "4 ready-made dashboards" row dropped.',
      ).toEqual([]);
    });

    it('says ten reports, and says a contract report does not exist', () => {
      const text = read(file);
      expect(text, `${file}: the report count is not stated as "${ten}"`).toContain(ten);
      expect(text, `${file}: "10+" is back — the library is exactly ten`).not.toMatch(/10\s*\+/);
      expect(
        text,
        `${file}: the page must say a contract report does not exist — no dataset reads crm_contract`,
      ).toContain(noContract);
    });

    it('says nine datasets and points at the directory they live in', () => {
      const text = read(file);
      expect(text, `${file}: the dataset count is not stated as "${nine}"`).toContain(nine);
      expect(text, `${file}: the page does not name src/datasets/`).toContain('src/datasets/');
    });

    it('names the Insights group and every child the app pins to it', () => {
      const block = blockOf(read(file), navHeading);
      expect(block, `${file}: the real navigation group is not named`).toContain('**Insights**');
      const missing = INSIGHTS_CHILDREN.filter((l) => !block.includes(`**${l}**`));
      expect(
        missing,
        `${file}: Insights child/children not named in bold: ${missing.join(', ')}`,
      ).toEqual([]);
    });

    it('bolds only real navigation labels in the nav section', () => {
      const unknown = boldNames(blockOf(read(file), navHeading)).filter(
        (n) => !ALL_NAV_LABELS.includes(n),
      );
      expect(
        unknown,
        `${file}: bolded name(s) in the navigation section that no nav item carries: ` +
          `${unknown.join(', ')}. Bold is reserved for real names here — a name the sidebar does ` +
          'not carry goes in *italics*.',
      ).toEqual([]);
    });

    it('still names every retired nav name, in italics, and never in bold', () => {
      const block = blockOf(read(file), navHeading);
      const italics = italicNames(block);
      const bold = boldNames(block);

      const unnamed = PHANTOMS.filter((n) => !italics.includes(n));
      expect(
        unnamed,
        `${file}: a name the old section carried was dropped instead of re-pointed: ` +
          `${unnamed.join(', ')}. Readers arrive with these names.`,
      ).toEqual([]);

      const promoted = PHANTOMS.filter((n) => bold.includes(n));
      expect(
        promoted,
        `${file}: nav name(s) the app does not carry, written in bold: ${promoted.join(', ')}`,
      ).toEqual([]);
    });

    it('names the real report behind the funnel everyone calls Pipeline by Stage', () => {
      const text = read(file);
      expect(
        text,
        `${file}: the report a rep actually runs is ${OpportunitiesByStageReport.label}`,
      ).toContain(`**${OpportunitiesByStageReport.label}**`);
      expect(italicNames(text), `${file}: the tile/chart title must be named as a non-report`)
        .toContain('Pipeline by Stage');
      expect(
        boldNames(text),
        `${file}: Pipeline by Stage is bolded as if it were a report — it is a tile title and a ` +
          'chart title, and no report answers to it',
      ).not.toContain('Pipeline by Stage');
    });

    it('names the four retired cube names in italics', () => {
      const italics = italicNames(read(file));
      const unnamed = RETIRED_CUBES.filter((n) => !italics.includes(n));
      expect(
        unnamed,
        `${file}: retired cube name(s) not named as retired: ${unnamed.join(', ')}`,
      ).toEqual([]);
    });

    it('links only to pages that exist', () => {
      const targets = [
        ...read(file).matchAll(/\]\((\/(?:zh-Han[st]\/)?docs\/[^)#\s]+)\)/g),
      ].map((m) => m[1]);
      expect(
        targets.length,
        `${file}: no internal doc links found — this rule would be vacuous`,
      ).toBeGreaterThan(3);
      const dangling = targets.filter((t) => {
        const slug = t.replace(/^\/(?:zh-Han[st]\/)?docs\//, '').replace(/\/$/, '');
        const locale = t.startsWith('/zh-Hans/')
          ? '.zh-Hans'
          : t.startsWith('/zh-Hant/')
            ? '.zh-Hant'
            : '';
        return (
          !existsSync(join(DOCS_ROOT, `${slug}${locale}.mdx`)) &&
          !existsSync(join(DOCS_ROOT, slug, `index${locale}.mdx`))
        );
      });
      expect(
        dangling,
        `${file}: link(s) to a page that does not exist: ${dangling.join(', ')}`,
      ).toEqual([]);
    });
  });
});

describe('the cube vocabulary retired with src/cubes/ is gone from the docs (#977)', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : full.endsWith('.mdx') ? [full] : [];
    });

  const ALL_PAGES = walk(DOCS_ROOT);

  it('has docs pages to check', () => {
    // A sweep over an empty tree passes by checking nothing — the same vacuity
    // guard `source-hygiene-scan-surface.test.ts` and the conversion-rate check
    // put in front of their own walks.
    expect(ALL_PAGES.length).toBeGreaterThan(100);
  });

  it('no page draws a `cubes/` directory (#492 removed it)', () => {
    const offenders = ALL_PAGES.filter((f) => /(?:^|[\s,`])(?:src\/)?cubes\//m.test(readFileSync(f, 'utf8')))
      .map((f) => relative(REPO_ROOT, f));
    expect(
      offenders,
      `page(s) drawing a directory that does not exist: ${offenders.join(', ')}. ` +
        'The semantic layer lives in src/datasets/ (ADR-0021) — a path in prose is still a promise.',
    ).toEqual([]);
  });

  it('the pages that quote a refresh cadence quote the declared one', () => {
    // The retired claim was "incremental refresh every 5 min / every few
    // minutes", a figure nothing in `src/` configures. What IS declared is each
    // dashboard's own `refreshInterval` — derived here rather than transcribed,
    // so a change in source lands on the docs at PR time.
    expect(
      REFRESH_INTERVALS.length,
      'no dashboard declares a refreshInterval — this rule has gone vacuous',
    ).toBeGreaterThan(1);
    const carriers = [
      'content/docs/reference/faq.mdx',
      'content/docs/reference/faq.zh-Hans.mdx',
      'content/docs/reference/faq.zh-Hant.mdx',
      'content/docs/reference/performance-and-limits.mdx',
      'content/docs/reference/performance-and-limits.zh-Hans.mdx',
      'content/docs/reference/performance-and-limits.zh-Hant.mdx',
    ];
    const missing = carriers.flatMap((f) => {
      const text = read(f);
      return REFRESH_INTERVALS.filter((s) => !new RegExp(`\\b${s}\\b`).test(text)).map(
        (s) => `${f}: does not state the declared ${s}s dashboard refresh interval`,
      );
    });
    expect(missing, missing.join('\n')).toEqual([]);
  });

  it('the FAQ claims no manual refresh control the metadata does not declare', () => {
    // U+27F3, written as an escape rather than pasted, for the same
    // greppability reason as CJK above.
    const REFRESH_GLYPH = /\u27f3/;
    for (const f of [
      'content/docs/reference/faq.mdx',
      'content/docs/reference/faq.zh-Hans.mdx',
      'content/docs/reference/faq.zh-Hant.mdx',
    ]) {
      expect(
        REFRESH_GLYPH.test(read(f)),
        `${f}: names a refresh button by its glyph. No dashboard in src/dashboards/ declares a ` +
          'manual refresh control — state what the app declares (refreshInterval) and leave the ' +
          "console's own chrome to the platform.",
      ).toBe(false);
    }
  });

  it('the glossary keeps its definition of the cube concept', () => {
    // #977 called this out explicitly: the concept is real and its entry is
    // correct, so a vocabulary sweep must not take it out with the rest.
    for (const f of [
      'content/docs/reference/glossary.mdx',
      'content/docs/reference/glossary.zh-Hans.mdx',
      'content/docs/reference/glossary.zh-Hant.mdx',
    ]) {
      expect(
        read(f),
        `${f}: the Cube glossary entry was swept away with the retired usages`,
      ).toMatch(/\*\*Cube\*\*/);
    }
  });
});

describe('the source facts these pages now rest on (#976, #977)', () => {
  it('the app ships five dashboards, one of them Sales Activity', () => {
    expect(DASHBOARD_LABELS).toHaveLength(5);
    expect(DASHBOARD_LABELS).toContain('Sales Activity');
  });

  it('the report library is exactly ten, and none of them is a contract report', () => {
    expect(REPORT_LABELS).toHaveLength(10);
    expect(REPORT_LABELS.filter((l) => /contract/i.test(l))).toEqual([]);
  });

  it('nine datasets, and none of them reads crm_contract', () => {
    expect(DATASET_LIST).toHaveLength(9);
    expect(DATASET_LIST.map((d) => d.object as string)).not.toContain('crm_contract');
  });

  it('the navigation group is Insights, and no group is called Analytics', () => {
    const labels = GROUPS.map((g) => g.label as string);
    expect(labels).toContain('Insights');
    expect(labels).not.toContain('Analytics');
    expect(INSIGHTS_CHILDREN).toEqual([
      'CRM Overview',
      'Forecasts',
      'Pipeline Coverage',
      'Lead Inflow',
      'SLA Performance',
    ]);
  });

  it('carries no navigation label matching any name the page calls a phantom', () => {
    expect(PHANTOMS.filter((n) => ALL_NAV_LABELS.includes(n))).toEqual([]);
  });

  it('Pipeline by Stage is a tile title and a chart title, and no report answers to it', () => {
    const title = pipelineByStageFunnelWidget({ x: 0, y: 0, w: 6, h: 4 }).title;
    expect(title).toBe('Pipeline by Stage');
    expect(OpportunitiesByStageReport.chart?.title).toBe(title);
    expect(REPORT_LABELS).not.toContain(title);
  });

  it('the sales-skills page the landing page links to exists', () => {
    // #976 reported this link as dangling. It is not: #589 / PR #611 renamed
    // the LINK TEXT (Sales Copilot -> Sales Skills) and the target page has
    // been there throughout. Pinned so a future page move turns this red
    // instead of quietly re-creating the link the issue expected to find.
    for (const suffix of ['', '.zh-Hans', '.zh-Hant']) {
      expect(existsSync(join(DOCS_ROOT, `ai-copilot/sales-copilot${suffix}.mdx`))).toBe(true);
    }
  });
});

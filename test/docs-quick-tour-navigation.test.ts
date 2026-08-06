// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import { CrmApp } from '../src/apps/crm.app';
import { ExecutiveDashboard } from '../src/dashboards/executive.dashboard';

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
 *    the same convention `docs-drift.test.ts` leans on.)
 *  - *italic* is reserved for a name the product does NOT carry, the spelling
 *    #927 / PR #932 established. Every retired name must still be named in
 *    italics — the convention is to say where a reader's name really lives, not
 *    to delete it silently — and no phantom may ever appear in bold.
 *  - exists ⇒ listed: the table's rows are compared against `CrmApp.navigation`
 *    group-for-group, child-for-child, in source order. Add a nav item without
 *    touching the tour and this file goes red at PR time, in all three locales.
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

const ALLOWED_BOLD = new Set<string>([...ALL_NAV_LABELS, ExecutiveDashboard.label as string]);

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
] as const;

/**
 * A name the old table used as a GROUP that is real only as an ITEM. It must be
 * named in italics (as the non-existent group) and may also appear in bold (as
 * the real item under Marketing), so it is exempt from the never-bold rule.
 */
const RETIRED_GROUP_NAMES = ['Products'] as const;

const PAGES = [
  {
    file: 'content/docs/getting-started/quick-tour.mdx',
    lang: 'en',
    /** First line of the guarded block; the block runs to the next `## `. */
    start: 'Inside Enterprise CRM,',
    sep: ', ',
    collapse: /collapsed when the app loads/,
  },
  {
    file: 'content/docs/getting-started/quick-tour.zh-Hans.mdx',
    lang: 'zh-Hans',
    start: '在 Enterprise CRM 内，',
    sep: '、',
    collapse: /在应用加载时是折叠的/,
  },
  {
    file: 'content/docs/getting-started/quick-tour.zh-Hant.mdx',
    lang: 'zh-Hant',
    start: '在 Enterprise CRM 內，',
    sep: '、',
    collapse: /在應用載入時是摺疊的/,
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
  describe.each(PAGES)('$file', ({ file, start, sep, collapse }) => {
    const block = () => blockOf(file, start);

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
  it('the app has one pinned top-level entry and seven groups', () => {
    expect(PINNED.map((p) => p.label)).toEqual(['Home']);
    expect(GROUP_LABELS).toEqual([
      'Sales',
      'My Work',
      'Activity',
      'Marketing',
      'Service',
      'Insights',
      'Approvals',
    ]);
  });

  it('Home opens the executive dashboard, not the CRM overview one', () => {
    expect(PINNED[0].type).toBe('dashboard');
    expect(PINNED[0].dashboardName).toBe(ExecutiveDashboard.name);
  });

  it('Marketing, Insights and Approvals are the groups that stay collapsed', () => {
    expect(COLLAPSED).toEqual(['Marketing', 'Insights', 'Approvals']);
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

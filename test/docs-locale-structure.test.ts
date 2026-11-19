// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { remark } from 'remark';
import remarkMdx from 'remark-mdx';
import remarkFrontmatter from 'remark-frontmatter';
import { remarkGfm, remarkHeading } from 'fumadocs-core/mdx-plugins';
import { REPO_ROOT } from './helpers/repo-root';
import { EXPLICIT_ID } from './helpers/heading-label';
import { twinsOf } from '../scripts/check-docs-locale-parity.mjs';

/**
 * A translated page has the English page's STRUCTURE — its sections, tables and
 * code blocks — not merely a file of the same name (#2610).
 *
 * ## Why
 *
 * The locale checks before this one held a twin to existing
 * (`docs-object-coverage.test.ts`), to its callout count
 * (`docs-locale-callouts.test.ts`), to its anchors resolving and to a few
 * terms. A Chinese page that lost a whole section or table passed all of them,
 * and `scripts/check-docs-locale-parity.mjs` (#2609) only asks that a change
 * touch the twins too, never what the twins then say. This extends the callout
 * test's approach — structure, never wording — to the rest of a page's shape.
 * Wording is not compared: a guard on free prose was refused (#1646).
 *
 * ## The pairs
 *
 * Exactly the pairs the #2609 gate watches, through its own `twinsOf`, so the
 * two can never disagree about which file is whose twin: every
 * `content/docs/**\/X.mdx` with `X.zh-Hans.mdx` and `X.zh-Hant.mdx`, and every
 * `src/**\/docs/X.md` with `X.zh.md`. README.md and README.zh-CN.md are a
 * pair there and not here: the README's two languages are #2606's.
 *
 * ## What is compared, per pair
 *
 *  1. **The outline** — the sequence of heading depths. A dropped `###` or a
 *     duplicated `##` changes it; a reworded heading does not.
 *  2. **Heading ids, where the twin states one.** A Chinese docs heading carries
 *     an explicit English anchor (`## 线索详情布局 [#lead-detail-layout]`,
 *     AGENTS.md rule 6), and where it does, that id must be the English page's
 *     id for the heading at the same place in the outline — a link written
 *     against the English page then reaches the same section in every locale.
 *  3. **The number of tables** (GFM, read with fumadocs' own `remarkGfm`).
 *  4. **The number of fenced code blocks** — `mermaid` and `metadata` blocks
 *     included, which on a manual page are the lifecycle and machine facts.
 *
 * Every count comes off the parsed tree, never off a line regex: a `## …` or a
 * `| … |` inside a fenced sample is code, not structure, and a regex cannot
 * tell. The `.mdx` pages go through the MDX pipeline the site renders with
 * (`test/helpers/docs-anchors.ts` says why); the in-app manuals are plain
 * markdown, rendered by the console rather than fumadocs, and are parsed as
 * such.
 *
 * ## Why heading ids are compared only where the twin states one
 *
 * The card asked for the same SET of heading ids on every pair, on the premise
 * that Chinese headings already carry explicit English ids. Measured on
 * `origin/main` @ `abe2094c`: 103 of the 1,996 heading lines on the zh-Hans
 * and zh-Hant pages carry one, on 48 pages; everywhere else fumadocs slugs the
 * Chinese text (`## 路线图` → `#路线图`). A set comparison is therefore red on
 * 172 of 201 pairs over ids alone — a guard that is red over the whole tree
 * says nothing about the page that really lost a section. The outline is what
 * catches that loss, on every pair; the id check holds the anchors that exist
 * to the English ones. Adding the missing anchors is its own piece of work
 * (it renames every Chinese URL fragment a reader may have bookmarked), and is
 * reported on #2610 rather than done here.
 *
 * The in-app manuals carry no explicit ids in either language and are held to
 * checks 1, 3 and 4.
 *
 * ## Measured on main before the fixes (`abe2094c`)
 *
 * 201 pairs (173 docs-site, 28 manual). Tables and code blocks: no gap.
 * Outline: four, and both were real —
 *
 *  - `sales/leads.zh-Han{s,t}.mdx` had no counterpart of *When the surviving
 *    record is later deleted*, the rule that a confirmed duplicate verdict
 *    outlives the record it named. Translated from the English page.
 *  - `sales/opportunities.zh-Han{s,t}.mdx` carried *The detail screen* twice:
 *    the current text and, after it, the text #2671 replaced in English —
 *    which contradicts it (*Financials* shown vs. not drawn). The stale copy
 *    is deleted.
 *
 * {@link DELIBERATE} is therefore empty. It is the place a difference that is
 * meant goes, with its reason; each entry records the values it was written
 * against, and fails as stale the moment the pair stops differing that way.
 *
 * ## Reverse verification (#2610)
 *
 * Predicted direction: red. Removing one `##` heading from a zh page turned the
 * outline check red naming that page and nothing else; restoring it, checked by
 * blob hash against `HEAD`, turned it green. Recorded on the PR.
 */

/** A heading as the renderer reads it. */
interface Heading {
  readonly depth: number;
  readonly id: string;
  /** The source wrote `[#id]` itself, rather than leaving the slug to fumadocs. */
  readonly explicit: boolean;
}

interface Shape {
  readonly headings: readonly Heading[];
  readonly tables: number;
  readonly code: number;
}

type Check = 'outline' | 'ids' | 'tables' | 'code';

interface Gap {
  readonly twin: string;
  readonly check: Check;
  /** What the English page has, and what the twin has — the allowlist's key. */
  readonly en: string;
  readonly translated: string;
}

/**
 * A difference that is meant, with the reason it is meant. `en` and
 * `translated` are the values {@link compare} reports, so an entry matches one
 * gap exactly and goes stale when the pages change.
 */
interface Deliberate extends Gap {
  readonly reason: string;
}

const DELIBERATE: readonly Deliberate[] = [];

interface MdastNode {
  type: string;
  depth?: number;
  value?: string;
  children?: MdastNode[];
  position?: { start?: { offset?: number } };
  data?: { hProperties?: { id?: unknown } };
}

const walk = (node: MdastNode, visit: (n: MdastNode) => void): void => {
  visit(node);
  for (const child of node.children ?? []) walk(child, visit);
};

const mdxProcessor = remark().use(remarkFrontmatter, ['yaml']).use(remarkMdx).use(remarkGfm).use(remarkHeading);
const mdProcessor = remark().use(remarkFrontmatter, ['yaml']).use(remarkGfm);

/** The structure of one page. `.mdx` through the site's pipeline, `.md` as plain markdown. */
const shapeOf = async (source: string, mdx: boolean): Promise<Shape> => {
  const processor = mdx ? mdxProcessor : mdProcessor;
  const tree = processor.parse(source) as unknown as MdastNode;
  // Read `[#id]` off the source before `remarkHeading` strips it from the text.
  const explicit: boolean[] = [];
  walk(tree, (n) => {
    if (n.type !== 'heading') return;
    const last = n.children?.at(-1);
    explicit.push(last?.type === 'text' && EXPLICIT_ID.test(last.value ?? ''));
  });
  await processor.run(tree as never);

  const headings: Heading[] = [];
  let tables = 0;
  let code = 0;
  walk(tree, (n) => {
    if (n.type === 'heading') {
      const id = mdx ? String(n.data?.hProperties?.id ?? '') : '';
      headings.push({ depth: n.depth ?? 0, id, explicit: explicit[headings.length] });
    } else if (n.type === 'table') tables += 1;
    else if (n.type === 'code') {
      // Fenced only. MDX has no indented code; a manual page could, and an
      // indented block is a quotation of code, not a block a reader runs.
      const at = n.position?.start?.offset ?? -1;
      if (at >= 0 && /^(`{3,}|~{3,})/.test(source.slice(at, at + 3))) code += 1;
    }
  });
  return { headings, tables, code };
};

const outlineOf = (shape: Shape): string => shape.headings.map((h) => h.depth).join('');

/** Every way `translated` departs from `en`'s structure. */
const compare = (twin: string, en: Shape, translated: Shape): Gap[] => {
  const gaps: Gap[] = [];
  const enOutline = outlineOf(en);
  const twOutline = outlineOf(translated);
  if (enOutline !== twOutline) {
    gaps.push({ twin, check: 'outline', en: enOutline, translated: twOutline });
  } else {
    // Only on an outline that matches is "the heading at the same place" defined.
    const wrong = translated.headings
      .map((h, i) => ({ h, i }))
      .filter(({ h, i }) => h.explicit && h.id !== en.headings[i].id);
    if (wrong.length > 0) {
      gaps.push({
        twin,
        check: 'ids',
        en: wrong.map(({ i }) => en.headings[i].id).join(','),
        translated: wrong.map(({ h }) => h.id).join(','),
      });
    }
  }
  if (en.tables !== translated.tables) {
    gaps.push({ twin, check: 'tables', en: String(en.tables), translated: String(translated.tables) });
  }
  if (en.code !== translated.code) {
    gaps.push({ twin, check: 'code', en: String(en.code), translated: String(translated.code) });
  }
  return gaps;
};

const sameGap = (a: Gap, b: Gap): boolean =>
  a.twin === b.twin && a.check === b.check && a.en === b.en && a.translated === b.translated;

const describeGap = (g: Gap): string => {
  if (g.check === 'outline') return `${g.twin}: heading outline ${g.translated}, but the English page's is ${g.en}`;
  if (g.check === 'ids') return `${g.twin}: explicit heading id(s) ${g.translated} where the English page has ${g.en}`;
  return `${g.twin}: ${g.translated} ${g.check === 'tables' ? 'table(s)' : 'fenced code block(s)'}, but the English page has ${g.en}`;
};

/** Every English page and its twins, by the #2609 gate's own pairing rule. */
const englishPages = (): string[] => {
  const files: string[] = [];
  const visit = (dir: string): void => {
    for (const entry of readdirSync(join(REPO_ROOT, dir), { withFileTypes: true })) {
      const rel = join(dir, entry.name);
      if (entry.isDirectory()) visit(rel);
      else files.push(relative(REPO_ROOT, join(REPO_ROOT, rel)).split('\\').join('/'));
    }
  };
  visit('content/docs');
  visit('src');
  return files.filter((f) => twinsOf(f)).sort();
};

describe('translated docs and manual pages keep the English page structure', () => {
  const read = (path: string): string => readFileSync(join(REPO_ROOT, path), 'utf8');
  let pairs: { en: string; twin: string; enShape: Shape; twinShape: Shape }[] = [];
  let gaps: Gap[] = [];

  /** Parsed once: ~460 pages through the MDX pipeline (see the anchor test's note on why one hook). */
  beforeAll(async () => {
    for (const en of englishPages()) {
      const mdx = en.endsWith('.mdx');
      const enShape = await shapeOf(read(en), mdx);
      for (const twin of twinsOf(en) as string[]) {
        // A missing twin is the #2609 test's finding, not this one's.
        if (!existsSync(join(REPO_ROOT, twin))) continue;
        pairs.push({ en, twin, enShape, twinShape: await shapeOf(read(twin), mdx) });
      }
    }
    gaps = pairs.flatMap((p) => compare(p.twin, p.enShape, p.twinShape));
  }, 120_000);

  it('compares real pairs that carry real structure', () => {
    // Vacuity guard: every half of the comparison has something to compare.
    const site = pairs.filter((p) => p.en.startsWith('content/docs/'));
    const manual = pairs.filter((p) => p.en.startsWith('src/'));
    expect(site.length, 'docs-site pairs').toBeGreaterThan(150);
    expect(manual.length, 'manual pairs').toBeGreaterThan(20);
    expect(pairs.filter((p) => p.enShape.tables > 0).length, 'English pages with a table').toBeGreaterThan(50);
    expect(pairs.filter((p) => p.enShape.code > 0).length, 'English pages with a code block').toBeGreaterThan(20);
    expect(manual.filter((p) => p.enShape.code > 0).length, 'manual pages with a code block').toBeGreaterThan(0);
    expect(
      pairs.filter((p) => p.twinShape.headings.some((h) => h.explicit)).length,
      'twins with an explicit heading id — the id check would compare nothing',
    ).toBeGreaterThan(20);
  });

  it('every twin has the English outline, explicit ids, tables and code blocks', () => {
    const open = gaps.filter((g) => !DELIBERATE.some((d) => sameGap(d, g)));
    expect(
      open.map(describeGap),
      'A translated page lost or gained structure. Translate the missing part from the English page, ' +
        'or delete what the English page no longer has. If the difference is meant, add it to DELIBERATE ' +
        'with its reason — never edit the English page to get green.',
    ).toEqual([]);
  });

  it('every DELIBERATE entry still describes a difference on the tree', () => {
    const stale = DELIBERATE.filter((d) => !gaps.some((g) => sameGap(d, g)));
    expect(
      stale.map((d) => `${describeGap(d)} — no longer true; delete the entry (reason was: ${d.reason})`),
    ).toEqual([]);
  });
});

/** The reader and the comparison on fixtures, so a rule that stopped working cannot hide behind a clean tree. */
describe('the structure comparison itself', () => {
  const page = [
    '---',
    'title: T',
    '---',
    '',
    '# T',
    '',
    '## A',
    '',
    '| x | y |',
    '| --- | --- |',
    '| 1 | 2 |',
    '',
    '### A1',
    '',
    '```mermaid',
    'stateDiagram-v2',
    '```',
    '',
  ].join('\n');

  it('reads outline, tables and fenced code — and not a heading or table inside a fence', async () => {
    const fenced = `${page}\n\`\`\`md\n## not a heading\n\n| not | a table |\n| --- | --- |\n\`\`\`\n`;
    for (const mdx of [true, false]) {
      const shape = await shapeOf(fenced, mdx);
      expect(outlineOf(shape)).toBe('123');
      expect(shape.tables).toBe(1);
      expect(shape.code).toBe(2);
    }
  });

  it('fails a dropped section, a dropped table and an extra code block', async () => {
    const en = await shapeOf(page, true);
    const dropped = await shapeOf(page.replace('### A1\n', ''), true);
    expect(compare('t', en, dropped).map((g) => g.check)).toEqual(['outline']);
    const noTable = await shapeOf(page.replace(/\| x[^]*?\| 1 \| 2 \|\n/, ''), true);
    expect(compare('t', en, noTable).map((g) => g.check)).toEqual(['tables']);
    const extra = await shapeOf(`${page}\n\`\`\`ts\nx\n\`\`\`\n`, true);
    expect(compare('t', en, extra)).toEqual([{ twin: 't', check: 'code', en: '1', translated: '2' }]);
  });

  it('holds an explicit id to the English id at the same place, and leaves a slugged one alone', async () => {
    const en = await shapeOf(page, true);
    const zh = (a: string) => page.replace('# T\n', '# 标题\n').replace('## A\n', `## ${a}\n`);
    expect(compare('t', en, await shapeOf(zh('甲'), true))).toEqual([]);
    expect(compare('t', en, await shapeOf(zh('甲 [#a]'), true))).toEqual([]);
    expect(compare('t', en, await shapeOf(zh('甲 [#b]'), true))).toEqual([
      { twin: 't', check: 'ids', en: 'a', translated: 'b' },
    ]);
  });

  it('pairs exactly as the #2609 gate does, README excluded', () => {
    const pages = englishPages();
    expect(pages).toContain('content/docs/(product)/sales/leads.mdx');
    expect(pages).toContain('src/docs/crm_sales_activities.md');
    expect(pages.some((p) => p.endsWith('.zh-Hans.mdx') || p.endsWith('.zh.md'))).toBe(false);
    expect(pages).not.toContain('README.md');
  });
});

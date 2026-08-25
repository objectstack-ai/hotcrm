// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import { headingLabel } from './helpers/heading-label';
import stack from '../objectstack.config';

/*
 * The dashboards docs page, checked against the dashboards the app registers.
 *
 * Split out of `test/docs-drift.test.ts` whole (#1196); see the SPLIT BY
 * FAMILY table there for the other families.
 */

/**
 * Dashboard-tile drift — the docs page must not list tiles the app does not ship.
 *
 * `content/docs/analytics/dashboards.mdx` names the tiles of each dashboard, and
 * before #610 almost none of them existed: CRM Overview and Executive overlapped
 * the real metadata on ZERO tiles, the page advertised measures no dataset
 * defines ("Net New ARR", "Customer Acquisition Cost", "Forecast vs Quota"), and
 * it asserted a click statistic ("the most-clicked widget on this dashboard")
 * about a tile that does not exist, from telemetry this repo does not collect.
 * The page also still said "four dashboards" after #592/PR #670 registered a
 * fifth (`sales_activity_dashboard`) — an undocumented dashboard is the same
 * defect seen from the other side.
 *
 * Nothing checked, because a tile name in prose is just prose: `os validate` and
 * `pnpm lint` walk authored metadata and never open `content/docs`. So the check
 * has to live where the claim lives — in the text.
 *
 * The rule: inside the `##` section of a dashboard, every bullet that OPENS with
 * a bolded name (`- **Total Revenue** — …`) must resolve to a widget `title` on
 * THAT dashboard, and every `**X** tile` reference anywhere on the page must
 * resolve to a widget title on SOME dashboard (which is what "use the **Slipping
 * Deals** tile every Friday" in the Tips section failed).
 *
 * Direction is deliberate, per the ruling on #610: listed ⇒ exists. The reverse
 * (every widget must be listed) is NOT enforced here — the defect class is a doc
 * that promises what the product lacks. Section coverage below is what keeps the
 * page from silently omitting a whole dashboard, which is the case that actually
 * bit.
 *
 * Locale note (#685): `dashboards.zh-Hans.mdx` / `.zh-Hant.mdx` were retranslated
 * against the current English page and now sit in `DOC_PAGES` alongside it. The
 * extraction is locale-agnostic on purpose — the section headings carry each
 * dashboard's own English `label` and the bold tile names are left in English in
 * every locale, so the same two extractions resolve all three files. That is what
 * makes the section-coverage rule bite per locale: registering a sixth dashboard
 * now fails until all three pages document it, which is the shape #592 needed.
 *
 * The one asymmetry that survived #685 is gone as of #725: the `**Name** tile`
 * prose rule keyed on the English word "tile", so it fired on the English page
 * only, while the zh pages say `**Quiet 90+ Days** 磁贴 / 磁貼`. Their tile LISTS
 * were checked; a stray tile name in their running prose was not. The noun now
 * comes from `TILE_WORDS`, so the rule reads all three pages — 2 references
 * before, 6 after, and the English hit set is unchanged (same two names, same
 * page). No page had to move a word: every tile the zh prose names was already a
 * real widget, which is why this was filed as a dormant coverage gap rather than
 * a live defect.
 */
describe('the dashboards docs page lists tiles that exist', () => {
  type AnyRec = Record<string, any>;
  const dashboards: AnyRec[] = (stack as any).dashboards ?? [];

  const DOC_PAGES = [
    'content/docs/analytics/dashboards.mdx',
    'content/docs/analytics/dashboards.zh-Hans.mdx',
    'content/docs/analytics/dashboards.zh-Hant.mdx',
  ];

  /** `## 🏠 CRM Overview` → heading text + everything up to the next `## `. */
  const sectionsOf = (text: string): { heading: string; body: string }[] => {
    const out: { heading: string; body: string[] }[] = [];
    for (const line of text.split('\n')) {
      const m = /^## +(.*)$/.exec(line);
      if (m) out.push({ heading: m[1].trim(), body: [] });
      else if (out.length) out[out.length - 1].body.push(line);
    }
    return out.map((s) => ({ heading: s.heading, body: s.body.join('\n') }));
  };

  // `headingLabel` — leading emoji and trailing fumadocs `[#id]` dropped — is
  // imported from `./helpers/heading-label`, where its rationale lives and
  // `test/heading-label.test.ts` pins it. Both consumers below go through it:
  // the heading set built for the coverage test, and the `.find()` that locates
  // a dashboard's section.

  /** `- **Total Revenue** — …` → `Total Revenue`. Opening bold only. */
  const listedTiles = (body: string): string[] =>
    [...body.matchAll(/^- \*\*(.+?)\*\*/gm)].map((m) => m[1].trim());

  /**
   * The noun each locale's page uses for "tile". The tile NAMES stay English in
   * every locale (see the Locale note above), so this one word is the whole
   * locale surface of the prose rule — which is why it is a table rather than
   * three regexes or three per-page rules.
   *
   * Entries are plain words: they are joined into an alternation verbatim, so
   * anything carrying regex punctuation would not mean what it reads as.
   */
  const TILE_WORDS = ['tiles', 'tile', '磁贴', '磁貼'];

  /**
   * `the **Quiet 90+ Days** tile` / `**Quiet 90+ Days** 磁贴` — anywhere in the
   * prose, in any locale the page ships (#725).
   *
   * Two details are load-bearing rather than style:
   *
   * - the separator is `\s*`, not `\s+`. Chinese typography does not put a space
   *   before the noun, so `\s+` would leave `**Quiet 90+ Days**磁贴` unchecked —
   *   the same hole this rule just closed, in the spelling the next translator
   *   is most likely to reach for.
   * - the tail guard is a lookahead, not `\b`. A JS word boundary is defined
   *   against `[A-Za-z0-9_]` on BOTH sides, so there is no boundary between the
   *   last character of 磁贴 and the full stop after it, and `磁贴\b` would never
   *   match anything the zh pages actually write. The lookahead accepts exactly
   *   the strings `tiles?\b` accepted, so the English half is untouched, and
   *   lets the CJK half end on punctuation.
   */
  const TILE_REFERENCE = new RegExp(
    String.raw`\*\*([^*\n]+)\*\*\s*(?:${TILE_WORDS.join('|')})(?![A-Za-z0-9_])`,
    'g',
  );

  const titlesOf = (d: AnyRec): Set<string> =>
    new Set((d.widgets ?? []).map((w: AnyRec) => w.title).filter(Boolean));

  const ALL_TITLES = new Set(dashboards.flatMap((d) => [...titlesOf(d)]));

  const PAGES = DOC_PAGES.map((file) => ({
    file,
    text: readFileSync(join(REPO_ROOT, file), 'utf8'),
  }));

  it('every registered dashboard has a section on the page', () => {
    // Vacuity guard #1, and the case #592 walked into: a dashboard shipped with
    // no section here reads to a user as a dashboard that does not exist, and
    // leaves the per-section rules below with nothing to check for it.
    expect(dashboards.length, 'no dashboards registered — this whole guard is vacuous').toBeGreaterThan(0);
    for (const { file, text } of PAGES) {
      const headings = new Set(sectionsOf(text).map((s) => headingLabel(s.heading)));
      const undocumented = dashboards.map((d) => d.label).filter((l: string) => !headings.has(l));
      expect(
        undocumented,
        `${file} has no section for: ${undocumented.join(', ')}. ` +
          'Add a `## <label>` section listing its tiles (the heading must carry the ' +
          "dashboard's own `label`, emoji prefix aside) — a dashboard nobody documents " +
          'is one nobody finds.',
      ).toEqual([]);
    }
  });

  for (const d of dashboards) {
    it(`${d.label}: every tile the page lists is a widget on this dashboard`, () => {
      const titles = titlesOf(d);
      for (const { file, text } of PAGES) {
        const section = sectionsOf(text).find((s) => headingLabel(s.heading) === d.label);
        if (!section) continue; // reported by the coverage test above
        const listed = listedTiles(section.body);
        // Vacuity guard #2: a section whose bullets stopped parsing would pass
        // this test by asserting nothing at all — exactly the state the page was
        // in before #610, where nobody was checking anything.
        expect(
          listed.length,
          `${file}: the "${d.label}" section lists no tiles. Either the tile bullets ` +
            '(`- **Name** — …`) were removed, or the extraction no longer matches them; ' +
            'a guard over zero input is worse than none.',
        ).toBeGreaterThan(0);
        const shipped = [...titles].join(' | ');
        const bad = listed
          .filter((name) => !titles.has(name))
          .map(
            (name) =>
              `${file}: "${d.label}" lists a tile "${name}" that ${d.name} does not ship ` +
              `(widgets: ${shipped})`,
          );
        expect(
          bad,
          `documented tiles that do not exist:\n  ${bad.join('\n  ')}\n` +
            'Trim the docs to the widgets the dashboard actually declares — do not add ' +
            'the widget to satisfy the doc unless that is a product decision someone made.',
        ).toEqual([]);
      }
    });
  }

  it('the tile reference extraction reads every locale the page ships (#725)', () => {
    // The standing form of #725's red/green check, and the reason it is not
    // enough to lean on the vacuity guard below: that one counts the UNION over
    // the three pages, so deleting a locale from TILE_WORDS keeps it green on
    // the English hits alone — silently reopening the gap this closed. Probe
    // each word directly, spaced and unspaced, with a CJK full stop as the tail
    // (the character `\b` cannot follow — see TILE_REFERENCE).
    const reads = (probe: string): string[] =>
      [...probe.matchAll(TILE_REFERENCE)].map((m) => m[1].trim());
    const unread = TILE_WORDS.flatMap((word) =>
      [' ', ''].map((gap) => `每周都处理一次 **Open Deals**${gap}${word}。`),
    ).filter((probe) => reads(probe)[0] !== 'Open Deals');
    // Collected rather than asserted per probe, so a narrowed regex names every
    // spelling it stopped reading in one run instead of only the first.
    expect(
      unread,
      `TILE_REFERENCE no longer reads:\n  ${unread.join('\n  ')}\n` +
        'A locale whose word for "tile" this regex cannot see is a page whose running prose ' +
        'nobody checks — which is exactly the state the zh pages were in between #685 and #725.',
    ).toEqual([]);
  });

  it('every "**Name** tile" / "**Name** 磁贴" reference names a real tile', () => {
    const refs = PAGES.flatMap(({ file, text }) =>
      [...text.matchAll(TILE_REFERENCE)].map((m) => ({ file, name: m[1].trim() })),
    );
    // Vacuity guard #3. If the prose legitimately stops naming tiles outside the
    // lists, delete this check rather than leaving it green over nothing.
    expect(
      refs.length,
      `no \`**Name** ${TILE_WORDS.join(' / ')}\` reference found in the dashboards docs — ` +
        'this check has gone vacuous.',
    ).toBeGreaterThan(0);
    const bad = refs
      .filter((r) => !ALL_TITLES.has(r.name))
      .map((r) => `${r.file}: prose points at a "${r.name}" tile, which no dashboard ships`);
    expect(
      bad,
      `tile references that do not resolve:\n  ${bad.join('\n  ')}\n` +
        'Name a tile that exists, or drop the advice — a workflow built on a tile ' +
        'nobody can open is worse than no advice.',
    ).toEqual([]);
  });
});

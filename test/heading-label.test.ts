// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import { headingLabel } from './helpers/heading-label';
import stack from '../objectstack.config';

/**
 * `headingLabel()` reduces a docs heading to the label a drift guard compares
 * against metadata. `test/docs-dashboard-tiles.test.ts` runs every
 * dashboards-page rule
 * through it, so what it can and cannot see decides what those rules check.
 *
 * ## Why this file exists (#935)
 *
 * The helper used to strip only *leading* non-letters, so a fumadocs explicit
 * id trailing a heading survived into the label and the match failed. Measured
 * on `origin/main` @ `ac02bf15` by appending `[#sales-performance]` to the
 * English page's `## 📈 Sales Performance` heading and running the drift suite:
 *
 * ```
 * × every registered dashboard has a section on the page
 *   AssertionError: content/docs/analytics/dashboards.mdx has no section for:
 *   Sales Performance. Add a `## <label>` section listing its tiles …
 * Tests  1 failed | 75 passed (76)
 * ```
 *
 * Two things make that worth a guard rather than a note. The message points at
 * the heading TEXT while the section is right there, so the next reader re-reads
 * the words and never suspects the matcher. And it closed the only clean route
 * to a stable anchor on those pages: every section heading there opens with an
 * emoji, so `github-slugger` gives them all a leading-hyphen slug
 * (`-sales-performance`), and an explicit id is what you would reach for.
 *
 * ## The shape of the pin
 *
 * A test asserting that today's headings still match would pass before and
 * after and pin nothing — no page writes a `##` heading with an explicit id.
 * The property pinned instead is: **a heading carrying an explicit id resolves
 * to the same label as the heading without one**, which is red on the old
 * helper and green on the new one.
 *
 * The second test is the other half, and the more important one to keep. This
 * is a guard fix, so the failure mode to avoid is a guard that goes green by
 * becoming more permissive than intended: `headingLabel` is what
 * `sectionsOf(...).find(...)` matches on, so two genuinely different headings
 * collapsing to one label would let a rule read the wrong section and report
 * clean.
 *
 * ## What #1272 added
 *
 * That last paragraph described a hazard. It was already happening: the leading
 * strip was `/^[^A-Za-z]+/`, so four of the nine `## ` headings on each zh page
 * carried no Latin letter and resolved to `""` together. #1272 replaced the
 * strip with `LEADING_ORNAMENT` (the reasoning is in the helper) and pinned the
 * result from both ends — the last two tests here. One measures the change
 * against the old strip and allows only the moves that were unreachable; the
 * other is the invariant that would have caught this the day it appeared, and
 * is the reason it cannot come back silently in a third spelling.
 */
describe('headingLabel() reads a heading the way fumadocs renders it', () => {
  type AnyRec = Record<string, any>;
  const dashboards: AnyRec[] = (stack as any).dashboards ?? [];

  const DOC_PAGES = [
    'content/docs/analytics/dashboards.mdx',
    'content/docs/analytics/dashboards.zh-Hans.mdx',
    'content/docs/analytics/dashboards.zh-Hant.mdx',
  ];

  /**
   * The `## ` headings of a page. Deliberately just the heading lines — this
   * file has no use for section bodies, so it does not re-implement
   * `sectionsOf()` from the drift suite, it reads less.
   */
  const headingsOf = (text: string): string[] =>
    text
      .split('\n')
      .map((line) => /^## +(.*)$/.exec(line)?.[1].trim())
      .filter((h): h is string => Boolean(h));

  /**
   * Read once, kept per file — the duplicate-label invariant below is a
   * PER-PAGE property, so it needs the grouping that `PAGE_HEADINGS` flattens
   * away. Three files, so no timeout budget is stated: this reads the same
   * three pages the drift rules read, not a walk of `content/docs`.
   */
  const PAGES = DOC_PAGES.map((file) => ({
    file,
    headings: headingsOf(readFileSync(join(REPO_ROOT, file), 'utf8')),
  }));

  const PAGE_HEADINGS = PAGES.flatMap((p) => p.headings);

  it('a section heading still resolves to its label when it carries an explicit id (#935)', () => {
    // The probes are the pages' OWN headings with an id appended, not invented
    // strings: what has to keep working is the heading someone would actually
    // edit. Deduped via the Map — all three locales carry the same English
    // headings for the dashboard sections.
    const probes = new Map<string, string>(); // heading + id → the label it must still yield
    for (const d of dashboards) {
      const slug = String(d.label).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      for (const heading of PAGE_HEADINGS) {
        if (headingLabel(heading) !== d.label) continue;
        probes.set(`${heading} [#${slug}]`, d.label);
        probes.set(`${heading} [#${slug}] `, d.label); // a trailing space is legal too
      }
    }

    // Vacuity guard. The probes are built by matching real headings against
    // real dashboards, so a renamed section or an emptied registry would leave
    // this green over nothing — the state a pin must never reach. Section
    // coverage itself is `docs-dashboard-tiles.test.ts`'s job, not this file's;
    // here it
    // is only the evidence that the probes are real.
    expect(dashboards.length, 'no dashboards registered — this pin is vacuous').toBeGreaterThan(0);
    expect(
      [...new Set(probes.values())].sort(),
      'no probe built for some dashboard — the dashboards pages no longer carry the ' +
        'headings this pin reads, so it is measuring nothing for those labels',
    ).toEqual(dashboards.map((d) => String(d.label)).sort());

    const drifted = [...probes]
      .filter(([heading, label]) => headingLabel(heading) !== label)
      .map(([heading, label]) => `"${heading}" → "${headingLabel(heading)}" (want "${label}")`);
    expect(
      drifted,
      `headingLabel() cannot see past a fumadocs explicit id:\n  ${drifted.join('\n  ')}\n` +
        'A heading is allowed to carry `[#id]` — fumadocs strips it before rendering, so the ' +
        'label a reader sees is unchanged. Reading past it here is what lets a dashboards ' +
        'section have a stable anchor without the drift guard reporting the section missing.',
    ).toEqual([]);
  });

  it('does not collapse headings whose visible text differs (#935)', () => {
    // None of these tails is an explicit id, and each fails a different clause:
    // `[see #935]` does not open with `#`; the markdown link never opens a `[#`
    // at all; `[#a] and more` is not at the end of the heading; the backticked
    // one renders as literal code, and fumadocs takes an id off a trailing TEXT
    // node only. All four must survive into the label.
    const kept = [
      'Sales Performance [see #935]',
      'Sales Performance [docs](/analytics/dashboards)',
      'Sales Performance [#a] and more',
      'Sales Performance `[#x]`',
    ];
    const swallowed = kept.filter((h) => headingLabel(h) === 'Sales Performance');
    expect(
      swallowed,
      `headingLabel() stripped a tail that fumadocs would render:\n  ${swallowed.join('\n  ')}\n` +
        'A reader sees those characters, so these are different labels. Collapsing them ' +
        'would let a section match a dashboard it does not document — a guard reporting ' +
        'clean about text it never read is worse than no guard.',
    ).toEqual([]);

    // Two headings differing ONLY in their id are the same heading to a reader,
    // because the id is not rendered. Resolving them together is the intended
    // behaviour, not a leak — asserted so nobody "tightens" it back.
    expect(headingLabel('📈 Sales Performance [#a]')).toBe(
      headingLabel('📈 Sales Performance [#b]'),
    );
    // …but an id shared between two different headings must not merge them.
    expect(headingLabel('📈 Sales Performance [#same]')).not.toBe(
      headingLabel('☎️ Sales Activity [#same]'),
    );
  });

  it('moves only the labels no rule could reach, and moves all of them (#935, #1272)', () => {
    // The regression half. `OLD` is the leading strip exactly as it stood
    // before #1272 — "everything that is not `[A-Za-z]`" — so what follows is a
    // real before/after measurement of the change, not a restatement of the new
    // rule against itself.
    //
    // #935 wrote this as `moved` must be EMPTY: tolerating a trailing `[#id]`
    // is a no-op on pages that write none. #1272 changes the leading strip on
    // purpose, so eight labels do move, and "nothing moves" is no longer true
    // of ANY fix to that card — option 3 (return the original heading when the
    // strip empties the label) moves exactly the same eight. So the shape had
    // to change; what replaced it is not weaker. Instead of forbidding every
    // move it enumerates the ones allowed, which makes a ninth heading moving,
    // a move that stops short of a real label, and a move that lands where a
    // rule looks, all red. #935's own property is pinned by the two tests
    // above, which are untouched.
    const OLD = (h: string): string => h.replace(/^[^A-Za-z]+/, '').trim();
    const collapsed = PAGE_HEADINGS.filter((h) => OLD(h) === '');

    expect(PAGE_HEADINGS.length, 'no `## ` headings read — this check is vacuous').toBeGreaterThan(0);
    // Vacuity guard. Every clause below is about headings the old strip
    // emptied; if the pages stop shipping a CJK-only heading, three assertions
    // over an empty list would read as a pass while measuring nothing.
    expect(
      collapsed.length,
      'no heading here is one the old `/^[^A-Za-z]+/` strip emptied — the zh pages no ' +
        'longer carry a CJK-only `## ` heading, so this whole check is measuring nothing',
    ).toBeGreaterThan(0);

    // (a) THE PREMISE #1272's ruling rests on. A label that was non-empty was a
    //     label a rule could already match, so it must come through unchanged
    //     to the byte. Swept over the three pages before landing this: 27
    //     headings, 8 moved, 0 of them with a non-empty old label.
    const reachable = PAGE_HEADINGS.filter((h) => OLD(h) !== '' && headingLabel(h) !== OLD(h)).map(
      (h) => `"${h}" → "${headingLabel(h)}" (was "${OLD(h)}")`,
    );
    expect(
      reachable,
      `a label a rule can already match moved:\n  ${reachable.join('\n  ')}\n` +
        'The leading strip may only change what it does to headings the old rule left ' +
        'unmatchable. Moving a reachable label re-points `sectionsOf(...).find(...)` at a ' +
        'different section, which is the defect this helper keeps being fixed for.',
    ).toEqual([]);

    // (b) …and every heading the old strip emptied now carries its own visible
    //     text. This is the red leg: on the old helper all eight are still `""`.
    const stillEmpty = collapsed.filter((h) => headingLabel(h) === '');
    expect(
      stillEmpty,
      `headings that still resolve to the empty string:\n  ${stillEmpty.join('\n  ')}\n` +
        'A heading with no Latin letters is an ordinary heading — `## 提示` is the label ' +
        '`提示`. Leaving it as `""` is what let four different sections on each zh page ' +
        'share one label (#1272).',
    ).toEqual([]);

    // (c) and none of the freed labels lands on a label a rule looks for, which
    //     is (a) from the other side: no rule gains a match it did not have.
    const labels = new Set(dashboards.map((d) => String(d.label)));
    const collided = collapsed.filter((h) => labels.has(headingLabel(h)));
    expect(
      collided,
      `a heading the old strip left unmatchable now matches a registered dashboard:\n  ${collided.join('\n  ')}\n` +
        'That silently hands a per-dashboard rule a second candidate section, and `.find()` ' +
        'takes the first — so the rule would start checking tile bullets it never read before.',
    ).toEqual([]);
  });

  it('no two `## ` headings on one page resolve to the same label (#1272)', () => {
    // Option 1 of #1272, landed on top of option 2 rather than instead of it:
    // this is red today on the zh pages without the strip fix above, which is
    // why the card refused it on its own.
    //
    // It is what turns the collapse from "unreachable, because every dashboard
    // `label` happens to be English" into an enforced invariant. Both consumers
    // in `docs-dashboard-tiles.test.ts` key on label equality — one builds
    // `new Set(...map(headingLabel))` where duplicates silently dedupe, the
    // other does `.find(s => headingLabel(s.heading) === d.label)` and takes the
    // first hit — so two headings sharing a label is a rule reading the wrong
    // section and reporting clean about one it never opened.
    //
    // Scoped to the three pages `headingLabel()` is actually applied to. The
    // sweep run for #1272 measured the wider tree too — 206 pages under
    // `content/docs`, `src/docs` and `README.md`, 124 of them carrying a
    // duplicate label before this change (worst: 16 headings on one label) and
    // 0 after — so widening this later is cheap. It stays narrow because a
    // collision on a page no rule reads is not a defect, and a gate that goes
    // red where nothing is broken is one nobody can act on.
    const collisions: string[] = [];
    for (const { file, headings } of PAGES) {
      const byLabel = new Map<string, string[]>();
      for (const h of headings) byLabel.set(headingLabel(h), [...(byLabel.get(headingLabel(h)) ?? []), h]);
      for (const [label, hs] of byLabel) {
        if (hs.length > 1) collisions.push(`${file}: "${label}" ← ${hs.map((h) => `"${h}"`).join(', ')}`);
      }
    }
    expect(PAGES.every((p) => p.headings.length > 0), 'a page contributed no `## ` headings').toBe(true);
    expect(
      collisions,
      `two headings on one page resolve to the same label:\n  ${collisions.join('\n  ')}\n` +
        'A guard that keys on label equality cannot tell those sections apart: the coverage ' +
        "test's `Set` dedupes them and the per-dashboard rule's `.find()` takes whichever " +
        'comes first. Give the sections labels that differ, or teach `headingLabel()` to ' +
        'keep what makes them different.',
    ).toEqual([]);
  });
});

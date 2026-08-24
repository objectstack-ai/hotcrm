// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import { headingLabel } from './helpers/heading-label';
import stack from '../objectstack.config';

/**
 * `headingLabel()` reduces a docs heading to the label a drift guard compares
 * against metadata. `test/docs-drift.test.ts` runs every dashboards-page rule
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

  const PAGE_HEADINGS = DOC_PAGES.flatMap((file) =>
    headingsOf(readFileSync(join(REPO_ROOT, file), 'utf8')),
  );

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
    // coverage itself is `docs-drift.test.ts`'s job, not this file's; here it
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

  it('leaves every heading the docs already ship unchanged (#935)', () => {
    // The regression half: this change is only safe if it is a no-op on the
    // pages as they stand. Nothing under `content/docs` writes a `##` heading
    // with an explicit id today, so every label here must be exactly what the
    // old leading-strip produced.
    const OLD = (h: string): string => h.replace(/^[^A-Za-z]+/, '').trim();
    const moved = PAGE_HEADINGS.filter((h) => headingLabel(h) !== OLD(h)).map(
      (h) => `"${h}" → "${headingLabel(h)}" (was "${OLD(h)}")`,
    );
    expect(PAGE_HEADINGS.length, 'no `## ` headings read — this check is vacuous').toBeGreaterThan(0);
    expect(
      moved,
      `tolerating explicit ids changed a label on a page that has none:\n  ${moved.join('\n  ')}`,
    ).toEqual([]);
  });
});

// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';

/*
 * Locale parity for docs callouts — the `> …` box a translation dropped.
 *
 * Split out of `test/docs-drift.test.ts` whole (#1196); see the SPLIT BY
 * FAMILY table there for the other families.
 */

/**
 * Translated pages keep every callout the English page has (#736).
 *
 * A callout — `> **Always scope a roll-up to one period.** …` — is where a docs
 * page puts the thing that bites: the trap someone already fell into, written
 * up so the next reader does not. `content/docs/sales/forecasting.mdx` gained
 * exactly such a box after #614 (a roll-up that added a quarter's quota to a
 * month's), and neither zh page ever grew a counterpart. The whole warning was
 * missing for the half of this product's audience that reads those pages, and
 * nothing noticed for four releases: `docs-object-coverage.test.ts` checks that
 * a translated page EXISTS and is navigable, deliberately holding the zh pages
 * to nothing about their contents (see its "Locale asymmetry" note), and the
 * dashboards rules — `docs-dashboard-tiles.test.ts` since #1196 — key on tile
 * lists this page does not have.
 *
 * So this is the locale check that was missing, in the one shape that is honest
 * across languages: a blockquote is STRUCTURE, not vocabulary. Counting them
 * says nothing about how the warning is worded, only that the translation still
 * has one — which is the defect that actually shipped (a whole box dropped),
 * not a wording drift.
 *
 * ## Blocks, not lines — the measurement that changed the design
 *
 * Counting `^> ` LINES reports 7 English pages as drifted, and all but
 * forecasting are false positives: CJK text wraps at different widths, so a
 * three-line English callout is a two-line Chinese one. `sharing-and-security`
 * "loses" 14 of 17 callouts that way while having every single one. Counting
 * consecutive-`>` RUNS instead — one count per box — leaves exactly two
 * mismatches in the whole tree, and both are the real defect. A guard whose
 * metric is noisy gets muted; this one is quiet enough to be believed.
 *
 * ## Equality, not "at least as many"
 *
 * An extra callout in a translation is also worth a look: it means a translator
 * added a warning the English page does not give, so one of the two audiences
 * is being told something the other is not. Empirically the right invariant —
 * 130 of 132 locale pages already satisfied equality before #736.
 *
 * ## Reverse verification (#736)
 *
 * Predicted direction: **red before the content fix, green after**. Measured on
 * the pre-fix tree: 2 mismatches out of 132 locale pages, both
 * `sales/forecasting.zh-Han*.mdx` at `1 vs 0` — the missing #614 box, and
 * nothing else. After the retranslation: 0. The rule is not vacuous either —
 * 18 English pages carry at least one callout, so it is comparing real boxes,
 * not zeros against zeros.
 */
describe('translated docs pages keep the English page callouts', () => {
  const LOCALE_SUFFIXES = ['.zh-Hans', '.zh-Hant'] as const;

  /** Depth-first walk of `content/docs`, REPO_ROOT-relative (see note above). */
  const walkDocs = (dir: string): string[] => {
    const root = join(REPO_ROOT, dir);
    if (!existsSync(root)) return [];
    return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
      const rel = join(dir, entry.name);
      return entry.isDirectory() ? walkDocs(rel) : rel.endsWith('.mdx') ? [rel] : [];
    });
  };

  /**
   * Number of blockquote BLOCKS: each run of consecutive `>` lines counts once,
   * however many lines it wraps to. That is the whole point — see the header.
   */
  const calloutCount = (text: string): number => {
    let count = 0;
    let inside = false;
    for (const line of text.split('\n')) {
      const quoted = /^>/.test(line);
      if (quoted && !inside) count += 1;
      inside = quoted;
    }
    return count;
  };

  const ENGLISH_PAGES = walkDocs('content/docs').filter(
    (f) => !LOCALE_SUFFIXES.some((l) => f.endsWith(`${l}.mdx`)),
  );

  /** English page → the translations that exist for it. */
  const PAIRS = ENGLISH_PAGES.flatMap((en) =>
    LOCALE_SUFFIXES.map((locale) => ({
      en,
      translated: en.replace(/\.mdx$/, `${locale}.mdx`),
    })).filter((p) => existsSync(join(REPO_ROOT, p.translated))),
  );

  it('finds real page pairs, and real callouts to compare', () => {
    // Vacuity guard, both halves. A walk that returned nothing would pass the
    // parity test by asserting nothing; so would a tree where no English page
    // has a callout at all, since every comparison would be 0 === 0.
    expect(
      PAIRS.length,
      'no English/translated page pairs found under content/docs — this guard has gone vacuous',
    ).toBeGreaterThan(50);
    const withCallouts = ENGLISH_PAGES.filter(
      (f) => calloutCount(readFileSync(join(REPO_ROOT, f), 'utf8')) > 0,
    );
    expect(
      withCallouts.length,
      'no English docs page carries a `> …` callout — this guard is comparing zeros. ' +
        'If callouts genuinely left the docs, delete this check rather than leaving it green over nothing.',
    ).toBeGreaterThan(5);
  });

  it('every translated page has the same number of callouts as its English page', () => {
    const drifted = PAIRS.map(({ en, translated }) => {
      const enCount = calloutCount(readFileSync(join(REPO_ROOT, en), 'utf8'));
      const zhCount = calloutCount(readFileSync(join(REPO_ROOT, translated), 'utf8'));
      return enCount === zhCount ? null : `${translated}: ${zhCount} callout(s), but ${en} has ${enCount}`;
    }).filter((x): x is string => x !== null);

    expect(
      drifted,
      `translated pages whose callouts do not match the English page:\n  ${drifted.join('\n  ')}\n` +
        'A `> …` box is where a page puts the trap someone already fell into. Translate the ' +
        'missing one (or, if the translation added a box the English page lacks, decide which ' +
        'audience is right and make both pages agree) — do not delete the English callout to ' +
        'get green.',
    ).toEqual([]);
  });
});

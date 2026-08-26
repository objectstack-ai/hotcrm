// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * The README headline figures are the gate's, within the ruled buffer (#1187).
 *
 * The README banner states HotCRM's positioning claim as two measured numbers:
 * business semantics ~81k tokens, interaction layer ~39k. That claim is the
 * first thing a reader sees and the reason a developer keeps reading, and for
 * months nothing checked it — the banner said "~170k tokens (~18,000 lines)", a
 * hand measurement of a tree that had since moved, and no test, gate or reviewer
 * could have noticed. #1183 built the measurement
 * (`scripts/check-source-token-ratchet.mjs`); this file wires the README to it,
 * so the next drift fails CI instead of surviving to the next audit.
 *
 * ## Why this is a sibling of `docs-drift.test.ts` and not a block inside it
 *
 * This rule belongs to that file's "a doc states a number that must match the
 * source of truth" family — the #729 count rule is its closest relative and the
 * model for how it reads its expectations; that rule is
 * `test/docs-metadata-counts.test.ts` since #1196. It shipped as its own file
 * because `docs-drift.test.ts` was 100,190 bytes against the 102,400-byte
 * ceiling in `scripts/check-source-hygiene.mjs`: appending this block put it at
 * 107KB and turned the hygiene gate red. #1196 has since split that file along
 * its family seams, so the ceiling is no longer what keeps this rule out of it —
 * the subject is. A dedicated `test/docs-*.test.ts` per docs rule family is this
 * repo's standing shape, so this follows the convention rather than inventing
 * one.
 *
 * ## Why a tolerance, and why exactly 5%
 *
 * A rule demanding the banner equal today's rounded reading would re-create the
 * defect one decimal place down: the measurement moved 80,411 → 80,356 → 81,233
 * → 80,767 in a single working day as four ordinary PRs landed, and the rounded
 * headline crossed the ~80k/~81k boundary twice. A README PR per rounding step
 * is not a guard, it is a tax — and the first person to pay it twice deletes the
 * guard.
 *
 * So the banner is held to the maintainer's already-ruled working buffer rather
 * than to a fresh number invented here: 「给 5% 缓冲」 (2026-08-17), the same 5%
 * the ratchet's ceilings carry via its `anchor()`. Reusing it is the point — the
 * README figure and the ratchet ceiling then go stale at nearly the same
 * reading, so re-stating the claim is a maintainer-ruling moment, not a chore.
 * Against today's committed ceilings:
 *
 *   business semantics  banner ~81k -> band 76,950–85,050 · ceiling 85,000
 *   interaction layer   banner ~39k -> band 37,050–40,950 · ceiling 42,000
 *
 * On business semantics the band's upper edge sits just past the ceiling, so the
 * ratchet fails first and the banner cannot be lying while CI is green. On the
 * interaction layer the ceiling's round-up-to-1k left it 7.5% of headroom rather
 * than 5%, so this rule is the tighter of the two and fires ~1k early. Early is
 * the safe direction for a doc guard; late is the one that cost #1187.
 *
 * ## The measurement is the gate's, not a copy of it
 *
 * The expected values are read by RUNNING the gate in `--json` mode — the same
 * command CI runs — and are deliberately NOT written down here, for the reason
 * the #729 count rule gives: a hard-coded expectation is the same
 * hand-maintained number moved into the test file, stale on the very next merge.
 * It also keeps the layer definitions in exactly one place; if a new metadata
 * directory joins `business semantics`, this rule follows without being told.
 *
 * ## Reverse verification
 *
 * Predicted red-before / green-after, and measured both ways. Restoring the
 * pre-fix banner ("~170k tokens (~18,000 lines)") turns three of the five
 * assertions red, the vacuity guard reporting `0 match(es)` for both layers —
 * i.e. this rule would have caught the drift that opened #1187. Hand-corrupting
 * the interaction figure to ~41k — inside the ratchet ceiling but outside the
 * band — reddens the tolerance assertion alone, exactly as predicted:
 * `interaction layer: banner says ~41k, the gate measures 38,848
 * (band 38,950–43,050)`. Captured output is in the PR body.
 */
describe('the README headline figures match the token gate (#1187)', () => {
  const GATE = 'scripts/check-source-token-ratchet.mjs';

  /** The ruled working buffer, 「给 5% 缓冲」 — the ratchet's own, reused. */
  const TOLERANCE = 0.05;

  type Scope = { label: string; tokens: number; ceiling: number | null };

  /** Today's reading, straight from the gate CI runs. Never hard-coded here. */
  const measured: Record<string, Scope> = (() => {
    // `stdio` pinned so the child's stderr is CAPTURED, not echoed into the
    // parent's log (#1302). See test/verify-log-decoy-pin.test.ts for why.
    const stdout = execFileSync(process.execPath, [join(REPO_ROOT, GATE), '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const parsed = JSON.parse(stdout) as { scopes: Scope[] };
    return Object.fromEntries(parsed.scopes.map((scope) => [scope.label, scope]));
  })();

  const readme = readFileSync(join(REPO_ROOT, 'README.md'), 'utf8');

  /**
   * The banner wraps mid-sentence inside a `>` blockquote, so the claims are
   * matched against the unwrapped text rather than line by line — a rule that
   * only read single lines would go quietly vacuous the first time someone
   * reflowed the paragraph.
   */
  const bannerText = readme
    .split('\n')
    .filter((line) => line.startsWith('>'))
    .map((line) => line.replace(/^>\s?/, ''))
    .join(' ')
    .replace(/\s+/g, ' ');

  /**
   * One pattern per claim, each anchored on the layer's own name so a failure
   * names the sentence it read. The labels are the gate's — asserted below — so
   * renaming a layer there cannot leave this rule matching prose that no longer
   * describes the same thing.
   */
  const CLAIMS: { label: string; re: RegExp }[] = [
    {
      label: 'business semantics',
      re: /business semantics \([^)]*\) in \*\*~([\d.]+)k tokens\*\*/g,
    },
    {
      label: 'interaction layer',
      re: /interaction layer \([^)]*\) in another \*\*~([\d.]+)k\*\*/g,
    },
  ];

  const stated = (claim: { re: RegExp }): number[] =>
    [...bannerText.matchAll(claim.re)].map((m) => Math.round(parseFloat(m[1]) * 1000));

  it('states exactly one figure for each layer the gate reports', () => {
    // Vacuity guard: every assertion below is trivially true against a banner
    // this rule cannot parse, which is precisely the state the pre-fix README
    // was in. An unmatched claim is a failure, not a skip.
    const unstated = CLAIMS.filter((c) => stated(c).length !== 1).map(
      (c) => `${c.label}: ${stated(c).length} match(es) for ${c.re.source}`,
    );
    expect(
      unstated,
      `the README banner no longer states one figure per headline layer:\n  ${unstated.join('\n  ')}\n` +
        'Either the banner was reworded — teach the pattern its new shape — or the claim was ' +
        'dropped, which is a product decision to make deliberately rather than by reflow.',
    ).toEqual([]);
  });

  it('names layers the gate actually measures, and cites the gate', () => {
    const unknown = CLAIMS.map((c) => c.label).filter((label) => !(label in measured));
    expect(
      unknown,
      `the README describes layer(s) the gate does not report: ${unknown.join(', ')} ` +
        `(the gate reports: ${Object.keys(measured).join(', ')}).`,
    ).toEqual([]);

    expect(
      existsSync(join(REPO_ROOT, GATE)),
      `${GATE} is gone, and the README tells readers to run it.`,
    ).toBe(true);
    expect(
      readme,
      'the README states measured figures without naming the command that measures them — ' +
        'a number a reader cannot re-derive is the hand measurement this rule exists to retire.',
    ).toContain(GATE);
  });

  it('states the accounting basis the ruling set', () => {
    // 「translations + seed 肯定是不需要算 token 的」 — the gate excludes both, and
    // a banner quoting the gate's number while implying it covers the whole tree
    // is a different claim from the one that was ruled.
    expect(
      bannerText,
      'the banner does not say translations and seed data are outside the count, so a reader ' +
        'comparing ~81k against the size of src/ is told a number for a surface they cannot see.',
    ).toMatch(/translations and seed data are outside/);
  });

  it('is within the ruled 5% buffer of what the gate measures today', () => {
    const drifted = CLAIMS.flatMap((claim) => {
      const [banner] = stated(claim);
      if (banner === undefined) return []; // reported by the vacuity guard above
      const tokens = measured[claim.label]?.tokens;
      if (tokens === undefined) return []; // reported by the label guard above
      const slack = banner * TOLERANCE;
      const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
      return Math.abs(tokens - banner) <= slack
        ? []
        : [
            `${claim.label}: banner says ~${banner / 1000}k, the gate measures ${fmt(tokens)} ` +
              `(band ${fmt(banner - slack)}–${fmt(banner + slack)})`,
          ];
    });
    expect(
      drifted,
      `the README's headline claim has drifted from the measurement:\n  ${drifted.join('\n  ')}\n` +
        `Re-run \`node ${GATE}\` and publish the figure it prints on its Headline line. This band ` +
        'is the maintainer-ruled 5% working buffer, so crossing it is real movement in the app’s ' +
        'positioning claim rather than routine churn — worth a sentence in the PR that moves it.',
    ).toEqual([]);
  });

  it('never claims a figure the ratchet would already reject', () => {
    // A banner above the committed ceiling would advertise a surface CI is
    // configured to fail on — the two would be describing different apps.
    const impossible = CLAIMS.flatMap((claim) => {
      const [banner] = stated(claim);
      const ceiling = measured[claim.label]?.ceiling;
      if (banner === undefined || ceiling == null) return [];
      return banner <= ceiling
        ? []
        : [
            `${claim.label}: banner ~${banner / 1000}k is above the ratchet ceiling ` +
              `${ceiling.toLocaleString('en-US')}`,
          ];
    });
    expect(
      impossible,
      `the README claims more than the ratchet permits:\n  ${impossible.join('\n  ')}\n` +
        'Raising a ceiling takes a maintainer ruling quoted in the raising PR; the banner cannot ' +
        'get there first.',
    ).toEqual([]);
  });
});

// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BUFFER, CEILINGS } from '../scripts/check-source-token-ratchet.mjs';
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
 *   interaction layer   banner ~39k -> band 37,050–40,950 · ceiling 40,000
 *
 * On both layers the band's upper edge sits past the committed ceiling, so on
 * growth the ratchet fails first and the banner cannot be advertising a surface
 * CI is already configured to reject. Shrinkage is the direction this rule owns
 * alone: a banner left behind by a shrinking tree breaks no ceiling, and only
 * the band's lower edge objects. Early is the safe direction for a doc guard;
 * late is the one that cost #1187.
 *
 * ⚠️ That paragraph read the other way round until #1320 re-anchored the
 * interaction ceiling 42,000 -> 40,000. The table above went on saying 42,000,
 * and the paragraph went on arguing from it that this rule was the tighter of
 * the two — false from the moment the constant moved, and noticed by nobody,
 * because it was the one figure-bearing artefact in this family with no
 * producer-side pin. That is what the last `describe` below is: every field of
 * both rows read back off the README banner, the imported `BUFFER` and the
 * committed `CEILINGS`, so the next re-anchoring reddens this file instead of
 * quietly falsifying it (#1335).
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

  /**
   * The ruled working buffer, 「给 5% 缓冲」 — the ratchet's own, imported.
   *
   * It said "reused" while being a hand copy (#1335). A literal that claims a
   * wiring it does not have is worse than a bare literal: the reader who checks
   * the comment stops looking, so the copy survives every review that was
   * looking for exactly this. `BUFFER` has been exported since #1334; the value
   * is unchanged and now has one home.
   */
  const TOLERANCE = BUFFER;

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
  /**
   * The docstring's band table is derived from the producers, not transcribed
   * beside them (#1335).
   *
   * Every other figure in this file is read from the gate at run time. That
   * table was the exception: two rows restating the banner, the buffer and both
   * ceilings, checked by nothing — and it had already rotted. #1320 re-anchored
   * the interaction ceiling to 40,000, the row went on saying 42,000, and the
   * paragraph under it went on reasoning from the stale number. Nothing could
   * have caught that, which is the point: a restated figure whose producer is
   * one import away is not a smaller version of the #1187 defect, it is the
   * same one, in the file written to retire it.
   *
   * So each field is asserted against where it comes from — the banner figure
   * against the README (the same `CLAIMS` patterns the cases above read), the
   * band edges against the imported `BUFFER`, the ceiling against `CEILINGS` —
   * and the paragraph's own claim, that the ratchet goes red before the band
   * does, against the two together. None of it is calibrated against today's
   * constants, so a re-anchoring moves the constant and the row follows it or
   * fails; the table cannot be quietly wrong again.
   *
   * ⚠️ When the table's SHAPE changes, teach `BAND_ROW` the new shape — ⛔ never
   * relax it to get a run green, and never drop a row: a restated figure with
   * no worked row is the state this block exists to end. A reflow that stops
   * the rows parsing is a failure of the first case, not a silent skip.
   *
   * ⚠️ Unlike the gate's header pin (`test/source-token-ratchet.test.ts`), this
   * one reads its OWN file, so no sample row is written out in these comments —
   * a pasted example would parse as a third row and assert against a layer the
   * banner never claimed.
   */
  describe('the docstring band table is derived from the ceilings, not transcribed beside them', () => {
    const SELF = 'test/docs-readme-token-figures.test.ts';
    const source = () => readFileSync(join(REPO_ROOT, SELF), 'utf8');
    const num = (figure: string) => Number(figure.replace(/,/g, ''));
    const fmt = (n: number) => n.toLocaleString('en-US');

    /**
     * One worked row of the band table in the file docstring above: the layer,
     * the banner figure it quotes, both band edges, and the committed ceiling.
     * Column widths are free — the rows are hand-aligned and realigning them
     * must not be a test failure — but every field is captured, so a row that
     * quietly loses one stops parsing instead of passing.
     */
    const BAND_ROW =
      / \* {2,}(?<label>\S.*?\S) {2,}banner ~(?<banner>[\d.]+)k -> band (?<low>[\d,]+)–(?<high>[\d,]+) · ceiling (?<ceiling>[\d,]+)\s*$/;

    interface Row {
      label: string;
      banner: number;
      low: number;
      high: number;
      ceiling: number;
      line: string;
    }

    const rows = (): Row[] =>
      source()
        .split('\n')
        .flatMap((line) => {
          const found = BAND_ROW.exec(line);
          if (!found?.groups) return [];
          const g = found.groups;
          return [
            {
              label: g.label,
              banner: Math.round(parseFloat(g.banner) * 1000),
              low: num(g.low),
              high: num(g.high),
              ceiling: num(g.ceiling),
              line: line.trim(),
            },
          ];
        });

    const where = (row: Row) => `${SELF} docstring row:\n  ${row.line}\n`;

    it('carries one worked row per headline layer, in the order the banner states them', () => {
      // A failure here means the table did not parse, not that a figure is
      // wrong — every case below is trivially true against a table this regex
      // cannot read, which is the vacuity the rest of this file already guards
      // against for the README. Teach BAND_ROW the new shape; never drop a row.
      expect(
        rows().map((row) => row.label),
        `the band table in ${SELF}'s docstring no longer states one worked row per headline ` +
          'layer. Either the table was reformatted — teach BAND_ROW its new shape — or a row ' +
          'was dropped, which leaves a ceiling restated in prose with nothing checking it.',
      ).toEqual(CLAIMS.map((claim) => claim.label));
    });

    it('quotes the banner figure the README actually states', () => {
      for (const row of rows()) {
        const claim = CLAIMS.find((c) => c.label === row.label);
        const [banner] = claim ? stated(claim) : [];
        expect(
          banner,
          `${where(row)}the row works from a banner figure the README does not state ` +
            `(the README says ~${banner === undefined ? 'nothing' : `${banner / 1000}k`}).`,
        ).toBe(row.banner);
      }
    });

    it('derives both band edges from the imported buffer', () => {
      for (const row of rows()) {
        // The same arithmetic the tolerance case above runs, so the table
        // cannot describe a band this file does not actually enforce.
        expect(row.low, `${where(row)}the lower band edge is not banner - ${BUFFER * 100}%.`).toBe(
          Math.round(row.banner * (1 - BUFFER)),
        );
        expect(row.high, `${where(row)}the upper band edge is not banner + ${BUFFER * 100}%.`).toBe(
          Math.round(row.banner * (1 + BUFFER)),
        );
      }
    });

    it('quotes the committed ceiling rather than a copy of it', () => {
      for (const row of rows()) {
        const committed = CEILINGS.get(row.label);
        expect(
          committed,
          `${where(row)}'${row.label}' is not a committed ceiling — the gate's CEILINGS keys ` +
            'moved, so this row describes a layer the ratchet does not ceiling.',
        ).toBeTypeOf('number');
        expect(
          row.ceiling,
          `${where(row)}the row restates a ceiling the gate no longer commits (it commits ` +
            `${committed === undefined ? 'none' : fmt(committed)}). This is the #1320 rot, ` +
            'recurring: correct the row rather than the constant.',
        ).toBe(committed);
      }
    });

    it('still supports the claim the paragraph draws from it', () => {
      // The prose argues that on growth the ratchet fails before this rule
      // does, on BOTH layers. That is a relation between two constants, so it
      // is pinned as one — it was true of one layer only before #1320, and read
      // as true of both for the eleven days after.
      //
      // Deliberately read against the ROW's ceiling rather than the committed
      // one: the case above already ties the row to `CEILINGS`, so a moved
      // constant reddens exactly one case with an exact message, and this one
      // fires next — when the row has been corrected and the paragraph over it
      // has not. One cause, one red, in the order a maintainer fixes them.
      for (const row of rows()) {
        expect(
          row.high,
          `${where(row)}the docstring argues the ratchet fails first on growth, but this ` +
            `layer's band now closes at ${fmt(row.high)}, at or below the committed ceiling ` +
            `${fmt(row.ceiling)} — so this rule fires first and the paragraph above needs ` +
            'rewriting, not relaxing.',
        ).toBeGreaterThan(row.ceiling);
      }
    });
  });
});

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
 * the ratchet's ceilings carry via its `anchor()`. Reusing it keeps one buffer
 * in this repo rather than two that drift apart.
 *
 * ## What this rule is FOR, since #1601: honesty, not a budget
 *
 * Maintainer ruling, 2026-09-05 (verbatim, kept untranslated):
 *
 *   「解耦:banner 钉实测,ceiling 独立」
 *
 * The banner is pinned to the MEASURED reading; the ceiling stands on its own.
 * So this rule caps nothing. Its whole job is that the README may not advertise
 * a size the app does not have — the ratchet owns the growth budget, alone, and
 * a raise there sits on the maintainer floor where it always did.
 *
 *   business semantics  banner ~85k -> band 80,750–89,250 · ceiling 100,000
 *   interaction layer   banner ~37k -> band 35,150–38,850 · ceiling 40,000
 *
 * ⚠️ The ceiling column is still worked out per row, and still pinned to
 * `CEILINGS` below — that is what stops the README quoting a ceiling the gate no
 * longer commits. What it is NOT any more is an input to this rule. Until #1601
 * the paragraph here compared each band's upper edge against its ceiling and
 * argued from the result that the ratchet failed first on growth; that
 * comparison was the coupling, and it is gone. Which of the two reddens first on
 * growth is deliberately no longer a fact this file reasons from, because the
 * two reds are not paid in the same currency: this one is cleared by restating
 * the banner, which any PR may do, and the ratchet's only by shrinking the layer
 * or by another ruling.
 *
 * Shrinkage is the direction this rule owns alone: a banner left behind by a
 * shrinking tree breaks no ceiling, and only the band's lower edge objects.
 * Early is the safe direction for a doc guard; late is the one that cost #1187.
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

    it('works from a band that actually holds the measured reading', () => {
      // The relation the paragraph draws from the table, re-aimed by the #1601
      // ruling 「解耦:banner 钉实测,ceiling 独立」. It used to compare the band's
      // upper edge against the ceiling and argue that the ratchet failed first;
      // that comparison WAS the coupling the ruling removed, so it is not
      // inverted here, it is replaced. What the rows must support now is the
      // truthfulness claim: the band each row prints is one today's reading
      // actually falls inside.
      //
      // Read against the ROW's own edges rather than recomputed from the
      // README: the two cases above already tie the row to the banner and to
      // `BUFFER`, so a moved figure reddens exactly one of them with an exact
      // message and this one fires next — when the rows are self-consistent and
      // the tree has moved out from under them anyway. One cause, one red, in
      // the order a maintainer fixes them. The edges read here are also the
      // ROUNDED, published ones, so what is checked is the band as a reader
      // reads it rather than the unrounded band the tolerance case computes.
      for (const row of rows()) {
        const tokens = measured[row.label]?.tokens;
        expect(
          tokens,
          `${where(row)}the gate reports no reading for '${row.label}', so this row's band is ` +
            'checked against nothing. Vacuity, not a pass.',
        ).toBeTypeOf('number');
        expect(
          tokens,
          `${where(row)}the gate measures ${tokens === undefined ? 'nothing' : fmt(tokens)}, ` +
            `below the band this row publishes (${fmt(row.low)}–${fmt(row.high)}). The banner ` +
            'is advertising a bigger surface than the app has: restate it from the gate and ' +
            'correct this row.',
        ).toBeGreaterThanOrEqual(row.low);
        expect(
          tokens,
          `${where(row)}the gate measures ${tokens === undefined ? 'nothing' : fmt(tokens)}, ` +
            `above the band this row publishes (${fmt(row.low)}–${fmt(row.high)}). The banner ` +
            'understates the surface: restate it from the gate and correct this row. This is ' +
            'not a ceiling — the ratchet owns growth, and it has its own verdict on it.',
        ).toBeLessThanOrEqual(row.high);
      }
    });
  });
});

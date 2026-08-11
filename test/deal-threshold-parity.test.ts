// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import stack from '../objectstack.config';
import { REPO_ROOT } from './helpers/repo-root';
import { HIGH_VALUE_DEAL_AMOUNT, LARGE_DEAL_AMOUNT } from '../src/objects/_thresholds';

/**
 * ═══ HOUSE RULE: there is exactly ONE definition of a "large deal" ═════════
 *
 * Before #599 the question "how big is a large deal?" was answered by four
 * independent numeric literals in three files — the approval entry gate, the
 * won-deal alert, and two sharing rules — plus a second tier stated twice in
 * complementary polarity for the director step. Nothing joined them, so a
 * deployment that raised the bar in one place shipped a product where a deal is
 * large enough for the director to SEE and not large enough to APPROVE.
 *
 * `src/objects/_thresholds.ts` is now the only place the numbers are written,
 * and every consumer interpolates it. That is a claim about the repo, not about
 * a function, and it is exactly the kind of claim that decays quietly: each
 * consumer keeps working when it falls out of step, it just stops answering the
 * same question. So this file reads the numbers back out of the SHIPPED
 * metadata — the compiled CEL of every flow condition and sharing rule — and
 * fails if any site stops agreeing.
 *
 * The companion guard is `test/docs-drift.test.ts`, which pins the published
 * prose in `src/docs/*.md` to the same compiled conditions.
 *
 * ### ⚠️ Scope, stated honestly: the VALUE is converged, the OPERATORS are not
 *
 * Two sites cut at `> LARGE_DEAL_AMOUNT` (approval entry, won alert) and two at
 * `>= LARGE_DEAL_AMOUNT` (both sharing rules). #599's ruling scoped this card to
 * the constant, and closing that boundary is a product decision — does a deal at
 * exactly $100,000.00 need manager approval? — not a refactor. So the
 * disagreement is not papered over here: it is asserted, with the population it
 * affects named, so that it is a recorded fact rather than a silent one. When
 * the product question is answered, the `BOUNDARY` block below is what changes.
 */

type AnyRec = Record<string, any>;

/** `P` compiles to `{ dialect: 'cel', source }`; older conditions may be raw strings. */
const celSource = (condition: unknown): string =>
  typeof condition === 'string' ? condition : String((condition as AnyRec)?.source ?? '');

const flows: AnyRec[] = ((stack as AnyRec).flows ?? []) as AnyRec[];
const sharing: AnyRec[] = ((stack as AnyRec).sharingRules ??
  (stack as AnyRec).sharing ??
  []) as AnyRec[];

const flowNamed = (name: string): AnyRec | undefined => flows.find((f) => f?.name === name);

/**
 * Source text with comments blanked out, line count preserved.
 *
 * Both source sweeps below are about what the app EXECUTES. Prose is not only
 * allowed to quote the old literals, it should: the totality notes in both
 * flows explain why `record.amount > 100000` aborts on a null, and
 * `_thresholds.ts` records the whole four-way history. A sweep that could not
 * tell code from commentary would force those explanations to be deleted,
 * which trades a real drift guard for a worse-documented repo.
 *
 * Line numbers survive so an offender can be reported at its real line.
 */
const stripComments = (text: string): string =>
  text
    // Block comments — replaced with their own newlines so lines stay aligned.
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    // Line comments.
    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length));

/** Every CEL condition a flow ships — start-node configs and edges alike. */
const conditionsOf = (flowName: string): string[] => {
  const flow = flowNamed(flowName);
  expect(flow, `no flow named "${flowName}" in the compiled stack`).toBeTruthy();
  return [
    ...(((flow?.nodes ?? []) as AnyRec[]).map((n) => celSource(n?.config?.condition))),
    ...(((flow?.edges ?? []) as AnyRec[]).map((e) => celSource(e?.condition))),
  ].filter(Boolean);
};

/**
 * Every ORDERING comparison against `amount` in a CEL string.
 *
 * `!= null` / `== null` totality guards are deliberately not matched — they are
 * guards, not cuts. The scope prefix is captured too (`record` vs `oppRecord`),
 * because that is what separates the entry gate from the director tier, and the
 * match is case-sensitive so `record` cannot be found inside `oppRecord`.
 */
const amountCuts = (
  source: string,
): Array<{ scope: string; op: string; value: number }> =>
  [...source.matchAll(/(\w+)\.amount\s*(>=|<=|>|<)\s*(-?\d+)/g)].map((m) => ({
    scope: m[1],
    op: m[2],
    value: Number(m[3]),
  }));

/**
 * Every site that states a large-deal cut, and what it is for.
 *
 * A site whose condition cannot be found is a FAILURE, not a skip — a parity
 * file that quietly stops looking at one of the four is worse than none.
 */
const LARGE_DEAL_SITES = [
  {
    label: 'approval entry gate (afterUpdate)',
    scope: 'record',
    source: () => conditionsOf('opportunity_approval')[0],
  },
  {
    label: 'approval entry gate (afterInsert twin)',
    scope: 'record',
    source: () => conditionsOf('opportunity_approval_on_create')[0],
  },
  {
    label: 'won-deal alert',
    scope: 'record',
    source: () => conditionsOf('opportunity_won_alert')[0],
  },
  {
    label: 'sharing: sales director',
    scope: 'record',
    source: () => celSource(sharing.find((r) => r?.name === 'opportunity_sales_sharing')?.condition),
  },
  {
    label: 'sharing: executive',
    scope: 'record',
    source: () =>
      celSource(sharing.find((r) => r?.name === 'opportunity_executive_sharing')?.condition),
  },
] as const;

// ── anti-vacuity ───────────────────────────────────────────────────────────

describe('every large-deal site is actually found', () => {
  // Everything below compares derived values. If a derivation silently yielded
  // an empty string, its comparison would pass by being vacuous. These
  // assertions are what make the rest mean something.
  it('the compiled stack ships flows and sharing rules to read', () => {
    expect(flows.length).toBeGreaterThan(0);
    expect(sharing.length, 'no sharing rules in the compiled stack').toBeGreaterThan(0);
  });

  it.each(LARGE_DEAL_SITES.map((s) => [s.label, s] as const))(
    '%s states exactly one amount cut',
    (_label, site) => {
      const cuts = amountCuts(site.source() ?? '');
      const onScope = cuts.filter((c) => c.scope === site.scope);
      expect(
        onScope,
        `ambiguous or missing amount cut for ${site.label} in: ${site.source()}`,
      ).toHaveLength(1);
    },
  );
});

// ── the parity claim ───────────────────────────────────────────────────────

describe('one definition of "large deal"', () => {
  it.each(LARGE_DEAL_SITES.map((s) => [s.label, s] as const))(
    '%s cuts at LARGE_DEAL_AMOUNT',
    (_label, site) => {
      const cut = amountCuts(site.source() ?? '').find((c) => c.scope === site.scope);
      expect(
        cut?.value,
        `${site.label} cuts at ${cut?.value}, but _thresholds.ts says ${LARGE_DEAL_AMOUNT} — ` +
          `a deal can now be large enough for one of these and not the others`,
      ).toBe(LARGE_DEAL_AMOUNT);
    },
  );

  it('no large-deal site carries a hardcoded literal any more', () => {
    // The convergence is only real if the numbers cannot be re-typed. This
    // reads the SOURCE FILES rather than the compiled stack — after `P`
    // interpolation both spellings compile to the same CEL, so the compiled
    // form cannot tell a constant from a literal.
    const files = [
      'src/flows/opportunity-approval.flow.ts',
      'src/flows/opportunity-won-alert.flow.ts',
      'src/sharing/opportunity.sharing.ts',
    ];
    const offenders: string[] = [];
    for (const rel of files) {
      const raw = readFileSync(join(REPO_ROOT, rel), 'utf8').split('\n');
      stripComments(raw.join('\n'))
        .split('\n')
        .forEach((code, i) => {
          if (/\.amount\s*(>=|<=|>|<)\s*\d/.test(code)) {
            offenders.push(`${rel}:${i + 1}: ${raw[i]?.trim()}`);
          }
        });
    }
    expect(
      offenders,
      'these lines compare `amount` against a numeric literal instead of interpolating ' +
        '`_thresholds.ts` — that is how the four definitions drifted apart in the first place:\n  ' +
        offenders.join('\n  '),
    ).toEqual([]);
  });
});

describe('one definition of the director tier', () => {
  const directorCuts = () =>
    conditionsOf('opportunity_approval')
      .flatMap((c) => amountCuts(c))
      .filter((c) => c.scope === 'oppRecord');

  it('states the high-value line exactly twice, in complementary polarity', () => {
    // The `check_high_value` branch is authored as a matched pair (`e5` takes
    // the director path, `e6` is the fallback). Stated once, a deal whose
    // amount cannot be read would strand in an undecidable step — which is why
    // the pair exists and why both halves must move together.
    const cuts = directorCuts();
    expect(cuts).toHaveLength(2);
    expect(cuts.map((c) => c.op).sort()).toEqual(['<=', '>']);
  });

  it('both halves cut at HIGH_VALUE_DEAL_AMOUNT', () => {
    for (const cut of directorCuts()) {
      expect(
        cut.value,
        `the ${cut.op} half of check_high_value cuts at ${cut.value}, not ${HIGH_VALUE_DEAL_AMOUNT}`,
      ).toBe(HIGH_VALUE_DEAL_AMOUNT);
    }
  });

  it('the director tier sits above the large-deal line', () => {
    // Not a tautology: inverted, every deal entering approval would jump
    // straight to director sign-off and the manager tier would be unreachable.
    expect(HIGH_VALUE_DEAL_AMOUNT).toBeGreaterThan(LARGE_DEAL_AMOUNT);
  });
});

// ── the boundary that is NOT converged, recorded rather than hidden ─────────

describe('BOUNDARY: the operators still disagree, and this is what it costs', () => {
  /**
   * Converging the value leaves the operators where they were. This block is
   * the honest statement of the residue: at EXACTLY `LARGE_DEAL_AMOUNT` a deal
   * is visible to leadership and invisible to governance.
   *
   * It is asserted, not merely commented, for two reasons. It makes the
   * disagreement fail loudly if someone changes one operator and not the
   * others — the same drift by another name — and it is the test that goes red
   * when the product question is answered, which is exactly when someone should
   * be reading this file.
   */
  const opFor = (label: string): string => {
    const site = LARGE_DEAL_SITES.find((s) => s.label === label)!;
    return amountCuts(site.source() ?? '').find((c) => c.scope === site.scope)!.op;
  };

  it('governance cuts strictly above the line; visibility cuts at it', () => {
    expect(opFor('approval entry gate (afterUpdate)')).toBe('>');
    expect(opFor('approval entry gate (afterInsert twin)')).toBe('>');
    expect(opFor('won-deal alert')).toBe('>');
    expect(opFor('sharing: sales director')).toBe('>=');
    expect(opFor('sharing: executive')).toBe('>=');
  });

  it('names the population that falls in the gap', () => {
    // A deal at exactly $100,000.00 — plausibly the single commonest amount in
    // a CRM — is shared with the director and the executive, is NOT routed for
    // approval, and is NOT announced when it is won. Recorded as a truth table
    // so the gap is a row someone can read, not a sentence someone can skip.
    const shared = (amount: number) => amount >= LARGE_DEAL_AMOUNT;
    const governed = (amount: number) => amount > LARGE_DEAL_AMOUNT;
    const at = LARGE_DEAL_AMOUNT;

    expect({ shared: shared(at), governed: governed(at) }).toEqual({ shared: true, governed: false });
    expect({ shared: shared(at + 1), governed: governed(at + 1) }).toEqual({ shared: true, governed: true });
    expect({ shared: shared(at - 1), governed: governed(at - 1) }).toEqual({ shared: false, governed: false });
  });
});

// ── the module is the only home for these numbers ──────────────────────────

describe('nothing else in the app re-states a large-deal amount', () => {
  /**
   * The convergence claim reaches past the four known sites: a fifth copy typed
   * into a view filter, a dashboard widget or a hook would restart the drift
   * without touching any file this suite reads. So the whole of `src/` is swept
   * for the two values, and everything that is not the constants module itself
   * has to be an allowed exception with a reason.
   */
  const VALUES = [LARGE_DEAL_AMOUNT, HIGH_VALUE_DEAL_AMOUNT];

  /**
   * Files whose CODE may legitimately contain the digits, and why. Comments are
   * stripped before the sweep, so a file only needs listing here if it executes
   * the number — which for everything but the constants module means the digits
   * mean something other than "the large-deal line".
   */
  const ALLOWED = new Set([
    // The one authoring site.
    'src/objects/_thresholds.ts',
    // Seeded forecast quotas and closed-period actuals: money, not thresholds.
    // A rep's $500,000 quarterly quota has nothing to do with when a deal needs
    // a director's signature; converging them would be a false merge.
    'src/data/revenue.seed.ts',
  ]);

  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = join(dir, e.name);
      if (e.isDirectory()) return walk(full);
      return e.isFile() && full.endsWith('.ts') ? [full] : [];
    });

  it('the two amounts appear in source only where they are authored or explained', () => {
    const hits: string[] = [];
    for (const file of walk(join(REPO_ROOT, 'src'))) {
      const rel = relative(REPO_ROOT, file);
      if (ALLOWED.has(rel)) continue;
      const text = stripComments(readFileSync(file, 'utf8'));
      for (const value of VALUES) {
        // Word-bounded so 1_100_000 / 2_500_000 are not read as 100000.
        if (new RegExp(String.raw`(?<![\d_])${value}(?![\d_])`).test(text)) {
          hits.push(`${rel}: ${value}`);
        }
      }
    }
    expect(
      hits,
      'these files restate a threshold that `src/objects/_thresholds.ts` owns. Import the ' +
        'constant, or — if the number genuinely means something else here — add the file to ' +
        'ALLOWED with the reason:\n  ' +
        hits.join('\n  '),
    ).toEqual([]);
  });

  it('the sweep can actually see the constants module — anti-vacuity', () => {
    const text = readFileSync(join(REPO_ROOT, 'src/objects/_thresholds.ts'), 'utf8');
    expect(text).toMatch(/LARGE_DEAL_AMOUNT = 100_000/);
    expect(text).toMatch(/HIGH_VALUE_DEAL_AMOUNT = 500_000/);
  });
});

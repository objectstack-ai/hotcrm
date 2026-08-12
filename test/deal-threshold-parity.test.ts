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
 * ### The VALUE and the OPERATOR are both converged (#599, then #1087)
 *
 * #599 converged the value and deliberately left the operators alone: approval
 * entry and the won alert cut at `> LARGE_DEAL_AMOUNT`, both sharing rules at
 * `>=`, so a deal at exactly $100,000.00 was shared with the sales director and
 * the executive and was neither routed for approval nor announced when it was
 * won — visible to leadership, invisible to governance.
 *
 * #1087 answered the product question that left open (**does a deal at exactly
 * the threshold count as large? — yes**) and converged every site on `>=`. The
 * `BOUNDARY` block below is what states that: one line, and above it — at it,
 * inclusive — everything applies. It is the assertion that fails if a future
 * author flips one site back, which is the same drift by another name.
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
 * flows explain why `record.amount >= 100000` aborts on a null, and
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

// ── the boundary, converged and pinned ──────────────────────────────────────

describe('BOUNDARY: every large-deal site cuts inclusively at the line (#1087)', () => {
  /**
   * The ruling on #1087: a deal at exactly `LARGE_DEAL_AMOUNT` **is** a large
   * deal, so all five sites cut at `>=`. Before it, governance (approval entry,
   * its insert twin, the won alert) cut at `>` while visibility (both sharing
   * rules) cut at `>=`, and the $100,000.00 deal — plausibly the single
   * commonest amount in a CRM, because a round threshold attracts deals priced
   * at exactly that number — was shared with the sales director and the
   * executive, not routed for approval, and not announced when it was won.
   *
   * The operator is asserted per site rather than inferred from one of them: a
   * single site flipped back is the same drift #599 closed on the value, and it
   * is exactly as invisible. The truth table underneath then states what the
   * operators MEAN, in the three rows that separate the two readings — the
   * middle row is the whole card.
   */
  const opFor = (label: string): string => {
    const site = LARGE_DEAL_SITES.find((s) => s.label === label)!;
    return amountCuts(site.source() ?? '').find((c) => c.scope === site.scope)!.op;
  };

  it.each(LARGE_DEAL_SITES.map((s) => [s.label] as const))(
    '%s cuts at `>=`, not `>`',
    (label) => {
      expect(
        opFor(label),
        `${label} cuts at "${opFor(label)}" — every large-deal site must cut at ">=" (#1087). ` +
          'One site on ">" puts a deal at exactly the threshold on the wrong side of that ' +
          'site alone, which is how "visible to leadership, invisible to governance" happened.',
      ).toBe('>=');
    },
  );

  it('a deal AT the line is both shared and governed; below it, neither', () => {
    // Derived from the SHIPPED operators, not restated: `shared` / `governed`
    // are built out of what the metadata cuts at, so the table cannot stay
    // green while a flow flips back — which is what makes it a truth table
    // about this app rather than about JavaScript's `>=`.
    const cutAt = (label: string) => {
      const op = opFor(label);
      return (amount: number) => (op === '>=' ? amount >= LARGE_DEAL_AMOUNT : amount > LARGE_DEAL_AMOUNT);
    };
    const shared = (amount: number) =>
      cutAt('sharing: sales director')(amount) && cutAt('sharing: executive')(amount);
    const governed = (amount: number) =>
      cutAt('approval entry gate (afterUpdate)')(amount) &&
      cutAt('approval entry gate (afterInsert twin)')(amount) &&
      cutAt('won-deal alert')(amount);
    const at = LARGE_DEAL_AMOUNT;

    // The row the card exists for: $100,000 is large for BOTH, or the fix did
    // not land. Accepted and intended consequence — a deal at exactly the
    // threshold now requires manager approval and fires the won-deal alert.
    expect({ amount: at, shared: shared(at), governed: governed(at) }).toEqual({
      amount: at, shared: true, governed: true,
    });
    expect({ amount: at + 1, shared: shared(at + 1), governed: governed(at + 1) }).toEqual({
      amount: at + 1, shared: true, governed: true,
    });
    expect({ amount: at - 1, shared: shared(at - 1), governed: governed(at - 1) }).toEqual({
      amount: at - 1, shared: false, governed: false,
    });
  });

  it('visibility and governance answer the same at every amount around the line', () => {
    // The property behind the table, stated once so it survives the next
    // threshold change: "large deal" is ONE predicate. Sweeping a window rather
    // than the three rows above catches an operator pair that agrees at the
    // boundary and disagrees elsewhere (e.g. a `>` paired with a value one
    // lower), which the three-row table alone would pass.
    const disagreements: string[] = [];
    for (const amount of [
      LARGE_DEAL_AMOUNT - 2, LARGE_DEAL_AMOUNT - 1, LARGE_DEAL_AMOUNT,
      LARGE_DEAL_AMOUNT + 1, LARGE_DEAL_AMOUNT + 2,
    ]) {
      const verdicts = LARGE_DEAL_SITES.map((site) => {
        const cut = amountCuts(site.source() ?? '').find((c) => c.scope === site.scope)!;
        const large = cut.op === '>=' ? amount >= cut.value : amount > cut.value;
        return { label: site.label, large };
      });
      if (new Set(verdicts.map((v) => v.large)).size > 1) {
        disagreements.push(
          `${amount}: ${verdicts.map((v) => `${v.label}=${v.large ? 'large' : 'not large'}`).join(', ')}`,
        );
      }
    }
    expect(
      disagreements,
      'these amounts are a large deal to some sites and not to others:\n  ' +
        disagreements.join('\n  '),
    ).toEqual([]);
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

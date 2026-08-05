// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import stack from '../objectstack.config';

/**
 * ═══ HOUSE RULE: a view label may not promise a time scope its filter does
 *     not express ═══════════════════════════════════════════════════════════
 *
 * A list view is named twice — once in metadata (`label`) and once per locale
 * (`objects.<object>._views.<view>.label`) — and the name a user reads is the
 * translated one. Neither spelling is decoration: "This Quarter" is a claim
 * about WHICH ROWS come back, and the only thing that can honour it is the
 * view's `filter`.
 *
 * `crm_forecast` holds one row per owner PER PERIOD and deliberately holds
 * several periods at once, so a quarter-labelled view whose filter says only
 * `period = 'quarter'` returns every quarterly snapshot ever taken — every
 * settled quarter of every year, with the current one merely sorted to the
 * top. That was #730: four locales said "This Quarter" / 本季度 / Este
 * trimestre / 今四半期 over an unscoped list, and a reader who trusted the
 * label and summed the Quota column got the same cross-period addition #614
 * fixed on the dashboard.
 *
 * ### Why the scope is expressible again (the premise that expired)
 *
 * The restriction was removed in #515 on a measurement that was true then and
 * is false now: on @objectstack 16.1.0 nothing on the server substituted
 * `{date_macro}` placeholders, so a `period_start = '{current_quarter_start}'`
 * filter reached the driver as a literal string and matched nothing — an empty
 * grid indistinguishable from "no data yet". `resolveFilterTokens()` was wired
 * into the ObjectQL READ path in **17.0.0-rc.0** (objectql `feat(filters):
 * evaluate {filter-token} placeholders server-side`, #3582), ahead of the
 * middleware chain, covering `find` / `findOne` / `count` / `aggregate` — the
 * one gate every server-side read passes through, saved-view filters included.
 *
 * This file does not take that on faith. The RUNTIME blocks below run the
 * shipped filters through a real engine on the pinned 17.0.0-rc.2 and pin a
 * THREE-way outcome, because two of the three look alike from a screenshot:
 *
 *   | rows back | meaning                                              |
 *   | --------- | ---------------------------------------------------- |
 *   | 0         | the macro shipped unresolved — the #515 failure mode  |
 *   | all       | the filter is unscoped — the #730 defect             |
 *   | 1 quarter | resolved AND scoped — the contract                    |
 *
 * The STRUCTURAL block is the one that stops the lie coming back: it re-derives
 * the claim from the labels themselves, in all four locales, so a view renamed
 * "This Month" without a matching filter fails on the day it is renamed.
 *
 * ### Two surfaces, two filter SHAPES (#730 and #743)
 *
 * The structural guard found a second instance on the run that introduced it,
 * and the second one needed a different fix, which is why both runtime blocks
 * are here rather than one being a copy of the other:
 *
 * - `crm_forecast.this_quarter_forecasts` pins a period by EQUALITY —
 *   `period_start` stores the period's first day, so one `=` names one quarter.
 * - `crm_opportunity.closing_this_quarter` needs a RANGE — `close_date` is an
 *   arbitrary day inside the quarter. A range has a failure mode an equality
 *   does not: lose one bound and the list widens back out while still looking
 *   scoped, so that block subtracts each bound separately (#743).
 */

type AnyRec = Record<string, any>;

const views: AnyRec[] = (stack as any).views ?? [];
const localePacks: [string, AnyRec][] = ((stack as any).translations ?? []).flatMap(
  (bundle: AnyRec) => Object.entries(bundle) as [string, AnyRec][],
);

/**
 * Phrases that claim a CURRENT calendar period, per period and per locale, and
 * the `{token}` a filter must carry to honour the claim.
 *
 * Deliberately a claim vocabulary rather than a regex over "quarter": "All
 * Forecasts" and "Quarterly Subscriptions" name no period and must not be
 * dragged in, while "This Quarter" and 今四半期 do. `_start` is the token that
 * pins a period on this schema — `period_start` stores the period's first day,
 * so equality against `{current_*_start}` selects exactly one period.
 */
const CURRENT_PERIOD_CLAIMS: Array<{ period: string; token: string; phrases: RegExp[] }> = [
  {
    period: 'quarter',
    token: '{current_quarter_start}',
    phrases: [/this quarter/i, /current quarter/i, /本季度|本季報|本季$/, /este trimestre/i, /今四半期/],
  },
  {
    period: 'month',
    token: '{current_month_start}',
    phrases: [/this month/i, /current month/i, /本月/, /este mes/i, /今月/],
  },
  {
    period: 'week',
    token: '{current_week_start}',
    phrases: [/this week/i, /current week/i, /本周|本週/, /esta semana/i, /今週/],
  },
  {
    period: 'year',
    token: '{current_year_start}',
    phrases: [/this year/i, /current year/i, /本年度/, /este año/i, /今年度/],
  },
];

/**
 * KNOWN DEBT — surfaces in breach of the rule above, with the issue that owns
 * the fix. NOT a suppression list: each entry is asserted to be STILL in
 * breach, so the day one is fixed this file goes red and tells you to delete
 * the line. An exemption that quietly outlives its defect is how a guard
 * becomes decoration.
 *
 * Currently EMPTY, and it earned that: the one entry it shipped with,
 * `crm_opportunity.closing_this_quarter` (#743), was found BY this guard on the
 * run that introduced it — labelled "Closing This Quarter" in all four locales
 * with no `close_date` condition of any kind. #743 gave it the range the label
 * promises, and the self-expiry assertion below is what said so: it went red on
 * the fix and stayed red until this line was deleted, which is the whole point
 * of asserting an exemption rather than suppressing one. Keep the map (and both
 * assertions) — the next instance of this defect class needs somewhere to be
 * recorded that cannot rot.
 */
const KNOWN_DEBT: Record<string, string> = {};

/** Every list view in the stack, flattened with the object it reads. */
const listViews: Array<{ object: string; name: string; view: AnyRec }> = views.flatMap((record) => {
  const containers: Array<[string, AnyRec]> = [
    ...(record.list ? ([['list', record.list]] as Array<[string, AnyRec]>) : []),
    ...Object.entries<AnyRec>(record.listViews ?? {}),
  ];
  return containers.map(([key, view]) => ({
    object: view?.data?.object ?? record.list?.data?.object ?? record.object,
    name: view?.name ?? key,
    view,
  }));
});

/** Metadata label + every locale label, i.e. every name a user can read. */
const namesOf = (object: string, name: string, view: AnyRec): Array<[string, string]> => {
  const out: Array<[string, string]> = [];
  if (typeof view?.label === 'string') out.push(['metadata', view.label]);
  for (const [locale, pack] of localePacks) {
    const label = pack.objects?.[object]?._views?.[name]?.label;
    if (typeof label === 'string') out.push([locale, label]);
  }
  return out;
};

/** The `{token}` values a view's filter actually carries. */
const filterTokens = (view: AnyRec): string[] =>
  (view?.filter ?? [])
    .map((rule: AnyRec) => rule?.value)
    .filter((v: unknown): v is string => typeof v === 'string' && /^\{.+\}$/.test(v));

describe('no view label promises a time scope its filter does not express (#730)', () => {
  it('the locale bundles this guard reads are actually loaded', () => {
    // Without this, a bundle rename would silently reduce the guard to the
    // metadata label alone — and the metadata label is the half that was RIGHT
    // in #730. The lie lived exclusively in the translated half.
    expect(localePacks.map(([l]) => l).sort()).toEqual(['en', 'es-ES', 'ja-JP', 'zh-CN']);
  });

  it('the forecast quarter view is one of the surfaces under guard', () => {
    // Vacuity: this rule exists because of exactly one view. If the derivation
    // stops finding it, the suite must fail rather than pass on an empty set.
    const claims = listViews.filter(({ object, name, view }) =>
      CURRENT_PERIOD_CLAIMS.some((c) =>
        namesOf(object, name, view).some(([, label]) => c.phrases.some((p) => p.test(label)))));
    expect(claims.map((c) => `${c.object}.${c.name}`)).toContain('crm_forecast.this_quarter_forecasts');
  });

  /** Every (view, claimed period) pair whose filter does not pin that period. */
  const breaches = (): string[] => {
    const out: string[] = [];
    for (const { object, name, view } of listViews) {
      const labels = namesOf(object, name, view);
      const tokens = filterTokens(view);
      for (const claim of CURRENT_PERIOD_CLAIMS) {
        const claiming = labels.filter(([, label]) => claim.phrases.some((p) => p.test(label)));
        if (claiming.length === 0) continue;
        if (tokens.includes(claim.token)) continue;
        out.push(
          `${object}.${name} is labelled ${claiming.map(([l, v]) => `${l}:"${v}"`).join(', ')} `
          + `but its filter carries no ${claim.token} — it returns every ${claim.period}, `
          + `not the current one (filter tokens: ${tokens.join(', ') || 'none'})`,
        );
      }
    }
    return out;
  };

  it('every current-period label is backed by a filter that pins that period', () => {
    const bad = breaches().filter((line) => !Object.keys(KNOWN_DEBT).some((k) => line.startsWith(`${k} `)));
    expect(
      bad,
      'these view names promise a time scope the filter does not apply. Either pin '
        + `the period in the filter, or rename the view so it stops claiming one:\n  ${bad.join('\n  ')}`,
    ).toEqual([]);
  });

  it('every KNOWN_DEBT exemption is still needed', () => {
    const stale = Object.entries(KNOWN_DEBT)
      .filter(([key]) => !breaches().some((line) => line.startsWith(`${key} `)))
      .map(([key, issue]) => `${key} (${issue})`);
    expect(
      stale,
      'these views no longer breach the rule — delete their KNOWN_DEBT entries so the '
        + `guard covers them again:\n  ${stale.join('\n  ')}`,
    ).toEqual([]);
  });

  it('the quarter view pins BOTH halves of the period key', () => {
    // `period_start` alone merges the quarter row with the MONTH row that opens
    // the same quarter (Q3 and July both start on the 1st); `period` alone is
    // the #730 defect. Only the pair names one snapshot per owner — the same
    // pair `sales_dashboard/quota_attainment_by_rep` pins.
    const view = listViews.find((v) => v.name === 'this_quarter_forecasts')!.view;
    const pairs = (view.filter ?? []).map((r: AnyRec) => [r.field, r.operator, r.value]);
    expect(pairs).toEqual([
      ['period', 'equals', 'quarter'],
      ['period_start', 'equals', '{current_quarter_start}'],
    ]);
  });

  it('the empty state is authored and translated in all four locales', () => {
    // Scoping to the current quarter makes "empty" a state a real user meets:
    // the seeds ship no current-quarter row (#702 — the sweep owns that
    // window), so a fresh install shows nothing here until the 03:00 sweep runs
    // once. Untranslated, that reads as a broken view.
    const view = listViews.find((v) => v.name === 'this_quarter_forecasts')!.view;
    expect(view.emptyState?.title, 'authored empty-state title').toBeTruthy();
    expect(view.emptyState?.message, 'authored empty-state message').toBeTruthy();
    const missing: string[] = [];
    for (const [locale, pack] of localePacks) {
      const t = pack.objects?.crm_forecast?._views?.this_quarter_forecasts?.emptyState;
      if (!t?.title) missing.push(`${locale}: title`);
      if (!t?.message) missing.push(`${locale}: message`);
    }
    expect(missing, `untranslated empty-state copy:\n  ${missing.join('\n  ')}`).toEqual([]);
  });
});

// ─── Runtime: the rows the shipped filter actually selects ─────────────────

const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const now = new Date();
const currentQuarterStart = isoDate(
  new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1)),
);
const lastQuarterStart = isoDate(
  new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3 - 3, 1)),
);

/**
 * Canonical `VIEW_FILTER_OPERATORS` spellings, lowered to the engine's
 * comparison keys. The mapping is the same one `spec/data/filter.zod.ts`
 * applies (`AST_OPERATOR_MAP`); it is spelled out here rather than imported so
 * this test asserts against the vocabulary an author actually writes.
 */
const COMPARISON_OPERATORS: Record<string, string> = {
  in: '$in',
  not_in: '$nin',
  greater_than_or_equal: '$gte',
  less_than_or_equal: '$lte',
  greater_than: '$gt',
  less_than: '$lt',
};

/**
 * Translate a view `filter` (the authored `[{field, operator, value}]` shape)
 * into an engine `where`.
 *
 * Only the operators the shipped views use are implemented, and an unknown one
 * THROWS rather than being dropped: a silently-dropped condition widens the
 * result set, which is the very failure this file exists to catch. It would
 * turn a red test green.
 *
 * Two rules on the SAME field merge into one comparison object — that is how
 * `closing_this_quarter` expresses its half of a range (#743), and dropping
 * either bound would widen the window rather than fail. A scalar equality
 * colliding with a range on one field throws for the same reason: one of the
 * two would have to be discarded.
 */
const whereFromViewFilter = (filter: AnyRec[]): AnyRec => {
  const where: AnyRec = {};
  const isComparison = (v: unknown) => typeof v === 'object' && v !== null && !Array.isArray(v);
  for (const rule of filter ?? []) {
    const existing = where[rule.field];
    if (rule.operator === 'equals') {
      if (existing !== undefined) {
        throw new Error(
          `field "${rule.field}" already carries a condition; adding an equality would `
          + 'discard one of them rather than narrow the result',
        );
      }
      where[rule.field] = rule.value;
      continue;
    }
    const key = COMPARISON_OPERATORS[rule.operator];
    if (!key) {
      throw new Error(
        `view filter operator "${rule.operator}" is not implemented by this test's `
        + 'translator — implement it rather than letting the condition vanish',
      );
    }
    if (existing !== undefined && !isComparison(existing)) {
      throw new Error(
        `field "${rule.field}" already carries a scalar equality; merging a `
        + `"${rule.operator}" clause onto it would drop one of them`,
      );
    }
    where[rule.field] = { ...(isComparison(existing) ? existing : {}), [key]: rule.value };
  }
  return where;
};

describe('this_quarter_forecasts returns the current quarter, on the real engine (#730)', () => {
  let ql: Awaited<ReturnType<typeof ObjectQL.create>>;
  let api: AnyRec;
  const view = listViews.find((v) => v.name === 'this_quarter_forecasts')!.view;

  beforeAll(async () => {
    ql = await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: {
        crm_forecast: {
          name: 'crm_forecast',
          fields: {
            id: { type: 'text' },
            owner_id: { type: 'text' },
            period: { type: 'text' },
            period_start: { type: 'date' },
            quota: { type: 'number' },
            closed_amount: { type: 'number' },
          },
        },
      } as never,
    });
    api = ql.createContext({ isSystem: true, userId: 'usr_1', tenantId: 'org_1' } as never);

    // The current quarter, as the 03:00 sweep opens it — one row per owner.
    await api.object('crm_forecast').insert({
      owner_id: 'rep_alice', period: 'quarter', period_start: currentQuarterStart,
      quota: 1_500_000, closed_amount: 900_000,
    });
    await api.object('crm_forecast').insert({
      owner_id: 'rep_bob', period: 'quarter', period_start: currentQuarterStart,
      quota: 1_500_000, closed_amount: 400_000,
    });
    // A settled quarter — what the unscoped filter used to hand back as well.
    await api.object('crm_forecast').insert({
      owner_id: 'rep_alice', period: 'quarter', period_start: lastQuarterStart,
      quota: 1_200_000, closed_amount: 1_100_000,
    });
    // The MONTH row that opens the current quarter: same `period_start`, and
    // the reason `period` has to stay in the filter beside the macro.
    await api.object('crm_forecast').insert({
      owner_id: 'rep_alice', period: 'month', period_start: currentQuarterStart,
      quota: 500_000, closed_amount: 300_000,
    });
  });

  afterAll(async () => {
    await ql?.close();
  });

  it('the fixture really does hold more than one period', async () => {
    // Premise of every assertion below: on a single-period table they would all
    // pass for the wrong reason.
    const all = await api.object('crm_forecast').find({ where: {} });
    expect(all.length).toBe(4);
  });

  it('selects the current quarter only — not zero rows, and not every quarter', async () => {
    const rows: AnyRec[] = await api.object('crm_forecast').find({
      where: whereFromViewFilter(view.filter),
    });

    // Not zero: the macro RESOLVED. An unresolved `{current_quarter_start}`
    // compares as a literal string and selects nothing — the failure mode #515
    // removed the filter to escape, and the one that looks identical to a
    // legitimately empty quarter on a screenshot.
    expect(rows.length, 'macro resolved and matched rows').toBeGreaterThan(0);

    // Not every quarter: the label is honoured.
    expect(rows.map((r) => r.period_start)).toEqual([currentQuarterStart, currentQuarterStart]);
    expect(rows.map((r) => r.owner_id).sort()).toEqual(['rep_alice', 'rep_bob']);

    // And not the month row that shares the quarter's first day.
    expect(rows.every((r) => r.period === 'quarter')).toBe(true);
  });

  it('the same filter WITHOUT the macro half returns every quarter — the #730 defect', async () => {
    // The subtraction, run rather than asserted from memory: this is exactly
    // the filter `main` shipped, and it is what the "This Quarter" label sat
    // over. Pinning it here means the guard above cannot pass vacuously.
    const rows: AnyRec[] = await api.object('crm_forecast').find({
      where: { period: 'quarter' },
    });
    expect(rows.length).toBe(3);
    expect([...new Set(rows.map((r) => r.period_start))].sort())
      .toEqual([lastQuarterStart, currentQuarterStart].sort());
  });

  it('the pre-#515 spelling is now rejected outright, not silently unresolved', async () => {
    // `{this_quarter_start}` is not in the vocabulary. On 16.1.0 it reached the
    // driver as text and matched nothing; from 17.0.0-rc.0 the resolver throws
    // and names the fix, so the silent-empty mode that motivated the removal is
    // no longer reachable at all.
    await expect(
      api.object('crm_forecast').find({ where: { period_start: '{this_quarter_start}' } }),
    ).rejects.toThrow(/Unresolvable filter placeholder/);
  });
});

// ─── Runtime: the same three-way pin, on the RANGE case (#743) ──────────────

/**
 * `crm_opportunity.closing_this_quarter` is the second surface the structural
 * guard above caught, and it differs from `crm_forecast`'s in the shape the fix
 * takes. `period_start` stores a period's first day, so ONE equality names one
 * quarter. `close_date` is an arbitrary day inside the quarter, so the only
 * honest filter is a RANGE — and a range fails in a way an equality cannot:
 * lose one bound and the list silently widens back out, which looks exactly
 * like the defect it replaced.
 *
 * Hence the same three-way pin as the #730 block (0 rows = macro unresolved,
 * all rows = unscoped, one quarter = contract) plus a bound-by-bound
 * subtraction, and boundary rows on the quarter's first and last day so the
 * INCLUSIVE upper bound cannot quietly become exclusive.
 */
const quarterEndDate = isoDate(
  new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3 + 3, 0)),
);
const nextQuarterStart = isoDate(
  new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3 + 3, 1)),
);
const nextYearDay = `${now.getUTCFullYear() + 1}-03-15`;
const lastYearDay = `${now.getUTCFullYear() - 1}-05-20`;

describe('closing_this_quarter returns this quarter only, on the real engine (#743)', () => {
  let ql: Awaited<ReturnType<typeof ObjectQL.create>>;
  let api: AnyRec;
  const view = listViews.find((v) => v.name === 'closing_this_quarter')!.view;

  /** Every seeded deal, and whether the SHIPPED filter should return it. */
  const fixtures: Array<{ name: string; close_date: string; forecast_category: string; stage: string; expected: boolean }> = [
    // In-window, and qualifying on the two conditions that already shipped.
    { name: 'opens-the-quarter', close_date: currentQuarterStart, forecast_category: 'commit', stage: 'negotiation', expected: true },
    { name: 'closes-the-quarter', close_date: quarterEndDate, forecast_category: 'best_case', stage: 'proposal', expected: true },
    { name: 'mid-quarter', close_date: isoDate(new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3 + 1, 15))), forecast_category: 'commit', stage: 'proposal', expected: true },
    // Out of window — the #743 defect, in both directions.
    { name: 'first-day-of-next-quarter', close_date: nextQuarterStart, forecast_category: 'commit', stage: 'negotiation', expected: false },
    { name: 'next-year', close_date: nextYearDay, forecast_category: 'commit', stage: 'proposal', expected: false },
    { name: 'last-year', close_date: lastYearDay, forecast_category: 'best_case', stage: 'proposal', expected: false },
    // In window, but excluded by the halves that were already correct. These
    // keep the date range from being credited for the whole result set.
    { name: 'in-window-but-pipeline', close_date: quarterEndDate, forecast_category: 'pipeline', stage: 'qualification', expected: false },
    { name: 'in-window-but-won', close_date: currentQuarterStart, forecast_category: 'commit', stage: 'closed_won', expected: false },
  ];
  const expectedNames = fixtures.filter((f) => f.expected).map((f) => f.name).sort();

  beforeAll(async () => {
    ql = await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: {
        crm_opportunity: {
          name: 'crm_opportunity',
          fields: {
            id: { type: 'text' },
            name: { type: 'text' },
            stage: { type: 'text' },
            forecast_category: { type: 'text' },
            amount: { type: 'number' },
            // `date`, NOT `datetime` — the property the inclusive upper bound
            // rests on. See the comment on the view's filter.
            close_date: { type: 'date' },
          },
        },
      } as never,
    });
    api = ql.createContext({ isSystem: true, userId: 'usr_1', tenantId: 'org_1' } as never);
    for (const f of fixtures) {
      await api.object('crm_opportunity').insert({
        name: f.name, close_date: f.close_date, forecast_category: f.forecast_category,
        stage: f.stage, amount: 100_000,
      });
    }
  });

  afterAll(async () => {
    await ql?.close();
  });

  it('the shipped filter carries both bounds, in the canonical operator spelling', () => {
    // Structural, and deliberately strict about the SPELLING: the schema folds
    // `greater_or_equal`/`gte` to canonical on parse, so an alias would work at
    // runtime and drift the source away from the one authoring vocabulary
    // `VIEW_FILTER_OPERATORS` defines. #743's own issue body proposed the alias.
    const pairs = (view.filter ?? []).map((r: AnyRec) => [r.field, r.operator, r.value]);
    expect(pairs).toEqual([
      ['forecast_category', 'in', ['commit', 'best_case']],
      ['stage', 'not_in', ['closed_won', 'closed_lost']],
      ['close_date', 'greater_than_or_equal', '{current_quarter_start}'],
      ['close_date', 'less_than_or_equal', '{current_quarter_end}'],
    ]);
  });

  it('the fixture really does hold deals outside the quarter', async () => {
    // Premise of every assertion below: on an all-in-quarter table they would
    // all pass without the range doing anything.
    const all: AnyRec[] = await api.object('crm_opportunity').find({ where: {} });
    expect(all.length).toBe(fixtures.length);
    expect(all.some((r) => r.close_date === nextYearDay)).toBe(true);
    expect(all.some((r) => r.close_date === lastYearDay)).toBe(true);
  });

  it('selects this quarter only — not zero rows, and not every open deal', async () => {
    const rows: AnyRec[] = await api.object('crm_opportunity').find({
      where: whereFromViewFilter(view.filter),
    });

    // Not zero: both macros RESOLVED. An unresolved `{current_quarter_start}`
    // compares as a literal string, and on a range it is worse than the
    // equality case — `>= '{current…'` and `<= '{current…'` cannot both hold,
    // so the list is empty and looks like a quarter with no commit.
    expect(rows.length, 'macros resolved and matched rows').toBeGreaterThan(0);

    // Not every open deal: the label is honoured.
    expect(rows.length).toBeLessThan(fixtures.length);
    expect(rows.map((r) => r.name).sort()).toEqual(expectedNames);

    // Every surviving row really is inside the window, by value.
    for (const r of rows) {
      expect(r.close_date >= currentQuarterStart, `${r.name} on or after quarter start`).toBe(true);
      expect(r.close_date <= quarterEndDate, `${r.name} on or before quarter end`).toBe(true);
    }
  });

  it('both quarter boundary days are INSIDE the window', async () => {
    // The upper bound is `<= {current_quarter_end}`, i.e. the quarter's last
    // calendar day. Were it silently exclusive (or were the token to resolve to
    // the next period's first day) the deal closing ON the last day would drop
    // out — a one-row loss at the exact moment of the quarter a manager is
    // reading this list hardest.
    const rows: AnyRec[] = await api.object('crm_opportunity').find({
      where: whereFromViewFilter(view.filter),
    });
    const dates = rows.map((r) => r.close_date);
    expect(dates).toContain(currentQuarterStart);
    expect(dates).toContain(quarterEndDate);
    // …and the very next day is not.
    expect(dates).not.toContain(nextQuarterStart);
  });

  it('the same filter WITHOUT the range returns deals closing next year — the #743 defect', async () => {
    // The subtraction, run rather than asserted from memory: this is exactly
    // the filter `main` shipped under a "Closing This Quarter" heading. It adds
    // rows rather than removing them, so this case cannot pass for the empty
    // reason a subtraction case sometimes does.
    const withoutRange = (view.filter ?? []).filter((r: AnyRec) => r.field !== 'close_date');
    const rows: AnyRec[] = await api.object('crm_opportunity').find({
      where: whereFromViewFilter(withoutRange),
    });
    expect(rows.map((r) => r.name).sort()).toEqual([
      'closes-the-quarter', 'first-day-of-next-quarter', 'last-year',
      'mid-quarter', 'next-year', 'opens-the-quarter',
    ]);
    expect(rows.map((r) => r.close_date)).toContain(nextYearDay);
  });

  it('dropping EITHER bound alone widens the window', async () => {
    // A range has two ways to rot, and losing one bound is the quiet one: the
    // list still looks scoped and still excludes half the offenders.
    const only = (op: string) => (view.filter ?? []).filter(
      (r: AnyRec) => r.field !== 'close_date' || r.operator === op,
    );
    const noUpper: AnyRec[] = await api.object('crm_opportunity').find({
      where: whereFromViewFilter(only('greater_than_or_equal')),
    });
    expect(noUpper.map((r) => r.close_date)).toContain(nextYearDay);
    expect(noUpper.map((r) => r.close_date)).not.toContain(lastYearDay);

    const noLower: AnyRec[] = await api.object('crm_opportunity').find({
      where: whereFromViewFilter(only('less_than_or_equal')),
    });
    expect(noLower.map((r) => r.close_date)).toContain(lastYearDay);
    expect(noLower.map((r) => r.close_date)).not.toContain(nextYearDay);
  });

  it('the empty state is authored and translated in all four locales', () => {
    // Unlike the forecast view's, the seeds here DO qualify for most of a
    // quarter — six deals at `daysFromNow` offsets 11…45. But those offsets run
    // from the install day, so a demo seeded with under 11 days left in the
    // quarter opens this tab on nothing, and a real org meets the same state
    // whenever the quarter's commit slips out. Untranslated, that reads as a
    // broken view rather than an honest zero.
    expect(view.emptyState?.title, 'authored empty-state title').toBeTruthy();
    expect(view.emptyState?.message, 'authored empty-state message').toBeTruthy();
    const missing: string[] = [];
    for (const [locale, pack] of localePacks) {
      const t = pack.objects?.crm_opportunity?._views?.closing_this_quarter?.emptyState;
      if (!t?.title) missing.push(`${locale}: title`);
      if (!t?.message) missing.push(`${locale}: message`);
    }
    expect(missing, `untranslated empty-state copy:\n  ${missing.join('\n  ')}`).toEqual([]);
  });
});

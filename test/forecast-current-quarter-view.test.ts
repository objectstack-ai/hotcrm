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
 * This file does not take that on faith. The RUNTIME block below runs the
 * shipped filter through a real engine on the pinned 17.0.0-rc.2 and pins a
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
 * `crm_opportunity.closing_this_quarter` was found BY this guard on the run
 * that introduced it: labelled "Closing This Quarter" in all four locales with
 * no `close_date` condition of any kind, so it returns deals closing next year.
 * It is a different object and a different view from #730's, and it needs a
 * RANGE (`close_date` between quarter start and end) rather than the equality
 * pin that fits `crm_forecast.period_start` — so it is filed, not folded in.
 */
const KNOWN_DEBT: Record<string, string> = {
  'crm_opportunity.closing_this_quarter': '#743',
};

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
 * Translate a view `filter` (the authored `[{field, operator, value}]` shape)
 * into an engine `where`.
 *
 * Only the operators the shipped view uses are implemented, and an unknown one
 * THROWS rather than being dropped: a silently-dropped condition widens the
 * result set, which is the very failure this file exists to catch. It would
 * turn a red test green.
 */
const whereFromViewFilter = (filter: AnyRec[]): AnyRec => {
  const where: AnyRec = {};
  for (const rule of filter ?? []) {
    if (rule.operator !== 'equals') {
      throw new Error(
        `view filter operator "${rule.operator}" is not implemented by this test's `
        + 'translator — implement it rather than letting the condition vanish',
      );
    }
    where[rule.field] = rule.value;
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

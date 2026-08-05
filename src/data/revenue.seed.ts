// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Revenue seeds — contracts, quotes (and their lines) and forecast snapshots.
 *
 * Split out of the former monolithic `src/data/index.ts` (#635). Seed doctrine
 * lives in `./_shared.ts`.
 */
import { defineSeed } from '@objectstack/spec/data';
import { cel } from '@objectstack/spec';
import { Contract } from '../objects/contract.object';
import { Quote } from '../objects/quote.object';
import { QuoteLineItem } from '../objects/quote_line_item.object';
import { Forecast } from '../objects/forecast.object';
import { linesTotal, type LineSpec } from './_shared';
import { lineItemRecords } from './catalog.seed';
import { OPPORTUNITY_LINES } from './sales.seed';

// ─── Contracts ────────────────────────────────────────────────────────
// `contract_number` is a runtime-owned autonumber and is NOT seeded (#490).
// Contract has no natural-name field, so the (unique, stable) description
// doubles as the upsert identity for these fixtures.
export const contracts = defineSeed(Contract, {
  mode: 'upsert',
  externalId: 'description',
  records: [
    {
      crm_account: 'Acme Corporation',
      crm_contact: 'john.smith@acme.example.com',
      crm_opportunity: 'Acme Platform Upgrade',
      status: 'activated',
      contract_term_months: 12,
      start_date: cel`daysAgo(30)`,
      end_date: cel`daysFromNow(335)`,
      contract_value: 150000,
      billing_frequency: 'annually',
      payment_terms: 'net_30',
      auto_renewal: true,
      renewal_notice_days: 60,
      contract_type: 'subscription',
      signed_date: cel`daysAgo(32)`,
      signed_by: 'John Smith',
      description: 'Annual platform subscription with premium support tier.',
    },
    {
      crm_account: 'Wayne Enterprises',
      crm_contact: 'rwilson@wayne.example.com',
      crm_opportunity: 'Wayne Enterprise License',
      status: 'in_approval',
      contract_term_months: 36,
      start_date: cel`daysFromNow(14)`,
      end_date: cel`daysFromNow(1109)`,
      contract_value: 1200000,
      billing_frequency: 'annually',
      payment_terms: 'net_60',
      auto_renewal: false,
      renewal_notice_days: 90,
      contract_type: 'license',
      description: 'Multi-year enterprise license with custom SLA.',
    },
    {
      crm_account: 'Initech Solutions',
      crm_contact: 'mchen@initech.example.com',
      status: 'expired',
      contract_term_months: 12,
      start_date: cel`daysAgo(400)`,
      end_date: cel`daysAgo(35)`,
      contract_value: 60000,
      billing_frequency: 'quarterly',
      payment_terms: 'net_30',
      auto_renewal: false,
      renewal_notice_days: 30,
      contract_type: 'service',
      signed_date: cel`daysAgo(405)`,
      signed_by: 'Michael Chen',
      description: 'Initial service agreement, pending renewal discussion.',
    },
    {
      crm_account: 'Stark Medical',
      crm_contact: 'emily.d@starkmed.example.com',
      status: 'draft',
      contract_term_months: 24,
      start_date: cel`daysFromNow(30)`,
      end_date: cel`daysFromNow(760)`,
      contract_value: 350000,
      billing_frequency: 'monthly',
      payment_terms: 'net_30',
      auto_renewal: true,
      renewal_notice_days: 60,
      contract_type: 'partnership',
      description: 'Healthcare partnership agreement, currently under legal review.',
    },
  ]
});

// ─── Quotes ───────────────────────────────────────────────────────────
// `quote_number` is a runtime-owned autonumber and is NOT seeded (#490);
// the (unique) quote name is the upsert identity instead.
/**
 * Quote line items, keyed by quote name. The four quotes generated from a deal
 * carry that deal's configuration verbatim — which is exactly what the
 * `quote_generation` flow does when it clones opportunity lines onto a quote.
 */
const QUOTE_LINES: Record<string, readonly LineSpec[]> = {
  'Acme Platform Upgrade Quote': OPPORTUNITY_LINES['Acme Platform Upgrade'],
  'Globex Manufacturing Suite Proposal': OPPORTUNITY_LINES['Globex Manufacturing Suite'],
  'Wayne Enterprise License Quote': OPPORTUNITY_LINES['Wayne Enterprise License'],
  'Initech Cloud Migration Estimate': OPPORTUNITY_LINES['Initech Cloud Migration'],
  // Quoted standalone, before any opportunity existed — and then rejected.
  'Stark Medical Pilot Quote': [
    { product: 'Admin Training Workshop', quantity: 5, unit_price: 6000, description: 'Five workshop days for the pilot clinical teams.' },
    { product: 'Standard Support', quantity: 1, unit_price: 9000, description: 'Standard support for the pilot term.' },
    { product: 'AI Agent Seat (Annual)', quantity: 6, unit_price: 1000, description: 'Agent seats for the pilot coordinators.' },
  ],
};

/**
 * `subtotal` / `discount_amount` / `total_price` for a quote, derived from its
 * lines with `quote_total_rollup`'s own model:
 *
 *   subtotal        = Σ line (quantity × unit_price × (1 − line_discount/100))
 *   discount_amount = subtotal × quote.discount%
 *   total_price     = subtotal − discount_amount + tax + shipping_handling
 *
 * Quote-level `tax` and `shipping_handling` stay manual inputs — the rollup
 * does not derive them either. Everything the rollup DOES own is computed here
 * so that the first edit to a seeded line item recomputes the same numbers
 * instead of visibly correcting them.
 */
const quoteTotals = (
  quoteName: string,
  opts: { discount: number; tax: number; shipping_handling: number },
) => {
  const lines = QUOTE_LINES[quoteName];
  if (!lines) throw new Error(`Seed error: no line items authored for quote "${quoteName}"`);
  const subtotal = linesTotal(lines);
  const discount_amount = Math.round(subtotal * (opts.discount / 100) * 100) / 100;
  const total_price =
    Math.round((subtotal - discount_amount + opts.tax + opts.shipping_handling) * 100) / 100;
  return {
    subtotal,
    discount: opts.discount,
    discount_amount,
    tax: opts.tax,
    shipping_handling: opts.shipping_handling,
    total_price,
  };
};

export const quotes = defineSeed(Quote, {
  mode: 'upsert',
  externalId: 'name',
  records: [
    {
      name: 'Acme Platform Upgrade Quote',
      crm_account: 'Acme Corporation',
      crm_contact: 'john.smith@acme.example.com',
      crm_opportunity: 'Acme Platform Upgrade',
      status: 'accepted',
      quote_date: cel`daysAgo(45)`,
      expiration_date: cel`daysAgo(15)`,
      ...quoteTotals('Acme Platform Upgrade Quote', { discount: 10, tax: 11475, shipping_handling: 0 }),
      payment_terms: 'net_30',
      description: 'Platform upgrade with 10% loyalty discount applied.',
    },
    {
      name: 'Globex Manufacturing Suite Proposal',
      crm_account: 'Globex Industries',
      crm_contact: 'sarah.j@globex.example.com',
      crm_opportunity: 'Globex Manufacturing Suite',
      status: 'presented',
      quote_date: cel`daysAgo(7)`,
      expiration_date: cel`daysFromNow(23)`,
      ...quoteTotals('Globex Manufacturing Suite Proposal', { discount: 5, tax: 38000, shipping_handling: 2500 }),
      payment_terms: 'net_60',
      description: 'Manufacturing suite licensing with implementation services.',
    },
    {
      name: 'Wayne Enterprise License Quote',
      crm_account: 'Wayne Enterprises',
      crm_contact: 'rwilson@wayne.example.com',
      crm_opportunity: 'Wayne Enterprise License',
      status: 'in_review',
      quote_date: cel`daysAgo(3)`,
      expiration_date: cel`daysFromNow(27)`,
      ...quoteTotals('Wayne Enterprise License Quote', { discount: 15, tax: 81600, shipping_handling: 0 }),
      payment_terms: 'net_60',
      description: 'Multi-year enterprise license with volume discount.',
    },
    {
      name: 'Initech Cloud Migration Estimate',
      crm_account: 'Initech Solutions',
      crm_contact: 'mchen@initech.example.com',
      crm_opportunity: 'Initech Cloud Migration',
      status: 'draft',
      quote_date: cel`daysAgo(1)`,
      expiration_date: cel`daysFromNow(29)`,
      ...quoteTotals('Initech Cloud Migration Estimate', { discount: 0, tax: 6400, shipping_handling: 0 }),
      payment_terms: 'net_30',
      description: 'Cloud migration services, awaiting internal review.',
    },
    {
      name: 'Stark Medical Pilot Quote',
      crm_account: 'Stark Medical',
      crm_contact: 'emily.d@starkmed.example.com',
      status: 'rejected',
      quote_date: cel`daysAgo(60)`,
      expiration_date: cel`daysAgo(30)`,
      ...quoteTotals('Stark Medical Pilot Quote', { discount: 0, tax: 3600, shipping_handling: 0 }),
      payment_terms: 'net_30',
      description: 'Pilot project quote, rejected due to budget constraints.',
      internal_notes: 'Customer requested re-quote with smaller scope.',
    },
  ]
});

// ─── Quote line items ─────────────────────────────────────────────────
// Same composite-key reasoning as the opportunity lines above: (quote,
// product) is the only natural key this junction-shaped object has.
export const quoteLineItems = defineSeed(QuoteLineItem, {
  mode: 'upsert',
  externalId: ['crm_quote', 'crm_product'],
  // `tax_rate` is deliberately left at its 0 default: in this app tax is a
  // QUOTE-level figure (`crm_quote.tax`, applied after the quote-level
  // discount) and `quote_total_rollup` ignores the per-line rate entirely.
  // Seeding a rate here would put a second, contradictory tax number on the
  // record.
  records: lineItemRecords('crm_quote', QUOTE_LINES),
});

// ─── Forecasts ────────────────────────────────────────────────────────
// `owner_id` is left unset: a seed cannot name a user and seed writes run
// `isSystem`, so nothing stamps it — ownership is backfilled by
// `demo_bootstrap`, which claims `crm_forecast` alongside the other
// owner-scoped objects (#702). See the note at the foot of `src/data/index.ts`.
//
// ─── ONE PRODUCER PER WINDOW (#702) ───────────────────────────────────
//
// `forecast_snapshot` (#590) upserts the row whose window contains today, and
// its lookup is OWNER-SCOPED:
//
//     { owner_id: '{currentOwner.id}', period: 'quarter',
//       period_start: { $lte: '{TODAY()}' }, period_end: { $gte: '{TODAY()}' } }
//
// A seeded row in that same window can never satisfy that filter at the moment
// the sweep reads it — the seed writes no owner, and the claim is a separate,
// later sweep — so the flow concludes the period is missing and opens a SECOND
// row beside it. Both span the same quarter; one has an owner and one does not.
// Every owner-grouped consumer then renders a phantom, ownerless duplicate for
// the current quarter, on every re-seeded dev boot (`quota_attainment_by_rep`
// most visibly, since it pins exactly that window).
//
// Claiming the row does not fix that, it only re-labels the phantom: whichever
// of the two scheduled sweeps reaches the window first decides whether the
// second one adopts the row or duplicates it, and a duplicate never heals.
//
// So the seeds stop at the window's edge. They ship SETTLED quarters only, plus
// the current MONTH — a window no runtime writer touches, since the sweep's
// period is fixed to `quarter`. The current quarter belongs to
// `forecast_snapshot` alone. `test/forecast-seeds.test.ts` derives the
// forbidden window from the flow's own lookup filter and fails on any seeded
// row that lands inside it.
//
// The cost, stated rather than hidden: on a freshly seeded org the Sales
// dashboard's *Quota Attainment by Rep* table is empty until the 03:00 sweep
// opens the quarter's rows, and their `quota` stays blank until someone sets
// one by hand (`quota` has no automated writer — see `forecast.object.ts`).
// That is the same honest-empty state the widget already chooses at a quarter
// boundary; the alternative was a row attributed to nobody, carrying a quota no
// rep is on the hook for.
//
// Periods are REAL calendar periods, labelled exactly the way
// forecast.hook.ts derives them ('Q3 2026' / 'Aug 2026') — hooks don't run
// over seeds, and the hook only fills a BLANK period_label, so seeded rows
// must speak the same dialect as runtime snapshots or list views end up
// mixing 'This Quarter' with 'Q3 2026' (#490). Calendar-true period_start
// values also make the `this_quarter_forecasts` view's
// `{this_quarter_start}` filter actually match the seeded row.
//
// Computed in plain TS (UTC, mirroring the hook's helpers): this module is
// evaluated when the app bundle loads, the same moment the cel`...` seeds
// are resolved.
const FORECAST_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const forecastIsoDate = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
const forecastQuarterLabel = (d: Date) => `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${d.getUTCFullYear()}`;
const forecastMonthLabel = (d: Date) => `${FORECAST_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const forecastNow = new Date();
const forecastYear = forecastNow.getUTCFullYear();
const forecastMonth = forecastNow.getUTCMonth();
const forecastQuarterMonth = Math.floor(forecastMonth / 3) * 3;
// No `thisQuarterStart` / `thisQuarterEnd`: that window is `forecast_snapshot`'s
// and nothing here may open a row in it (#702, note above).
const thisMonthStart = new Date(Date.UTC(forecastYear, forecastMonth, 1));
const thisMonthEnd = new Date(Date.UTC(forecastYear, forecastMonth + 1, 0));
const lastQuarterStart = new Date(Date.UTC(forecastYear, forecastQuarterMonth - 3, 1));
const lastQuarterEnd = new Date(Date.UTC(forecastYear, forecastQuarterMonth, 0));
// Deeper history: quota-attainment and coverage trends need more than a single
// prior period to plot (#591). These are all SETTLED periods — deliberately so:
// the forecast snapshot sweep upserts the CURRENT quarter, so historical rows
// can never collide with what it writes. That rule is now the whole rule for
// quarters (#702): every quarterly seed below is settled.
const quarterStartAgo = (n: number) => new Date(Date.UTC(forecastYear, forecastQuarterMonth - 3 * n, 1));
const quarterEndAgo = (n: number) => new Date(Date.UTC(forecastYear, forecastQuarterMonth - 3 * (n - 1), 0));
const monthStartAgo = (n: number) => new Date(Date.UTC(forecastYear, forecastMonth - n, 1));
const monthEndAgo = (n: number) => new Date(Date.UTC(forecastYear, forecastMonth - n + 1, 0));

/** A settled (past) period snapshot: pipeline is gone, only the closed number remains. */
const closedPeriod = (
  seed_key: string,
  period: 'month' | 'quarter',
  start: Date,
  end: Date,
  quota: number,
  closed: number,
  notes: string,
) => ({
  seed_key,
  period,
  period_label: period === 'quarter' ? forecastQuarterLabel(start) : forecastMonthLabel(start),
  period_start: forecastIsoDate(start),
  period_end: forecastIsoDate(end),
  snapshot_date: forecastIsoDate(end),
  quota,
  pipeline_amount: 0,
  best_case_amount: 0,
  commit_amount: 0,
  closed_amount: closed,
  source: 'scheduled' as const,
  notes,
});

// Upsert identity is the synthetic `seed_key`, NOT `period_label` (#613).
// `period_label` names a SET of rows once the forecast_snapshot sweep (#590)
// writes one per active owner per quarter — all reading 'Q3 2026' — and the
// loader matches against the whole table, so a re-seed could overwrite a real
// rep's snapshot with the demo numbers. Why a synthetic key and not the true
// (owner, period, period_start) identity or an insert-once mode: see the
// `seed_key` declaration in `src/objects/forecast.object.ts`.
//
// The keys are POSITIONAL ('current month', 'two quarters back'), not calendar
// values, because the records are positional — recomputed against `new Date()`
// on every import. A positional key keeps the demo at exactly these seven rows
// as the calendar rolls forward, re-pointing each at its new period; a
// calendar-derived key would strand last quarter's demo row and add one row per
// re-seed.
//
// There is no `demo_quarter_current`: the current quarter is the one window
// `forecast_snapshot` writes, and two producers in one window is what #702 was.
// The current MONTH stays — the sweep's period is `quarter`, so no runtime
// writer opens a monthly row.
export const forecasts = defineSeed(Forecast, {
  mode: 'upsert',
  externalId: 'seed_key',
  records: [
    {
      seed_key: 'demo_month_current',
      period: 'month',
      period_label: forecastMonthLabel(thisMonthStart),
      period_start: forecastIsoDate(thisMonthStart),
      period_end: forecastIsoDate(thisMonthEnd),
      snapshot_date: cel`today()`,
      quota: 500000,
      pipeline_amount: 760000,
      best_case_amount: 540000,
      commit_amount: 360000,
      closed_amount: 295000,
      source: 'scheduled',
      notes: 'Healthy coverage; two commit deals expected to close this week.',
    },
    {
      seed_key: 'demo_quarter_minus_1',
      period: 'quarter',
      period_label: forecastQuarterLabel(lastQuarterStart),
      period_start: forecastIsoDate(lastQuarterStart),
      period_end: forecastIsoDate(lastQuarterEnd),
      snapshot_date: forecastIsoDate(lastQuarterEnd),
      quota: 1400000,
      pipeline_amount: 0,
      best_case_amount: 0,
      commit_amount: 0,
      closed_amount: 1485000,
      source: 'scheduled',
      notes: 'Closed at 106% of quota.',
    },
    closedPeriod('demo_quarter_minus_2', 'quarter', quarterStartAgo(2), quarterEndAgo(2), 1300000, 1196000,
      'Closed at 92% of quota — two enterprise deals slipped into the next quarter.'),
    closedPeriod('demo_quarter_minus_3', 'quarter', quarterStartAgo(3), quarterEndAgo(3), 1200000, 1308000,
      'Closed at 109% of quota, carried by the enterprise renewal cohort.'),
    closedPeriod('demo_quarter_minus_4', 'quarter', quarterStartAgo(4), quarterEndAgo(4), 1100000, 1045000,
      'Closed at 95% of quota in the first quarter on the new territory model.'),
    closedPeriod('demo_month_minus_1', 'month', monthStartAgo(1), monthEndAgo(1), 480000, 505000,
      'Closed at 105% of quota; the expansion motion covered a soft new-business month.'),
    closedPeriod('demo_month_minus_2', 'month', monthStartAgo(2), monthEndAgo(2), 460000, 414000,
      'Closed at 90% of quota — summer slowdown across the mid-market segment.'),
  ]
});

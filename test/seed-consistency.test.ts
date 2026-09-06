// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from '../objectstack.config';
import { CrmSeedData } from '../src/data/index';
import { CASE_SLA_DEFAULT_TIER, caseSlaHours } from '../src/objects/_case-sla';

/**
 * Seed ↔ hook consistency guards (#591).
 *
 * Every seeded value of a hook-owned field has to already BE what the hook
 * would compute. When it isn't, nothing fails at boot: the demo just carries a
 * number that the first genuine user edit silently rewrites (#490). That holds
 * whichever way the open question in #617 lands — if hooks do fire over seed
 * writes the parent is recomputed to the same figure, and if they don't the
 * figure has to be right on arrival.
 *
 * That makes the arithmetic below the only enforcement there is. Each block
 * re-derives a hook's own computation from the seed data and asserts the
 * seeded parent matches:
 *
 *   - `opportunity_amount_rollup`  → opportunity.amount
 *   - `quote_total_rollup`         → quote subtotal / discount_amount / total_price
 *   - the four #597 refresh hooks  → the campaign num_* / actual_revenue block
 *   - `_line-item-price-fill`      → line list_price
 *   - `lead.hook` whole-star rounding, and the product cost/price rule
 *
 * The seed module derives most of these by construction; these tests pin that
 * a future hand-typed value cannot quietly reintroduce the drift.
 */

type Rec = Record<string, any>;
type Dataset = { object: string; externalId: string | string[]; mode: string; records: Rec[] };

const datasets = CrmSeedData as unknown as Dataset[];
const setsFor = (object: string) => datasets.filter((d) => d.object === object);
const one = (object: string): Dataset => {
  const found = setsFor(object);
  expect(found.length, `expected exactly one seed dataset for ${object}`).toBe(1);
  return found[0];
};
const recordsOf = (object: string): Rec[] => setsFor(object).flatMap((d) => d.records);

const accounts = one('crm_account').records;
const leads = one('crm_lead').records;
const contacts = one('crm_contact').records;
const products = one('crm_product').records;
const opportunities = one('crm_opportunity').records;
const campaigns = one('crm_campaign').records;
const quotes = one('crm_quote').records;
const oppLines = recordsOf('crm_opportunity_line_item');
const quoteLines = recordsOf('crm_quote_line_item');
const members = recordsOf('crm_campaign_member');

const round2 = (n: number) => Math.round(n * 100) / 100;
/** The rollup hooks' extended-price expression, recomputed from raw stored fields. */
const extended = (l: Rec) =>
  (Number(l.quantity) || 0) * (Number(l.unit_price) || 0) * (1 - (Number(l.discount) || 0) / 100);
const sumLines = (lines: Rec[]) => round2(lines.reduce((s, l) => s + extended(l), 0));

const byName = <T extends Rec>(rows: T[], key = 'name') =>
  new Map(rows.map((r) => [String(r[key]), r]));

const productByName = byName(products);
const opportunityByName = byName(opportunities);
const quoteByName = byName(quotes);
const campaignByName = byName(campaigns);

describe('the seed datasets cover the child objects at all (#591)', () => {
  it('ships line items, quote lines and campaign members', () => {
    expect(oppLines.length, 'no crm_opportunity_line_item seeds').toBeGreaterThan(0);
    expect(quoteLines.length, 'no crm_quote_line_item seeds').toBeGreaterThan(0);
    expect(members.length, 'no crm_campaign_member seeds').toBeGreaterThan(0);
  });

  it('itemises a clear majority of the seeded opportunities', () => {
    const itemised = new Set(oppLines.map((l) => String(l.crm_opportunity)));
    expect(
      itemised.size * 2,
      `only ${itemised.size} of ${opportunities.length} opportunities have a Products list`,
    ).toBeGreaterThan(opportunities.length);
  });

  it('gives at least one quote a line-item breakdown', () => {
    expect(new Set(quoteLines.map((l) => String(l.crm_quote))).size).toBeGreaterThanOrEqual(1);
  });

  it('gives every campaign that reports members an enrolled membership', () => {
    const enrolled = new Set(members.map((m) => String(m.crm_campaign)));
    const claiming = campaigns.filter((c) => Number(c.num_sent) > 0).map((c) => String(c.name));
    expect(claiming.length, 'no campaign reports a non-zero num_sent').toBeGreaterThan(0);
    expect(claiming.filter((name) => !enrolled.has(name))).toEqual([]);
  });
});

describe('child seeds resolve to real parents', () => {
  it.each([
    ['crm_opportunity_line_item', oppLines, 'crm_opportunity', () => opportunityByName],
    ['crm_quote_line_item', quoteLines, 'crm_quote', () => quoteByName],
  ])('%s rows point at a seeded %s and a seeded product', (_o, lines, parentField, parents) => {
    const dangling = lines.filter((l) => !parents().has(String(l[parentField])));
    expect(dangling.map((l) => String(l[parentField]))).toEqual([]);
    const unknownProduct = lines.filter((l) => !productByName.has(String(l.crm_product)));
    expect(unknownProduct.map((l) => String(l.crm_product))).toEqual([]);
  });

  it('campaign members point at a seeded campaign and exactly one seeded lead or contact', () => {
    const leadEmails = new Set(leads.map((l) => String(l.email)));
    const contactEmails = new Set(contacts.map((c) => String(c.email)));
    const problems: string[] = [];
    for (const m of members) {
      if (!campaignByName.has(String(m.crm_campaign))) {
        problems.push(`unknown campaign ${String(m.crm_campaign)}`);
      }
      const hasLead = typeof m.crm_lead === 'string' && m.crm_lead !== '';
      const hasContact = typeof m.crm_contact === 'string' && m.crm_contact !== '';
      // `lead_or_contact_required` needs one; the composite seed key needs
      // exactly one (a row carrying both lands in both datasets' key space).
      if (hasLead === hasContact) {
        problems.push(`member of ${String(m.crm_campaign)} sets ${hasLead ? 'both' : 'neither'} lead and contact`);
      }
      if (hasLead && !leadEmails.has(String(m.crm_lead))) problems.push(`unknown lead ${String(m.crm_lead)}`);
      if (hasContact && !contactEmails.has(String(m.crm_contact))) {
        problems.push(`unknown contact ${String(m.crm_contact)}`);
      }
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });

  it('opportunities attribute themselves to seeded campaigns', () => {
    const bad = opportunities
      .filter((o) => o.crm_campaign != null && !campaignByName.has(String(o.crm_campaign)))
      .map((o) => `${String(o.name)} → ${String(o.crm_campaign)}`);
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('accounts referenced by opportunities exist', () => {
    const names = new Set(accounts.map((a) => String(a.name)));
    const bad = opportunities.filter((o) => !names.has(String(o.crm_account))).map((o) => String(o.name));
    expect(bad, bad.join('\n')).toEqual([]);
  });
});

describe('composite natural keys are usable as upsert identity', () => {
  /**
   * The loader joins composite key parts and yields an EMPTY key if any part is
   * blank — no dedupe, so a replay boot re-inserts the whole dataset
   * (framework#3434). Both conditions below have to hold for `mode: 'upsert'`
   * to mean anything on these junction-shaped objects.
   */
  it.each([
    ['crm_opportunity_line_item'],
    ['crm_quote_line_item'],
    ['crm_campaign_member'],
  ])('%s datasets key on a composite whose parts are always populated and unique', (object) => {
    const sets = setsFor(object);
    expect(sets.length, `${object} has no seed dataset`).toBeGreaterThan(0);
    for (const ds of sets) {
      expect(Array.isArray(ds.externalId), `${object} needs a composite externalId`).toBe(true);
      const fields = ds.externalId as string[];
      const keys = ds.records.map((r) => fields.map((f) => String(r[f] ?? '')).join('\u0000'));
      const blank = keys.filter((k) => k.split('\u0000').some((part) => part === ''));
      expect(blank.length, `${object}: ${blank.length} rows have a blank key part (${fields.join('+')})`).toBe(0);
      const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
      expect(dupes, `${object}: duplicate ${fields.join('+')} keys would clobber each other`).toEqual([]);
    }
  });
});

describe('opportunity_amount_rollup would be a no-op over the seeds', () => {
  it('every itemised opportunity amount equals the sum of its lines', () => {
    const drift: string[] = [];
    for (const [name, opp] of opportunityByName) {
      const lines = oppLines.filter((l) => String(l.crm_opportunity) === name);
      if (lines.length === 0) continue;
      const rolled = sumLines(lines);
      if (round2(Number(opp.amount)) !== rolled) {
        drift.push(`${name}: seeded amount ${String(opp.amount)}, lines roll up to ${rolled}`);
      }
    }
    expect(drift, drift.join('\n')).toEqual([]);
  });

  it('every amount is positive (the amount_positive validation)', () => {
    const bad = opportunities.filter((o) => !(Number(o.amount) > 0)).map((o) => String(o.name));
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('probability and expected_revenue still match opportunity.hook stage math', () => {
    const STAGE_PROBABILITY: Record<string, number> = {
      prospecting: 10, qualification: 25, needs_analysis: 40,
      proposal: 60, negotiation: 80, closed_won: 100, closed_lost: 0,
    };
    const drift: string[] = [];
    for (const o of opportunities) {
      const prob = STAGE_PROBABILITY[String(o.stage)];
      expect(prob, `unknown stage ${String(o.stage)} on ${String(o.name)}`).toBeDefined();
      if (Number(o.probability) !== prob) {
        drift.push(`${String(o.name)}: probability ${String(o.probability)}, stage implies ${prob}`);
      }
      // opportunity.hook.ts: Math.round(amount * probability) / 100
      const expected = Math.round(Number(o.amount) * prob) / 100;
      if (Number(o.expected_revenue) !== expected) {
        drift.push(`${String(o.name)}: expected_revenue ${String(o.expected_revenue)}, hook computes ${expected}`);
      }
    }
    expect(drift, drift.join('\n')).toEqual([]);
  });
});

describe('quote_total_rollup would be a no-op over the seeds', () => {
  it('subtotal, discount_amount and total_price follow the rollup model', () => {
    const drift: string[] = [];
    for (const [name, quote] of quoteByName) {
      const lines = quoteLines.filter((l) => String(l.crm_quote) === name);
      if (lines.length === 0) continue;
      const subtotal = sumLines(lines);
      const discountAmount = round2(subtotal * (Number(quote.discount) || 0) / 100);
      const total = round2(
        subtotal - discountAmount + (Number(quote.tax) || 0) + (Number(quote.shipping_handling) || 0),
      );
      if (round2(Number(quote.subtotal)) !== subtotal) {
        drift.push(`${name}: subtotal ${String(quote.subtotal)}, lines roll up to ${subtotal}`);
      }
      if (round2(Number(quote.discount_amount)) !== discountAmount) {
        drift.push(`${name}: discount_amount ${String(quote.discount_amount)}, rollup computes ${discountAmount}`);
      }
      if (round2(Number(quote.total_price)) !== total) {
        drift.push(`${name}: total_price ${String(quote.total_price)}, rollup computes ${total}`);
      }
    }
    expect(drift, drift.join('\n')).toEqual([]);
  });
});

describe('line items carry what the price-fill hook would have stamped', () => {
  const allLines = [...oppLines, ...quoteLines];

  it('list_price equals the catalog price of the referenced product', () => {
    const drift = allLines
      .filter((l) => Number(l.list_price) !== Number(productByName.get(String(l.crm_product))?.list_price))
      .map((l) => `${String(l.crm_product)}: list_price ${String(l.list_price)}`);
    expect(drift, drift.join('\n')).toEqual([]);
  });

  it('unit_price is never negative (the unit_price_positive validation)', () => {
    expect(allLines.filter((l) => Number(l.unit_price) < 0)).toEqual([]);
  });

  it('discount stays inside the declared 0–100 percent range', () => {
    const bad = allLines.filter((l) => Number(l.discount) < 0 || Number(l.discount) > 100);
    expect(bad).toEqual([]);
  });

  it('quantity is positive and line numbers are 1..n within each parent', () => {
    expect(allLines.filter((l) => !(Number(l.quantity) > 0))).toEqual([]);
    const groups = new Map<string, number[]>();
    for (const l of allLines) {
      const parent = String(l.crm_opportunity ?? l.crm_quote);
      groups.set(parent, [...(groups.get(parent) ?? []), Number(l.line_number)]);
    }
    const bad: string[] = [];
    for (const [parent, numbers] of groups) {
      const sorted = [...numbers].sort((a, b) => a - b);
      const expected = numbers.map((_, i) => i + 1);
      if (JSON.stringify(sorted) !== JSON.stringify(expected)) {
        bad.push(`${parent}: line numbers ${sorted.join(',')}`);
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
});

// Since #597 the campaign metric block is owned by FOUR refresh hooks, not by
// one completion-time snapshot: `campaign_metrics_refresh`,
// `campaign_attribution_refresh` and `campaign_lead_conversion_refresh` in
// `campaign.hook.ts`, plus `campaign_member_metrics_refresh` in
// `campaign_member.hook.ts`. All four reach the same inlined recompute, and it
// is that one arithmetic the block below re-derives from the seed rows.
describe('the campaign metric refresh would be a no-op over the seeds', () => {
  it('every campaign metric equals what the hook recomputes from members and attributed deals', () => {
    const drift: string[] = [];
    for (const campaign of campaigns) {
      const name = String(campaign.name);
      const enrolled = members.filter((m) => String(m.crm_campaign) === name);
      const leadIds = new Set(
        enrolled.map((m) => m.crm_lead).filter((v): v is string => typeof v === 'string' && v !== ''),
      );
      const convertedLeads = leads.filter(
        (l) => leadIds.has(String(l.email)) && l.is_converted === true,
      ).length;
      const attributed = opportunities.filter((o) => String(o.crm_campaign ?? '') === name);
      const won = attributed.filter((o) => String(o.stage) === 'closed_won');
      const expected: Record<string, number> = {
        num_sent: enrolled.length,
        num_responses: enrolled.filter((m) => String(m.status) === 'responded').length,
        num_leads: leadIds.size,
        num_converted_leads: convertedLeads,
        num_opportunities: attributed.length,
        num_won_opportunities: won.length,
        actual_revenue: won.reduce((s, o) => s + (Number(o.amount) || 0), 0),
      };
      for (const [field, value] of Object.entries(expected)) {
        if (Number(campaign[field] ?? 0) !== value) {
          drift.push(`${name}.${field}: seeded ${String(campaign[field])}, hook computes ${value}`);
        }
      }
    }
    expect(drift, drift.join('\n')).toEqual([]);
  });

  it('at least one campaign shows a non-zero ROI and response rate out of the box', () => {
    // The two campaign formulas: roi needs actual_cost > 0 with revenue on top,
    // response_rate needs num_sent > 0 with responses.
    const withRoi = campaigns.filter(
      (c) => Number(c.actual_cost) > 0 && Number(c.actual_revenue) > Number(c.actual_cost),
    );
    expect(withRoi.length, 'every campaign would render ROI 0% or negative').toBeGreaterThan(0);
    const withResponses = campaigns.filter((c) => Number(c.num_sent) > 0 && Number(c.num_responses) > 0);
    expect(withResponses.length, 'no campaign would render a response rate').toBeGreaterThan(0);
  });

  it('completed campaigns are the ones whose metrics have something to count', () => {
    // Not a completion-time snapshot any more — the refresh runs on every
    // input change. A completed campaign with no membership would mean its
    // metric block had nothing to count on any of those runs.
    const completed = campaigns.filter((c) => String(c.status) === 'completed');
    expect(completed.length, 'no completed campaign to carry the ROI narrative').toBeGreaterThan(0);
    for (const c of completed) {
      expect(Number(c.num_sent), `${String(c.name)} completed with no members`).toBeGreaterThan(0);
    }
  });

  it('campaign date ranges satisfy campaign_validation and end_after_start', () => {
    // `in_progress` requires both dates; a campaign cannot end on or before it
    // starts. Both are expressed as cel macros, so compare the macro arguments
    // on the shared `daysAgo`/`daysFromNow` day axis.
    const dayOffset = (v: any): number | undefined => {
      const source = typeof v === 'string' ? v : v?.source;
      if (typeof source !== 'string') return undefined;
      const ago = source.match(/daysAgo\((\d+)\)/);
      if (ago) return -Number(ago[1]);
      const ahead = source.match(/daysFromNow\((\d+)\)/);
      if (ahead) return Number(ahead[1]);
      return undefined;
    };
    const problems: string[] = [];
    for (const c of campaigns) {
      const start = dayOffset(c.start_date);
      const end = dayOffset(c.end_date);
      if (start === undefined || end === undefined) {
        problems.push(`${String(c.name)}: unparsable date range`);
        continue;
      }
      if (end <= start) problems.push(`${String(c.name)}: end_date is not after start_date`);
      // A campaign that is running must have started.
      if (String(c.status) === 'in_progress' && start > 0) {
        problems.push(`${String(c.name)}: in_progress but starts in ${start} days`);
      }
      if (String(c.status) === 'completed' && end > 0) {
        problems.push(`${String(c.name)}: completed but ends in ${end} days`);
      }
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });
});

describe('campaign members only use lifecycle values a writer produces (#597)', () => {
  const LIVE_STATUSES = new Set(['sent', 'responded', 'converted', 'unsubscribed']);
  /** Response fields with no writer anywhere in the app — being trimmed under #597. */
  const UNWRITTEN_FIELDS = ['first_opened_date', 'first_clicked_date'];

  it('never seeds an opened / clicked / bounced status', () => {
    const bad = members.filter((m) => !LIVE_STATUSES.has(String(m.status))).map((m) => String(m.status));
    expect(bad, `statuses no writer produces: ${bad.join(', ')}`).toEqual([]);
  });

  it('never seeds a response field that nothing maintains', () => {
    const bad = members.flatMap((m) => UNWRITTEN_FIELDS.filter((f) => m[f] !== undefined));
    expect(bad, `fields with no writer: ${[...new Set(bad)].join(', ')}`).toEqual([]);
  });

  it('has_responded and response_date track the responded status exactly', () => {
    const problems: string[] = [];
    for (const m of members) {
      const responded = String(m.status) === 'responded';
      if (Boolean(m.has_responded) !== responded) {
        problems.push(`${String(m.crm_campaign)}: has_responded ${String(m.has_responded)} for status ${String(m.status)}`);
      }
      if (responded && m.response_date == null) {
        problems.push(`${String(m.crm_campaign)}: responded member without a response_date`);
      }
      if (!responded && m.response_date != null) {
        problems.push(`${String(m.crm_campaign)}: response_date on a ${String(m.status)} member`);
      }
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });

  it('every member carries an added_date (the enrollment stamp)', () => {
    expect(members.filter((m) => m.added_date == null)).toEqual([]);
  });
});

describe('seed values respect the remaining field contracts', () => {
  it('every lead rating is a whole star between 1 and 5', () => {
    // lead.hook.ts rounds its computed score because "half values rendered
    // inconsistently in the star widget", and it leaves an explicit rating
    // alone — so a fractional seed is a value the contract cannot produce.
    const bad = leads
      .filter((l) => l.rating != null)
      .filter((l) => !Number.isInteger(l.rating) || Number(l.rating) < 1 || Number(l.rating) > 5)
      .map((l) => `${String(l.email)}: ${String(l.rating)}`);
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('every product costs less than it sells for, and has a unique SKU', () => {
    const bad = products
      .filter((p) => p.cost != null && Number(p.cost) >= Number(p.list_price))
      .map((p) => `${String(p.name)}: cost ${String(p.cost)} >= list ${String(p.list_price)}`);
    expect(bad, bad.join('\n')).toEqual([]);
    const skus = products.map((p) => String(p.sku ?? ''));
    expect(skus.filter((s) => s === ''), 'every product needs an SKU').toEqual([]);
    expect(skus.filter((s, i) => skus.indexOf(s) !== i), 'duplicate SKUs violate the unique field').toEqual([]);
  });

  it('the catalog is wide enough to configure a realistic deal', () => {
    expect(products.length, 'four products cannot demonstrate a product mix').toBeGreaterThanOrEqual(10);
    expect(new Set(products.map((p) => String(p.category))).size).toBeGreaterThanOrEqual(3);
  });
});

describe('seeded case SLA due dates match the policy matrix (#595)', () => {
  /**
   * `sla_due_date` is a hook-owned field, and hooks do not run over seeds — so
   * the seeded value has to already BE what `case_sla_defaults` would have
   * computed at the case's creation moment: `created_date` plus the
   * priority × account-tier cell, in calendar hours.
   *
   * The seed generator derives these by construction (`celCaseSlaDue` in
   * `src/data/service.seed.ts`). This block is what stops a future hand-typed
   * date — the shape every one of these values used to have — from quietly
   * reintroducing a deadline nobody's policy produces.
   */
  const cases = recordsOf('crm_case');
  const tierOf = new Map(
    accounts.map((a) => [String(a.name), typeof a.tier === 'string' ? a.tier : CASE_SLA_DEFAULT_TIER]),
  );
  /** The CEL source of a seeded expression value, or null for a plain value. */
  const celSource = (v: unknown): string | null =>
    v !== null && typeof v === 'object' && (v as Rec).dialect === 'cel' ? String((v as Rec).source) : null;

  it('seeds enough cases across enough priorities to be worth checking', () => {
    // Guards the guard: an empty or single-priority set would pass vacuously.
    expect(cases.length).toBeGreaterThanOrEqual(30);
    expect(new Set(cases.map((c) => String(c.priority))).size).toBe(4);
  });

  it('gives every seeded case a due date, at every priority', () => {
    // The defect #595 fixed, restated as a property of the demo data: three of
    // four priorities used to be able to carry a blank one.
    const blank = cases
      .filter((c) => c.sla_due_date == null)
      .map((c) => `${String(c.subject)} (${String(c.priority)})`);
    expect(blank, blank.join('\n')).toEqual([]);
  });

  it('derives every due date from created_date + the matrix cell', () => {
    const problems: string[] = [];
    for (const c of cases) {
      const created = celSource(c.created_date);
      const due = celSource(c.sla_due_date);
      const label = `${String(c.subject)} (${String(c.priority)} / ${String(c.crm_account)})`;
      if (!created || !due) {
        problems.push(`${label}: created_date and sla_due_date must both be CEL expressions`);
        continue;
      }
      const age = /^daysAgo\((\d+)\)$/.exec(created);
      if (!age) {
        problems.push(`${label}: created_date is not a daysAgo() expression — ${created}`);
        continue;
      }
      const hours = caseSlaHours(String(c.priority), tierOf.get(String(c.crm_account)));
      if (hours === undefined) {
        problems.push(`${label}: no SLA matrix row for priority "${String(c.priority)}"`);
        continue;
      }
      const expected = `daysAgo(${age[1]}) + duration('${hours}h')`;
      if (due !== expected) problems.push(`${label}: expected \`${expected}\`, seeded \`${due}\``);
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });

  it('never marks a case as breached while its own due date is still ahead of it', () => {
    // `is_sla_violated` is `case_sla_monitor`'s field to write, and the sweep's
    // definition of a breach is "open, and past due". A seed that pre-sets the
    // flag has to satisfy that definition on arrival, or the demo ships a
    // breach the sweep would never have produced. `daysAgo(n)` is a UTC
    // midnight, so a case is UNAMBIGUOUSLY past due when the matrix offset is
    // no longer than its age.
    const problems: string[] = [];
    for (const c of cases.filter((r) => r.is_sla_violated === true)) {
      const age = /^daysAgo\((\d+)\)$/.exec(celSource(c.created_date) ?? '');
      const hours = caseSlaHours(String(c.priority), tierOf.get(String(c.crm_account)));
      const label = `${String(c.subject)} (${String(c.priority)})`;
      if (!age || hours === undefined) {
        problems.push(`${label}: cannot check a breach without a daysAgo() creation and a matrix row`);
        continue;
      }
      if (Number(age[1]) * 24 < hours) {
        problems.push(`${label}: flagged as breached but only ${age[1]}d old against a ${hours}h clock`);
      }
      if (c.status === 'resolved' || c.status === 'closed') {
        problems.push(`${label}: a settled case has met its SLA — the sweep excludes it`);
      }
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });
});

/**
 * A seed can only target an object THIS app declares (#1258).
 *
 * `CrmSeedData` is an array of raw `Seed` values, and `Seed.object` is a plain
 * `z.string()` — so naming a platform `sys_*` table there type-checks, builds,
 * validates, and loads. It just cannot produce a usable row, and every part of
 * the boot reports success while it happens.
 *
 * Measured against 17.1.0 by seeding three `sys_activity` rows for a demo lead
 * — the shape #1258 asked for — and reading the result back out of the running
 * server:
 *
 *   - the rows LAND. `pnpm build` is silent, the boot banner counts them
 *     (`Seeds: … 345 rows`, up from 342), and every column arrives, readonly
 *     ones included: seeds write under `{ isSystem: true }`, which exempts the
 *     static readonly strip, and `sys_activity` declares EVERY field readonly.
 *     `type: 'completed'` is accepted, `cel\`daysAgo(n)\`` resolves, and
 *     `mode: 'upsert'` is accepted even though the object is
 *     `managedBy: 'append-only'`.
 *   - the rows attach to NOTHING. `sys_activity.record_id` is `Field.text()`,
 *     not a lookup, and the loader resolves a natural key only for
 *     `lookup` / `master_detail` fields — every other field is stored verbatim.
 *     So `record_id: 'Lisa Thompson'` is stored as the literal string, while
 *     the seeded lead's id is a runtime nanoid (`tgIjpNhjlfmWU8YF`) that does
 *     not exist until first boot.
 *
 * The consequence, read off the shipped console bundle rather than inferred —
 * `record:activity` queries
 * `sys_activity, { $filter: { object_name, record_id }, $orderby: { timestamp: 'desc' } }`:
 *
 *   filter { object_name: 'crm_lead', record_id: 'tgIjpNhjlfmWU8YF' } → 0 rows
 *   filter { object_name: 'crm_lead', record_id: 'Lisa Thompson'    } → 3 rows
 *
 * The tab stays empty and the seed book looks populated. This is the same
 * failure the ownership note in `src/data/index.ts` records for
 * `owner_id: 'Dev Admin'`, one column over — "a seed cannot name an id that
 * does not exist yet" is the general rule, and reference resolution is the only
 * exemption from it.
 *
 * Two further facts make the route worse, not better, if the id problem were
 * ever solved locally: `sys_activity` is a `lifecycle.class: 'telemetry'`
 * object with `retention: { maxAge: '14d' }` and day-shard rotation (rows live
 * in `sys_activity__r<YYYYMMDD>` behind a view), so a demo narrative older than
 * a fortnight is reaped by design; and the only writers of interaction rows are
 * the `log_call` / `log_meeting` / `send_email` action bodies, so a second
 * producer would be the `crm_forecast` two-producer conflict #702 ruled against.
 *
 * Hence the guard: seeds stay inside the app's own object graph, where natural
 * keys resolve. If a future platform release makes an ActivityPointer target
 * seedable, delete this test deliberately — do not widen it.
 */
describe('every seed dataset targets an object this app declares (#1258)', () => {
  const declared = new Set(
    ((stack as unknown as { objects?: { name?: string }[] }).objects ?? []).map((o) => String(o.name)),
  );

  it('registers the app objects this guard measures against', () => {
    // Guard the guard: an empty set would make the assertion below vacuously
    // green and hide exactly the class it exists to catch.
    expect(declared.size, 'objectstack.config.ts registers no objects').toBeGreaterThan(10);
  });

  it('never seeds an object outside the app graph — those rows load but resolve to nothing', () => {
    const foreign = datasets
      .map((d) => String(d.object))
      .filter((name) => !declared.has(name));
    expect(
      [...new Set(foreign)],
      'these seed datasets name objects the app does not declare. Their rows will load and be\n' +
        'counted at boot, but any field pointing at another record is stored as the literal\n' +
        'natural key instead of an id — the loader resolves natural keys only for lookup /\n' +
        'master_detail fields. See this block\'s comment for the measurement:\n  ' +
        [...new Set(foreign)].join('\n  '),
    ).toEqual([]);
  });
});

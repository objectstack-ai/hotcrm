// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Revenue seeds — contracts, quotes and their lines.
 *
 * Split out of the former monolithic `src/data/index.ts` (#635). Seed doctrine
 * lives in `./_shared.ts`.
 */
import { defineSeed } from '@objectstack/spec/data';
import { cel } from '@objectstack/spec';
import { Contract } from '../objects/contract.object';
import { Quote } from '../objects/quote.object';
import { QuoteLineItem } from '../objects/quote_line_item.object';
import { linesTotal, type LineSpec } from '../../sales/data/_shared';
import { lineItemRecords } from './catalog.seed';
import { OPPORTUNITY_LINES } from '../../sales/data/sales.seed';

// ─── Contracts ────────────────────────────────────────────────────────
// `contract_number` is a runtime-owned autonumber and is NOT seeded (#490).
// Contract has no natural-name field, so the (unique, stable) description
// doubles as the upsert identity for these fixtures.
export const contracts = defineSeed(Contract, {
  mode: 'upsert',
  externalId: 'description',
  records: [
    // The one ACTIVATED contract in the app — `contract_renewal`,
    // `contract_expiration` and `billing_handoff` all filter on exactly that
    // status — so it has to be a contract that was really signed, off a deal
    // that was really won.
    //
    // It used to link `Acme Platform Upgrade` and carry that deal's line total
    // (150000) while that deal is still `proposal`, closing `daysFromNow(30)`
    // (#1661). Nothing in this app can produce that pairing: `quote_on_accepted`
    // close-wins an opportunity the moment its quote is accepted, and
    // `closed_won` is TERMINAL in `opportunity_stage_progression` — so a signed
    // contract can never sit on an open deal, from either direction.
    //
    // Every field below is now derived from `Acme Annual Renewal 2025`, the
    // `closed_won` deal this contract's own description was already describing:
    //   contract_value — that deal's line-item total, which is also the ARR the
    //                    account description reports. 150000 was the upgrade's
    //                    total, i.e. the value came from a different deal than
    //                    the link did;
    //   signed_date    — its `close_date`: you sign when you win, and
    //                    `quote_on_accepted` stamps that same day;
    //   start_date     — signature + 14d, because that deal's description says
    //                    it was "signed two weeks ahead of the renewal date";
    //   end_date       — start + 365d, the span every other row here uses for a
    //                    12-month term.
    {
      crm_account: 'Acme Corporation',
      crm_contact: 'john.smith@acme.example.com',
      crm_opportunity: 'Acme Annual Renewal 2025',
      status: 'activated',
      contract_term_months: 12,
      start_date: cel`daysAgo(1)`,
      end_date: cel`daysFromNow(364)`,
      contract_value: 220000,
      billing_frequency: 'annually',
      payment_terms: 'net_30',
      auto_renewal: true,
      renewal_notice_days: 60,
      contract_type: 'subscription',
      signed_date: cel`daysAgo(15)`,
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
  'Acme Annual Renewal 2025 Quote': OPPORTUNITY_LINES['Acme Annual Renewal 2025'],
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
      // `expired`, not `accepted` (#1661). Accepting this quote would have
      // close-won `Acme Platform Upgrade`, which is `proposal` and 30 days from
      // close — the same impossible pairing the contract above carried, one
      // object over. `expired` is what `quote_expiration` computes for a
      // presented quote past its `expiration_date`, and it is what the deal's
      // own next step assumes: the revised Enterprise proposal still has to go
      // out. Its `crm_contact` stays put — the row is no longer gated by
      // `requiredWhen`, but the recipient is still who it was sent to.
      status: 'expired',
      quote_date: cel`daysAgo(45)`,
      expiration_date: cel`daysAgo(15)`,
      ...quoteTotals('Acme Platform Upgrade Quote', { discount: 10, tax: 11475, shipping_handling: 0 }),
      payment_terms: 'net_30',
      description: 'Platform upgrade with 10% loyalty discount applied.',
    },
    // The renewal's own quote, and the seed's one ACCEPTED quote. Acceptance is
    // only coherent here: `quote_on_accepted` close-wins whatever opportunity a
    // quote links, so an accepted quote can only ever point at a `closed_won`
    // deal. It also completes the provenance chain the contract above needs —
    // deal won, quote accepted, contract drafted, then completed and activated
    // by an admin (the draft the hook writes is explicitly a starting point).
    // `Acme Annual Renewal 2025` keeps its rep-recorded `relationship` win
    // reason: the hook only supplies `quote_accepted` when nobody recorded one.
    {
      name: 'Acme Annual Renewal 2025 Quote',
      crm_account: 'Acme Corporation',
      crm_contact: 'john.smith@acme.example.com',
      crm_opportunity: 'Acme Annual Renewal 2025',
      status: 'accepted',
      quote_date: cel`daysAgo(30)`,
      expiration_date: cel`daysAgo(1)`,
      // No discount — the renewal went at list ("multi-year option declined
      // this round"), which is what its 22% YoY uplift is made of. Tax is 8.5%
      // of the post-discount subtotal, the rate the other Acme quote bills at;
      // every non-Acme quote here bills 8%.
      ...quoteTotals('Acme Annual Renewal 2025 Quote', { discount: 0, tax: 18700, shipping_handling: 0 }),
      payment_terms: 'net_30',
      description: 'Annual renewal — three production tenants, premium support and the EMEA seat expansion.',
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

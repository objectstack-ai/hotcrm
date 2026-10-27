// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Contract seeds.
 *
 * Moved here from `src/revenue/data/revenue.seed.ts` with the object itself
 * (`module-split-plan.md` item 11): a seed family is registered by the package
 * that owns its object. Seed doctrine lives in `./_shared.ts`.
 */
import { defineSeed } from '@objectstack/spec/data';
import { cel } from '@objectstack/spec';
import { Contract } from '../objects/contract.object';

// ─── Contracts ────────────────────────────────────────────────────────
// `contract_number` is a runtime-owned autonumber and is NOT seeded (#490).
// Contract has no natural-name field, so the (unique, stable) description
// doubles as the seed identity (`externalId`) for these fixtures.
//
// INSERT-ONCE (`mode: 'ignore'`, #2139): a rep moves a contract through
// approval and activation and edits its terms; under `upsert` the next boot
// wrote each edited field back to its seeded value. The mechanism and the
// price: beside `leads` in `src/sales/data/sales.seed.ts`.
export const contracts = defineSeed(Contract, {
  mode: 'ignore',
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

// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { definePicklist } from '@objectstack/spec/data';

/**
 * Payment Terms — `crm_quote.payment_terms` and `crm_contract.payment_terms`.
 *
 * One list, referenced by name from both fields: an accepted quote's terms
 * carry over to the contract, so the contract vocabulary must cover every
 * quote value (`due_on_receipt` was Quote-only before the two were unified).
 * The contract is this package's and the quote is the revenue module's, which
 * depends on this one, so the list lives here — the lowest package all its
 * consumers depend on (`module-split-plan.md` item 11).
 *
 * The carry-over is `quote_accepted_contract_draft` in
 * `src/revenue/objects/quote.hook.ts`, named here because this rationale spent
 * its first months unenforced (#873): the hook drafted the contract without
 * `payment_terms`, so every accepted quote produced a contract on the `net_30`
 * default below regardless of what was negotiated — a shared vocabulary
 * justified by a copy that did not exist.
 * A comment that names its enforcer can be checked; this one could not be.
 *
 * ⛔ Not `crm_opportunity.payment_terms`, which is a different vocabulary on
 * purpose — see that field.
 */
export const PaymentTermsPicklist = definePicklist({
  name: 'payment_terms',
  label: 'Payment Terms',
  description: 'When an invoice falls due — shared by quotes and the contracts they become.',
  options: [
    { label: 'Net 15', value: 'net_15' },
    { label: 'Net 30', value: 'net_30', default: true },
    { label: 'Net 60', value: 'net_60' },
    { label: 'Net 90', value: 'net_90' },
    { label: 'Due on Receipt', value: 'due_on_receipt' },
  ],
});

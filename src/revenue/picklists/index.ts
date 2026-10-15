// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Revenue picklists barrel.
 *
 * The doctrine for this metadata type is written once, in
 * `src/sales/picklists/index.ts`; this file is the revenue package's half of
 * the same file-by-file registration. `payment_terms` lives here because both
 * fields that reference it — `crm_quote.payment_terms` and
 * `crm_contract.payment_terms` — are this package's.
 */

export { PaymentTermsPicklist } from './payment_terms.picklist';

// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Order to Cash views barrel. The doctrine for this metadata type is written
 * once, in `src/sales/views/index.ts`; this file is the module's half of the
 * same file-by-file registration.
 */

export { BillingMilestoneViews } from './billing_milestone.view';
export { InvoiceViews } from './invoice.view';
export { PaymentViews } from './payment.view';

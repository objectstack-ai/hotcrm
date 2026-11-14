// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Order to Cash hook registrations. See `src/sales/objects/hooks.ts` for why
 * these are named re-exports rather than an assembled array. Every hook here
 * attaches to one of this module's own objects (ADR-0130 R4): the contract and
 * the account are read at run time, never hooked.
 */

export { default as billingMilestoneHook } from './billing_milestone.hook';
export { default as invoiceHook } from './invoice.hook';
export { default as paymentHook } from './payment.hook';

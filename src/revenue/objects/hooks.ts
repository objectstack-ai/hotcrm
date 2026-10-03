// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Revenue hook registrations. See `src/sales/objects/hooks.ts` for why these
 * are named re-exports rather than an assembled array, and why a `*.hook.ts`
 * lives beside the `*.object.ts` it names.
 */

export { default as contractHook } from './contract.hook';
export { default as opportunityLineItemHook } from './opportunity_line_item.hook';
export { default as productHook } from './product.hook';
export { default as quoteHook } from './quote.hook';
export { default as quoteLineItemHook } from './quote_line_item.hook';

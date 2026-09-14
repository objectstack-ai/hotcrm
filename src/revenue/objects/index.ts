// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Revenue object barrel.
 *
 * Re-exports this package's *.object.ts definitions; the `*.hook.ts` files
 * beside them register through `./hooks.ts`. The canonical note on the
 * collaboration capabilities (`enable.files`, `enable.feeds`) that every
 * object in this app points at is written once, in
 * `src/sales/objects/index.ts`.
 */

export { Contract } from './contract.object';
export { OpportunityLineItem } from './opportunity_line_item.object';
export { Product } from './product.object';
export { Quote } from './quote.object';
export { QuoteLineItem } from './quote_line_item.object';

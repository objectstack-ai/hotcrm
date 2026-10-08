// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Revenue seed data.
 *
 * `objectstack.composition.ts` collects these families into the single ordered
 * `CrmSeedData` union, which it cuts by owning package for the two package
 * stacks — see `src/sales/data/index.ts` for why the assembly and its order
 * live there rather than in a package barrel.
 */
export { products, catalogPrice, lineItemRecords } from './catalog.seed';
export { opportunityLineItems } from './opportunity-line-item.seed';
export { contracts, quotes, quoteLineItems } from './revenue.seed';

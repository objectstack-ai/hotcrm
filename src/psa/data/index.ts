// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Project Delivery seed data. `objectstack.composition.ts` collects these into
 * the ordered `CrmSeedData` union and cuts them back out for this package — see
 * `src/sales/data/index.ts` for why the assembly lives there.
 */
export { projects, rateCards } from './psa.seed';
export { projectsZhCN, rateCardsZhCN } from './psa.zh-CN.seed';

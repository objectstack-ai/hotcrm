// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Order to Cash seed data (#2529). `objectstack.composition.ts` collects these
 * into the ordered `CrmSeedData` union, after the contracts they bill, and cuts
 * them back out for this package — see `src/sales/data/index.ts` for why the
 * assembly lives there.
 */
export { billingMilestones, invoices, payments } from './o2c.seed';
export { billingMilestonesZhCN, invoicesZhCN, paymentsZhCN } from './o2c.zh-CN.seed';

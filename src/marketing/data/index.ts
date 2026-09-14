// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Marketing seed data.
 *
 * `objectstack.config.ts` collects these families into the single ordered
 * `CrmSeedData` array it registers — see `src/sales/data/index.ts` for why the
 * assembly and its order live there rather than in a package barrel.
 */
export { campaigns, campaignMembersFromLeads, campaignMembersFromContacts } from './marketing.seed';

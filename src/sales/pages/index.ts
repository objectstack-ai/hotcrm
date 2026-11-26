// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Sales (the app package) pages barrel.
 *
 * The doctrine for this metadata type is written once, in
 * `src/sales/pages/index.ts`; this file is the sales package's half of
 * the same file-by-file registration.
 */

// The lead, the account and the opportunity have no authored record page:
// each draws the platform's default page as is. The opportunity's two approval
// banners were dropped by maintainer ruling (#2686), and the lead's two
// duplicate banners with its page (#2740): the duplicate verdict is on the
// lead's Duplicate Management section, which opens expanded, and Convert Lead
// still warns on a suspected duplicate and refuses a confirmed one.
export { AccountWorkbenchPage } from './account_workbench.page';
export { SalesHomePage } from './home.page';
// The contract's working page (explicit default) and its print page (#2317).
export { ContractDetailPage } from './contract_detail.page';
export { ContractPrintPage } from './contract_print.page';

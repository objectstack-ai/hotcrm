// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Sales (the app package) pages barrel.
 *
 * The doctrine for this metadata type is written once, in
 * `src/sales/pages/index.ts`; this file is the sales package's half of
 * the same file-by-file registration.
 */

// The lead's record page is the synthesized default page with only the
// `alerts` slot filled (#2382). The account and the opportunity have no
// authored record page at all: each draws the default page as is. The
// opportunity's two approval banners were dropped by maintainer ruling
// (#2686): the platform's own approval strip and Approvals card say who a
// pending deal waits on and offer Approve / Reject or Recall.
export { LeadDetailPage } from './lead_detail.page';
export { AccountWorkbenchPage } from './account_workbench.page';
export { SalesHomePage } from './home.page';
// The contract's working page (explicit default) and its print page (#2317).
export { ContractDetailPage } from './contract_detail.page';
export { ContractPrintPage } from './contract_print.page';

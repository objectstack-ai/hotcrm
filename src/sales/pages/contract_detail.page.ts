// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Page } from '@objectstack/spec/ui';

/**
 * Contract Detail — the contract's DEFAULT record page, and nothing else
 * (#2317).
 *
 * It overrides no slot: the console draws the record page it synthesizes for
 * any object (title, highlights, status path, Details / Related / Attachments
 * tabs, discussion), exactly as it did while the contract had no authored page.
 *
 * It exists because `contract_print_page` (`./contract_print.page.ts`) does.
 * The console's record route draws an object's DEFAULT record page
 * (`isDefault: true`), and with none, the FIRST record page of the object it
 * holds (`usePageAssignment`, `@object-ui/react`); it synthesizes one only when
 * the object has no record page at all. Without this page every contract would
 * open on the printable blocks — the same trap `quote_detail_page`
 * (`src/revenue/pages/quote_detail.page.ts`) closes for the quote.
 */
export const ContractDetailPage: Page = {
  name: 'contract_detail_page',
  label: 'Contract Detail',
  description: "The contract's record page: the synthesized layout, with no slot overridden.",

  type: 'record',
  object: 'crm_contract',
  isDefault: true,

  kind: 'slotted',
  regions: [],
  slots: {},
};

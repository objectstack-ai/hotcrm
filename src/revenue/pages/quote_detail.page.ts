// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Page } from '@objectstack/spec/ui';

/**
 * Quote Detail — the quote's DEFAULT record page, and nothing else (#2312).
 *
 * It overrides no slot: the console draws the record page it synthesizes for
 * any object (title, highlights, status path, Details / Related / Attachments
 * tabs, discussion), exactly as it did while the quote had no authored page.
 *
 * It exists because `quote_print_page` (`./quote_print.page.ts`) does. The
 * console's record route draws an object's DEFAULT record page (`isDefault:
 * true`), and with none, the FIRST record page of the object it holds
 * (`usePageAssignment`, `@object-ui/react`); it synthesizes one only when the
 * object has no record page at all. So the moment the quote gained a print
 * page, the print page became every quote's record page — measured on 18.2.0:
 * `/crm_quote/record/ID` drew the printable blocks with no status path and no
 * tabs. Declaring this page the default is what keeps the print page a
 * separate document (maintainer ruling on #2312, option B) rather than the
 * quote's working page.
 */
export const QuoteDetailPage: Page = {
  name: 'quote_detail_page',
  label: 'Quote Detail',
  description: "The quote's record page: the synthesized layout, with no slot overridden.",

  type: 'record',
  object: 'crm_quote',
  isDefault: true,

  kind: 'slotted',
  regions: [],
  slots: {},
};

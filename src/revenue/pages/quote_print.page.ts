// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { Page } from '@objectstack/spec/ui';

/**
 * Quote Print Page — the quote as a document (REQ-0008 phase 1, #2312).
 *
 * A print page is an ordinary record page with a `print` declaration
 * (objectstack#8346, ruling 「8346 B′」: a document is a page with a print
 * declaration, no template type of its own). Two consumers read it:
 *
 *  - the console draws it at the record's named-page route and its own Print
 *    button prints it through the browser;
 *  - `@objectstack/service-print` renders it in headless Chromium, AS the user
 *    who clicks Print Quote (`print_quote`, `../actions/quote.actions.ts`), and
 *    archives the PDF as an attachment on the quote. `crm_quote` declares
 *    `enable: { files: true }`, which that archive needs.
 *
 * ⚠️ NOT the quote's default record page, deliberately (maintainer ruling on
 * #2312, option B). The quote's working record page — title, highlights,
 * status path, Details / Related / Attachments tabs, discussion — stays the
 * derived one; a print page holds only the printable blocks
 * (`PRINTABLE_PAGE_COMPONENT_TYPES`, `os validate` refuses any other), so
 * making this the default would replace all of that for every rep, every day.
 * The cost, measured on 18.1.0: the print service prints only an object's
 * DEFAULT record page and answers any other page with `VALIDATION_ERROR` /
 * 400 ("is not the default record page … (isDefault: true)"), so Print Quote
 * is refused until the platform prints a named record page
 * (objectstack#26583). Nothing here works around that.
 *
 * Every block is printable. The `header` region repeats on every sheet, and
 * each sheet carries its page number.
 */
export const QuotePrintPage: Page = {
  name: 'quote_print_page',
  label: 'Quote Document',
  description: 'The quote as a printable document: header, customer, line items, pricing and terms.',

  type: 'record',
  object: 'crm_quote',
  kind: 'full',

  print: {
    paperSize: 'A4',
    orientation: 'portrait',
    margins: { top: 18, bottom: 18, left: 15, right: 15 },
    repeatHeader: true,
    pageNumbers: true,
    avoidBreakInside: true,
  },

  regions: [
    {
      // The seller line. `element:text` content is a plain string — no
      // translation bundle key reaches it — so it is the product name, which
      // reads the same in every locale.
      name: 'header',
      components: [
        { type: 'element:text', id: 'quote_print_seller', properties: { content: 'HotCRM' } },
        { type: 'element:divider', id: 'quote_print_rule' },
      ],
    },
    {
      name: 'main',
      components: [
        {
          // Per-field enumeration, on purpose (AGENTS.md Metadata semantics,
          // rung 3 of the layout ladder; rule 11). This block is what the
          // CUSTOMER reads, and `{ group: 'basic' }` would print the quote's
          // internal fields with it: `status` (a document printed while the
          // quote is `in_review` must not say so), `crm_opportunity`, the
          // `display_title` duplicate of number and name, and `description`.
          // The section key is `quote` so its label is the one the packs
          // already carry for the quote form's `quote` section.
          type: 'record:details',
          id: 'quote_print_customer',
          properties: {
            sections: [
              {
                name: 'quote',
                label: 'Quote',
                columns: 2,
                fields: ['quote_number', 'name', 'crm_account', 'crm_contact', 'owner_id'],
              },
            ],
          },
        },
        {
          // The child table. `record:related_list` is not printable;
          // `record:line_items` is, and prints every line up to its cap.
          // Column labels are plain strings (no bundle key reaches a
          // `record:line_items` column), so they are the line item fields' own
          // English labels; `type: 'currency'` formats the money columns.
          type: 'record:line_items',
          id: 'quote_print_lines',
          properties: {
            childObject: 'crm_quote_line_item',
            relationshipField: 'crm_quote',
            title: 'Line Items',
            columns: [
              { name: 'product_title', label: 'Product' },
              { name: 'quantity', label: 'Quantity', type: 'number' },
              { name: 'unit_price', label: 'Sales Price', type: 'currency' },
              { name: 'discount', label: 'Discount %', type: 'number' },
              { name: 'total_price', label: 'Total', type: 'currency' },
            ],
            sort: [{ field: 'line_number', order: 'asc' }],
            readonly: true,
          },
        },
        {
          // The two groups print whole: every member of `pricing` and `terms`
          // is customer-facing, so the group reference is enough (rung 2).
          type: 'record:details',
          id: 'quote_print_totals',
          properties: {
            sections: [{ group: 'pricing' }, { group: 'terms' }],
          },
        },
      ],
    },
  ],
};

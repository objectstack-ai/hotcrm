// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Page } from '@objectstack/spec/ui';

/**
 * Contract Print Page — the contract as a document (REQ-0008 phase 2, #2317).
 *
 * A print page is an ordinary record page with a `print` declaration
 * (objectstack#8346, ruling 「8346 B′」), built the way `quote_print_page`
 * (`src/revenue/pages/quote_print.page.ts`) is. Two consumers read it:
 *
 *  - the console draws it at the record's named-page route and its own Print
 *    button prints it through the browser;
 *  - `@objectstack/service-print` renders it in headless Chromium, AS the user
 *    who clicks Print Contract (`print_contract`,
 *    `../actions/contract.actions.ts`), and archives the PDF as an attachment
 *    on the contract (`enable: { files: true }` on `crm_contract`).
 *
 * ⚠️ NOT the contract's default record page: `contract_detail_page`
 * (`./contract_detail.page.ts`) is, so a contract still opens on its working
 * page. A print page holds only the printable blocks
 * (`PRINTABLE_PAGE_COMPONENT_TYPES`; `os validate` refuses any other).
 *
 * Every block is printable. The `header` region repeats on every sheet, and
 * each sheet carries its page number.
 */
/** One party's signature line, in each locale the app ships (see the signature block below). */
const SIGNATURE_LINE = {
  en: 'Signature: ____________________    Name: ____________________    Date: ______________',
  'zh-CN': '签字：____________________    姓名：____________________    日期：______________',
  'ja-JP': '署名：____________________    氏名：____________________    日付：______________',
  'es-ES': 'Firma: ____________________    Nombre: ____________________    Fecha: ______________',
};

export const ContractPrintPage: Page = {
  name: 'contract_print_page',
  label: 'Contract Document',
  description: 'The contract as a printable document: parties, term, value, billing, terms and signatures.',

  type: 'record',
  object: 'crm_contract',
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
      // The seller line, as on the quote's document: the product name, which
      // reads the same in every locale.
      name: 'header',
      components: [
        { type: 'element:text', id: 'contract_print_seller', properties: { content: 'HotCRM' } },
        { type: 'element:divider', id: 'contract_print_rule' },
      ],
    },
    {
      name: 'main',
      components: [
        {
          // The parties, enumerated on purpose (AGENTS.md Metadata semantics,
          // rung 3 of the layout ladder; rule 11). This block is what the
          // CUSTOMER reads, and `{ group: 'parties' }` would print
          // `crm_opportunity`, the internal deal the contract came from, with
          // it; `{ group: 'basic' }` would print the `description` and the
          // external DMS link. The seller is the header's line and the
          // contract's owner, the person who answers for it. The section key is
          // `parties` so its label is the one the packs carry for the group.
          type: 'record:details',
          id: 'contract_print_parties',
          properties: {
            sections: [
              {
                name: 'parties',
                label: 'Parties',
                columns: 2,
                fields: ['contract_number', 'contract_type', 'crm_account', 'crm_contact', 'owner_id'],
              },
            ],
          },
        },
        {
          // Term, value and billing, and the renewal terms: every member of
          // these groups is something the customer signs, so the group
          // reference is enough (rung 2).
          type: 'record:details',
          id: 'contract_print_terms',
          properties: {
            sections: [{ group: 'terms' }, { group: 'value' }, { group: 'renewal' }],
          },
        },
        {
          // The signature block: a line each for the customer and for the
          // seller, left blank for ink. What comes back signed is filed as the
          // contract's Signed Copy (`signed_copy`), which Activated requires.
          //
          // `element:text` prints its `content` as plain text (measured on
          // 18.3.0: Markdown is not rendered on the printed sheet, a table's
          // pipes print as typed), so each line is its own block. Its content
          // and the card's title take an inline locale map (#5728) — no
          // translation bundle key reaches `element:text` — so the four
          // locales the app ships are written here.
          type: 'page:card',
          id: 'contract_print_signatures',
          properties: {
            title: { en: 'Signatures', 'zh-CN': '签署', 'ja-JP': '署名', 'es-ES': 'Firmas' },
            children: [
              {
                type: 'element:text',
                id: 'contract_print_sign_customer',
                properties: {
                  variant: 'h4',
                  content: { en: 'For the customer', 'zh-CN': '客户方', 'ja-JP': 'お客様', 'es-ES': 'Por el cliente' },
                },
              },
              {
                type: 'element:text',
                id: 'contract_print_sign_customer_line',
                properties: { content: SIGNATURE_LINE },
              },
              {
                type: 'element:text',
                id: 'contract_print_sign_seller',
                properties: {
                  variant: 'h4',
                  content: { en: 'For HotCRM', 'zh-CN': 'HotCRM 方', 'ja-JP': 'HotCRM', 'es-ES': 'Por HotCRM' },
                },
              },
              {
                type: 'element:text',
                id: 'contract_print_sign_seller_line',
                properties: { content: SIGNATURE_LINE },
              },
            ],
          },
        },
      ],
    },
  ],
};

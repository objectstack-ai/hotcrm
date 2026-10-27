// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * Print Quote — print the quote to a PDF and attach it to the quote, as the
 * rep who clicks it (REQ-0008 phase 1, #2312).
 *
 * The target is `@objectstack/service-print`'s door, `POST
 * /api/v1/print/records`, which `PrintServicePlugin` mounts (composed in
 * `../index.ts`). The door prints the record on `quote_print_page`
 * (`../pages/quote_print.page.ts`) in headless Chromium under the caller's own
 * principal, and the service archives the PDF on the quote ONCE, as the
 * caller. The body is the door's whole request: the clicked record's id
 * (`recordIdParam`) and the three constant fields (`bodyExtra`); `app` is the
 * console route segment a quote opens in.
 *
 * ⚠️ Refused until objectstack#26583 ships: the service prints only an
 * object's DEFAULT record page, and `quote_print_page` is deliberately not the
 * quote's (see the page's note), so the door answers `VALIDATION_ERROR` / 400
 * and the rep sees that error. The action is declared against the door as it
 * will answer, not shimmed.
 *
 * What printing then does to the quote's status is not this action's: the
 * archive's attachment write fires `quote_print_presented`
 * (`../flows/quote-print-presented.flow.ts`), which moves a draft or in-review
 * quote to `presented`.
 *
 * `visible` mirrors the two grants the door judges before it prints, by the
 * rule `escalate_case` states (`src/service/actions/case.actions.ts`): the
 * archive needs EDIT access to the quote and the right to CREATE an
 * attachment. `crm_user` reads quotes and attachments and holds neither, so
 * the button is not drawn for it rather than answering 403. The door re-judges
 * every print anyway — an impersonation session, a record the caller cannot
 * read, a print engine that is not configured (`OS_PRINT_CHROMIUM_PATH` or
 * `OS_PRINT_BROWSER_ENDPOINT`, and `OS_PRINT_CONSOLE_URL`) each reach the user
 * as the action's error.
 *
 * `record_header` draws it beside Edit on the quote's record page; `list_item`
 * puts it in the quote list's row menu.
 */
export const PrintQuoteAction: Action = {
  name: 'print_quote',
  label: 'Print Quote',
  objectName: 'crm_quote',
  icon: 'printer',
  type: 'api',
  target: '/api/v1/print/records',
  method: 'POST',
  // One print per record: the door takes one record id.
  execution: 'perRecord',
  recordIdParam: 'recordId',
  bodyExtra: { app: 'app.objectstack.hotcrm', object: 'crm_quote', page: 'quote_print_page' },
  visible: P`current_user.can("crm_quote", "edit") && current_user.can("sys_attachment", "create")`,
  successMessage: 'Quote PDF attached to the quote.',
  locations: ['record_header', 'list_item'],
  refreshAfter: true,
};

// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * Print Contract — print the contract to a PDF and attach it to the contract,
 * as the user who clicks it (REQ-0008 phase 2, #2317).
 *
 * The same door as Print Quote (`src/revenue/actions/quote.actions.ts`, #2312):
 * `@objectstack/service-print`'s `POST /api/v1/print/records`, which
 * `PrintServicePlugin` mounts (composed by this package, `../index.ts`). The
 * door prints the record on `contract_print_page`
 * (`../pages/contract_print.page.ts`) in headless Chromium under the caller's
 * own principal, and the service archives the PDF on the contract ONCE, as the
 * caller (`crm_contract` declares `enable: { files: true }`). The body is the
 * door's whole request: the clicked record's id (`recordIdParam`) and the three
 * constant fields (`bodyExtra`); `app` is the console route segment a contract
 * opens in.
 *
 * `contract_print_page` is NOT the contract's default record page:
 * `contract_detail_page` holds that, so a contract still opens on its working
 * page. The door prints any record page of the object that declares `print`
 * (since 18.3.0, objectstack#26583).
 *
 * Printing moves no status. The printed copy is what goes out for signature;
 * what comes back is the Signed Copy (`signed_copy`), which the user uploads
 * and which Activated requires (`contract.object.ts`).
 *
 * `visible` mirrors the two grants the door judges before it prints, as Print
 * Quote's does: the archive needs EDIT access to the contract and the right to
 * CREATE an attachment, so a reader who holds neither is not offered a button
 * that answers 403. The door re-judges every print anyway — an impersonation
 * session, a record the caller cannot read, a print engine that is not
 * configured (`OS_PRINT_CHROMIUM_PATH` or `OS_PRINT_BROWSER_ENDPOINT`, and
 * `OS_PRINT_CONSOLE_URL`) each reach the user as the action's error.
 *
 * `record_header` draws it beside Edit on the contract's record page;
 * `list_item` puts it in the contract list's row menu.
 */
export const PrintContractAction: Action = {
  name: 'print_contract',
  label: 'Print Contract',
  objectName: 'crm_contract',
  icon: 'printer',
  type: 'api',
  target: '/api/v1/print/records',
  method: 'POST',
  // One print per record: the door takes one record id.
  execution: 'perRecord',
  recordIdParam: 'recordId',
  bodyExtra: { app: 'app.objectstack.hotcrm', object: 'crm_contract', page: 'contract_print_page' },
  visible: P`current_user.can("crm_contract", "edit") && current_user.can("sys_attachment", "create")`,
  successMessage: 'Contract PDF attached to the contract.',
  locations: ['record_header', 'list_item'],
  refreshAfter: true,
};

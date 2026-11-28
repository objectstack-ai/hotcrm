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
 * `record` draws it beside Edit on the contract's record page and puts it
 * in the contract list's row menu.
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
  locations: ['record'],
  refreshAfter: true,
};

/**
 * Change — the one way an activated contract's value, end date and payment
 * terms change (hotcrm#2804, maintainer ruling 2026-11-26).
 *
 * Two actions, one per kind of contract, because the ruling gives them
 * different inputs: a framework contract (and an Other one) may be given a
 * new value; an order contract is offered no value at all, only Update from
 * Order, which takes the order's amount. Both ask for the reason and the
 * signed amendment, and may give a new end date and new payment terms; an
 * input left empty keeps the field as it is.
 *
 * A declarative update (`operation: 'update'`, the dialog's `params`), so it
 * writes AS THE CALLER: the contract's own grants judge it, as Edit would. It
 * cannot write the three fields itself — on an activated contract
 * `readonlyWhen` drops every caller's write to them — so it writes the reason,
 * the amendment and the `change_new_*` inputs, and
 * `contract_form_and_change` (`../objects/contract.hook.ts`) refuses a
 * change without a reason or a newly signed amendment, moves each input
 * onto its field, and clears the inputs, in the same write. The field history
 * keeps every value before and after, who and when. The status stays
 * Activated, so the renewal and expiry sweeps go on reading the contract;
 * no change order is created, the order is not changed and the payment plan
 * is not re-planned.
 *
 * `visible`: activated contracts of the action's kind, for a person who may
 * edit contracts. Every predicate is total: a page's first render holds no
 * status, which offers nothing.
 */
export const ChangeContractAction: Action = {
  name: 'change_contract',
  label: 'Change',
  objectName: 'crm_contract',
  icon: 'file-diff',
  operation: 'update',
  locations: ['record_page'],
  visible: P`has(record.status) && record.status == "activated"
    && !(has(record.contract_form) && record.contract_form == "order") && current_user.can("crm_contract", "edit")`,
  description: 'Changes the contract value, the end date or the payment terms of this activated contract. Leave a field empty to keep it.',
  params: [
    { field: 'change_reason', required: true },
    { field: 'change_amendment', required: true },
    { field: 'change_new_value' },
    { field: 'change_new_end_date' },
    { field: 'change_new_payment_terms' },
  ],
  successMessage: 'Contract {{ record.name }} changed.',
  refreshAfter: true,
};

/** Change on an order contract: as `ChangeContractAction`, with Update from Order in place of a value. */
export const ChangeOrderContractAction: Action = {
  name: 'change_order_contract',
  label: 'Change',
  objectName: 'crm_contract',
  icon: 'file-diff',
  operation: 'update',
  locations: ['record_page'],
  visible: P`has(record.status) && record.status == "activated"
    && has(record.contract_form) && record.contract_form == "order" && current_user.can("crm_contract", "edit")`,
  description: "Changes the end date or the payment terms of this activated order contract, or takes the order's current amount. Leave a field empty to keep it.",
  params: [
    { field: 'change_reason', required: true },
    { field: 'change_amendment', required: true },
    { field: 'change_from_order' },
    { field: 'change_new_end_date' },
    { field: 'change_new_payment_terms' },
  ],
  successMessage: 'Contract {{ record.name }} changed.',
  refreshAfter: true,
};

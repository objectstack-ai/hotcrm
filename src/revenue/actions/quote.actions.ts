// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * Quote lifecycle actions (#2366 row 9).
 *
 * Before these, a quote's status moved only through Edit and the Status
 * dropdown. Each action is one step of `quote_status_progression`
 * (`quote.object.ts`) and is offered only on the statuses that step leaves
 * from:
 *
 * | action               | from                 | to          |
 * |----------------------|----------------------|-------------|
 * | Submit for Review    | Draft                | In Review   |
 * | Mark Presented       | In Review            | Presented   |
 * | Accept               | Presented            | Accepted    |
 * | Reject               | In Review, Presented | Rejected    |
 * | Revise               | In Review, Rejected  | Draft       |
 *
 * Expired has no action: the `quote_expiration` sweep is its writer. Each
 * `visible` is the machine's own row for that move, read the other way round,
 * so a button never offers a move the machine would flag;
 * `test/quote-lifecycle-actions.test.ts` derives every pair from the declared
 * transitions and fails when the two disagree. The machine is unchanged.
 *
 * # A declarative update, as the caller
 *
 * `operation: 'update'` + `patch`, as `complete_task` (`task.actions.ts`, which
 * gives the reasoning in full): the platform's action door writes the patch AS
 * THE CALLER, so the quote's permissions, `quote_workflow`'s freeze and the
 * acceptance gates (`requiredWhen` on the contact, #2014's held-deal refusal)
 * judge it exactly as they judge the same status set by Edit. Each patch is the
 * status alone: what follows from an acceptance — the frozen quote, the won
 * deal, the drafted contract — is the hooks' (`quote.hook.ts`).
 *
 * `current_user.can("crm_quote", "edit")` keeps the buttons off a reader who
 * may not edit quotes, by the rule `case.actions.ts` states: `visible` mirrors
 * the grant. Every predicate is total: a page's first render holds no status,
 * which offers nothing.
 *
 * # Wording
 *
 * Each success message names the quote by its title, its name (`{{ record.name }}`,
 * the action's own record). Accept alone asks first: it cannot be undone from
 * the quote — the quote freezes, its opportunity closes as won and a contract
 * is drafted. Every other move can be walked back by another action.
 */

export const SubmitQuoteForReviewAction: Action = {
  name: 'submit_quote_for_review',
  label: 'Submit for Review',
  objectName: 'crm_quote',
  icon: 'send',
  operation: 'update',
  patch: { status: 'in_review' },
  locations: ['record_header', 'list_item'],
  variant: 'primary',
  visible: P`has(record.status) && record.status == "draft" && current_user.can("crm_quote", "edit")`,
  successMessage: 'Quote {{ record.name }} submitted for review.',
  refreshAfter: true,
};

export const MarkQuotePresentedAction: Action = {
  name: 'mark_quote_presented',
  label: 'Mark Presented',
  objectName: 'crm_quote',
  icon: 'presentation',
  operation: 'update',
  patch: { status: 'presented' },
  locations: ['record_header', 'list_item'],
  variant: 'primary',
  visible: P`has(record.status) && record.status == "in_review" && current_user.can("crm_quote", "edit")`,
  successMessage: 'Quote {{ record.name }} marked as presented.',
  refreshAfter: true,
};

export const AcceptQuoteAction: Action = {
  name: 'accept_quote',
  label: 'Accept',
  objectName: 'crm_quote',
  icon: 'check-circle',
  operation: 'update',
  patch: { status: 'accepted' },
  locations: ['record_header', 'list_item'],
  variant: 'primary',
  visible: P`has(record.status) && record.status == "presented" && current_user.can("crm_quote", "edit")`,
  confirmText: 'Accept this quote? It is frozen, its opportunity is closed as won and a contract is drafted.',
  successMessage: 'Quote {{ record.name }} accepted.',
  refreshAfter: true,
};

export const RejectQuoteAction: Action = {
  name: 'reject_quote',
  label: 'Reject',
  objectName: 'crm_quote',
  icon: 'x-circle',
  operation: 'update',
  patch: { status: 'rejected' },
  locations: ['record_header', 'list_item'],
  visible: P`has(record.status) && (record.status == "in_review" || record.status == "presented") && current_user.can("crm_quote", "edit")`,
  successMessage: 'Quote {{ record.name }} rejected. Revise it to make a new offer.',
  refreshAfter: true,
};

export const ReviseQuoteAction: Action = {
  name: 'revise_quote',
  label: 'Revise',
  objectName: 'crm_quote',
  icon: 'rotate-ccw',
  operation: 'update',
  patch: { status: 'draft' },
  locations: ['record_header', 'list_item'],
  visible: P`has(record.status) && (record.status == "in_review" || record.status == "rejected") && current_user.can("crm_quote", "edit")`,
  successMessage: 'Quote {{ record.name }} is back at Draft.',
  refreshAfter: true,
};

/**
 * Print Quote — print the quote to a PDF and attach it to the quote, as the
 * rep who clicks it (REQ-0008 phase 1, #2312).
 *
 * The target is `@objectstack/service-print`'s door, `POST
 * /api/v1/print/records`, which `PrintServicePlugin` mounts (composed by the
 * app package, `src/sales/index.ts`, beside Print Contract). The door prints the record on `quote_print_page`
 * (`../pages/quote_print.page.ts`) in headless Chromium under the caller's own
 * principal, and the service archives the PDF on the quote ONCE, as the
 * caller. The body is the door's whole request: the clicked record's id
 * (`recordIdParam`) and the three constant fields (`bodyExtra`); `app` is the
 * console route segment a quote opens in.
 *
 * `quote_print_page` is deliberately NOT the quote's default record page (the
 * maintainer's ruling on #2312: the working page stays as it is). The door
 * prints any record page of the object that declares `print` since 18.3.0
 * (objectstack#26583); on 18.2.0 it refused every page but the default.
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

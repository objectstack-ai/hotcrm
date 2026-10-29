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
 * Each success message names the quote by its title (`{{ record.display_title }}`,
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
  successMessage: 'Quote {{ record.display_title }} submitted for review.',
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
  successMessage: 'Quote {{ record.display_title }} marked as presented.',
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
  successMessage: 'Quote {{ record.display_title }} accepted.',
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
  successMessage: 'Quote {{ record.display_title }} rejected. Revise it to make a new offer.',
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
  successMessage: 'Quote {{ record.display_title }} is back at Draft.',
  refreshAfter: true,
};

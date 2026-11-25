// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { QUOTE_DISCOUNT_APPROVAL_PERCENT } from '../../sales/objects/_thresholds';
type Flow = Automation.Flow;

/**
 * Quote discount approval (#2751, the maintainer's ruling A of 2026-11-25).
 *
 * Submit for Review used to set a quote to In Review and nothing else: no
 * approver, nothing in anyone's approvals Inbox, the quote still editable,
 * and anyone who could edit it (its submitter too) could present it. Now a
 * quote whose Discount %, or any line's, is above
 * `QUOTE_DISCOUNT_APPROVAL_PERCENT` opens an approval request for the Sales
 * Managers when it is submitted:
 *
 * - **Who decides:** the `crm_sales_manager` position, first answer wins. The
 *   submitter is never among the approvers (`excludeSubmitter`), so a manager
 *   who submits their own quote waits for another manager; when that leaves
 *   nobody, the request goes to the organization's administrators
 *   (`onEmptyApprovers: 'admin_rescue'`, as `opportunity_approval`'s), never
 *   through on its own.
 * - **While it waits:** the quote is locked (`lockRecord`), so neither its
 *   prices nor its status move — Mark Presented, Reject, Revise and Edit are
 *   all refused, and so is a line write, whose subtotal roll-up
 *   (`quote_total_rollup`) is a write of the locked quote and aborts with it.
 * - **Approved:** the platform's mirror writes `approved` to Discount Approval,
 *   and `stamp_approved_discount` records the discount the manager approved
 *   (the deeper of the quote's Discount % and Highest Line Discount % as
 *   submitted). The quote stays In Review; Mark Presented then passes
 *   `discount_approval_before_presented`, for that discount or a smaller one.
 * - **Rejected, or recalled by the submitter:** the quote goes back to Draft.
 *   A recall is not an approval, so it lands where a rejection does, as a
 *   recalled travel request does (`expense_request_approval`).
 *
 * A quote at or under the line on its own discount and on every line opens
 * nothing: the start condition does not hold, so it is In Review with no
 * request and is presented as before. That is "skip", not "auto-pass": no
 * request row is written for a decision nobody had to take, and Discount
 * Approval stays Not Required.
 *
 * Notices: the platform tells the submitter the outcome in their Inbox
 * (`approval.approved` / `approval.rejected`), and the approvers get the
 * request in theirs. This flow sends nothing of its own.
 *
 * `runAs: 'system'`, for the reasons `opportunity_approval` gives: the gate
 * must engage whoever (or whatever) set the quote In Review, and the closing
 * writes (`stamp_approved_discount`, `back_to_draft`) land on a record the
 * approval node held locked. The approval node still records the user whose
 * save started the run as the submitter.
 */

/** Discount %, or the deepest line's, above the line. Total: an absent figure is no discount. */
export const QUOTE_DISCOUNT_NEEDS_APPROVAL = P`((has(record.discount) && record.discount != null && record.discount > ${QUOTE_DISCOUNT_APPROVAL_PERCENT})
  || (has(record.max_line_discount) && record.max_line_discount != null && record.max_line_discount > ${QUOTE_DISCOUNT_APPROVAL_PERCENT}))`;

/**
 * A save that moves the quote INTO In Review. `previous.status` keeps a write
 * that leaves it there (the mirror's own `pending` stamp, a roll-up) from
 * opening a second request.
 */
export const QUOTE_SUBMITTED_NOW = P`has(record.status) && record.status == "in_review"
  && (!has(previous.status) || previous.status != "in_review")`;
export const QUOTE_BORN_IN_REVIEW = P`has(record.status) && record.status == "in_review"`;

const both = (a: { source: string }, b: { source: string }) => ({ dialect: 'cel' as const, source: `(${a.source}) && (${b.source})` });

export const QuoteDiscountApprovalFlow: Flow = {
  name: 'quote_discount_approval',
  label: 'Quote Discount Approval',
  description: `When a quote whose discount, or any line's, is above ${QUOTE_DISCOUNT_APPROVAL_PERCENT}% is submitted for review: a sales manager approves or rejects it. Rejected goes back to Draft.`,
  type: 'record_change',
  status: 'active',
  runAs: 'system',
  variables: [],
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'Start (quote over the discount line submitted for review)',
      config: {
        objectName: 'crm_quote',
        triggerType: 'record-after-update',
        condition: both(QUOTE_SUBMITTED_NOW, QUOTE_DISCOUNT_NEEDS_APPROVAL),
      },
    },
    {
      id: 'manager_review',
      type: 'approval',
      label: 'Sales Manager Review',
      config: {
        approvers: [{ type: 'position', value: 'crm_sales_manager' }],
        excludeSubmitter: true,
        // Explicit, as on `opportunity_approval`: the mechanism the node
        // depends on when the bench is empty (or holds only the submitter).
        onEmptyApprovers: 'admin_rescue',
        behavior: 'first_response',
        lockRecord: true,
        approvalStatusField: 'discount_approval_status',
      },
    },
    {
      id: 'stamp_approved_discount',
      type: 'update_record',
      label: 'Record the Approved Discount',
      config: {
        objectName: 'crm_quote',
        filter: { id: cel`record.id` },
        // The deeper of the two discounts as submitted; an absent one is no discount.
        fields: {
          approved_discount: cel`(has(record.max_line_discount) && record.max_line_discount != null
            && (!has(record.discount) || record.discount == null || record.max_line_discount > record.discount))
            ? record.max_line_discount : (has(record.discount) && record.discount != null ? record.discount : 0)`,
        },
      },
    },
    {
      id: 'back_to_draft',
      type: 'update_record',
      label: 'Back to Draft',
      config: { objectName: 'crm_quote', filter: { id: cel`record.id` }, fields: { status: 'draft' } },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e_start', source: 'start', target: 'manager_review', type: 'default' },
    { id: 'e_approve', source: 'manager_review', target: 'stamp_approved_discount', type: 'default', label: 'approve' },
    // A rejection and a recall both resume down `reject` (#2349); both go back to Draft.
    { id: 'e_reject', source: 'manager_review', target: 'back_to_draft', type: 'default', label: 'reject' },
    { id: 'e_stamped_end', source: 'stamp_approved_discount', target: 'end', type: 'default' },
    { id: 'e_draft_end', source: 'back_to_draft', target: 'end', type: 'default' },
  ],
};

/**
 * Insert twin of {@link QuoteDiscountApprovalFlow}: a quote created already In
 * Review (the New form offers it). A new quote has no lines yet, so only its
 * own Discount % can put it over the line.
 */
export const QuoteDiscountApprovalOnCreateFlow: Flow = {
  ...QuoteDiscountApprovalFlow,
  name: 'quote_discount_approval_on_create',
  label: 'Quote Discount Approval (on create)',
  description: 'Approval intake for a quote created already in review above the discount line (insert-time twin of quote_discount_approval).',
  nodes: QuoteDiscountApprovalFlow.nodes.map((n) =>
    n.id === 'start'
      ? { ...n, config: { ...n.config, triggerType: 'record-after-create', condition: both(QUOTE_BORN_IN_REVIEW, QUOTE_DISCOUNT_NEEDS_APPROVAL) } }
      : n,
  ),
};

// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * The traveler's three one-click steps on a travel request (hotcrm#2578).
 *
 * Each is a declarative update, so it writes AS THE CALLER: the same write as
 * setting Status in the form, judged by the object's state machine and by
 * `expense_request_decision_guard`. A script body would run as the system and
 * skip those person-side rules. An agent acting as the traveler takes the
 * same steps through the API by writing the status.
 *
 * - **Submit** (Draft): starts `expense_request_approval`, which asks the
 *   traveler's manager.
 * - **Cancel** (Approved): the trip is called off, or its plan changed; a new
 *   plan is a new request, since the planned values lock on approval.
 * - **Close** (Approved): the trip is over. F3c closes a request by itself
 *   once its last open expense report is paid; this is the hand-closed case.
 *
 * Shown to the traveler (the owner) only. The approver it is shared to and the
 * sets that read every request (finance) would otherwise be offered a step
 * that is not theirs; an administrator still sets the status in the form.
 */
export const SubmitExpenseRequestAction: Action = {
  name: 'submit_expense_request',
  label: 'Submit',
  objectName: 'crm_expense_request',
  icon: 'send',
  operation: 'update',
  patch: { status: 'submitted' },
  locations: ['record'],
  variant: 'primary',
  visible: P`has(record.status) && record.status == "draft" && has(record.owner_id) && record.owner_id == current_user.id`,
  successMessage: 'Travel request {{ record.name }} submitted for approval.',
  refreshAfter: true,
  // F4b (hotcrm#2617): sends the request to the approver.
  ai: {
    exposed: true,
    requiresConfirmation: true,
    description: 'Submits one of the caller\'s Draft travel requests for approval. Ask the person before running it.',
  },
};

export const CancelExpenseRequestAction: Action = {
  name: 'cancel_expense_request',
  label: 'Cancel Trip',
  objectName: 'crm_expense_request',
  icon: 'circle-x',
  operation: 'update',
  patch: { status: 'cancelled' },
  locations: ['record'],
  visible: P`has(record.status) && record.status == "approved" && has(record.owner_id) && record.owner_id == current_user.id`,
  confirmText: 'Cancel this trip? A cancelled request cannot be reopened; file a new one for a new plan.',
  successMessage: 'Travel request {{ record.name }} cancelled.',
  refreshAfter: true,
  // F4b (hotcrm#2617): a cancelled request cannot be reopened.
  ai: {
    exposed: true,
    requiresConfirmation: true,
    description: 'Cancels one of the caller\'s Approved travel requests: the trip is called off or its plan changed. Cannot be undone; a new plan is a new request. Ask the person before running it.',
  },
};

export const CloseExpenseRequestAction: Action = {
  name: 'close_expense_request',
  label: 'Close',
  objectName: 'crm_expense_request',
  icon: 'circle-check',
  operation: 'update',
  patch: { status: 'closed' },
  locations: ['record'],
  visible: P`has(record.status) && record.status == "approved" && has(record.owner_id) && record.owner_id == current_user.id`,
  successMessage: 'Travel request {{ record.name }} closed.',
  refreshAfter: true,
  // F4b (hotcrm#2617): a closed request takes no new report.
  ai: {
    exposed: true,
    requiresConfirmation: true,
    description: 'Closes one of the caller\'s Approved travel requests once the trip is over; a closed request takes no new expense report. Cannot be undone. Ask the person before running it.',
  },
};

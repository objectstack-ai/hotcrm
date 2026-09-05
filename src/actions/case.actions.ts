// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * Case actions — all three delegate to screen flows in
 * `src/flows/case-actions.flow.ts` (see the note there for why: modal
 * actions never execute their body in 16.1.0, and script bodies cannot
 * UPDATE a record on a sharing-ruled object; screen flows are the mechanism
 * that demonstrably works, same as `convert_lead` / `schedule_followup`).
 */
export const EscalateCaseAction: Action = {
  name: 'escalate_case',
  label: 'Escalate Case',
  objectName: 'crm_case',
  icon: 'alert-triangle',
  type: 'flow',
  target: 'escalate_case',
  locations: ['record_header', 'list_item'],
  visible: P`record.is_escalated == false && record.is_closed == false`,
  confirmText: 'This will escalate the case to the escalation team. Continue?',
  successMessage: 'Case escalated successfully!',
  refreshAfter: true,
};

export const CloseCaseAction: Action = {
  name: 'close_case',
  label: 'Close Case',
  objectName: 'crm_case',
  icon: 'check-circle',
  type: 'flow',
  target: 'close_case',
  locations: ['record_header'],
  visible: P`record.is_closed == false`,
  confirmText: 'Are you sure you want to close this case?',
  successMessage: 'Case closed successfully!',
  refreshAfter: true,
};

/**
 * Claim Case — the affordance for a gesture that already worked (#1144).
 *
 * ⚠️ `visible` is DERIVED FROM THE GRANT, not from this card's original text.
 * `case_unassigned_triage_sharing` (`src/sharing/case.sharing.ts`) reads
 * `record.owner_id == null && record.status != "resolved" && record.status !=
 * "closed"` since #1145, and it is the grant that decides whether the agent
 * looking at this button may write the row at all. The card was drafted against
 * the pre-#1145 predicate and asked for `record.is_closed == false`; that flag
 * is derived as `status === 'closed'` and never flips on `resolved`, so copying
 * it would offer a Claim button on resolved ownerless cases the agent is not
 * shared and cannot claim — a button that answers FORBIDDEN. The button and the
 * grant are one sentence, stated twice, and `test/claim-case-one-owner-writer.test.ts`
 * holds them to that.
 *
 * No `confirmText`: the flow opens a screen that asks which working status the
 * agent is claiming into, and that screen IS the confirmation. A modal in front
 * of it would be two dialogs for one gesture.
 */
export const ClaimCaseAction: Action = {
  name: 'claim_case',
  label: 'Claim Case',
  objectName: 'crm_case',
  icon: 'user-plus',
  type: 'flow',
  target: 'claim_case',
  locations: ['record_header', 'list_item'],
  visible: P`record.owner_id == null && record.status != "resolved" && record.status != "closed"`,
  successMessage: 'Case claimed — it is yours now.',
  refreshAfter: true,
};

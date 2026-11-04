// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * Case actions — Escalate and Close delegate to screen flows in
 * `src/service/flows/case-actions.flow.ts` (see the note there for why: modal
 * actions never execute their body in 16.1.0, and script bodies cannot
 * UPDATE a record on a sharing-ruled object; screen flows are the mechanism
 * that demonstrably works, same as `convert_lead` / `schedule_followup`).
 *
 * Taking a case nobody owns is not an action here: a case that sits in the
 * Support Intake queue shows the console's own **Claim** in its header
 * (ADR-0142 D4, hotcrm#2395), which writes the owner and nothing else.
 *
 * ⚠️ Escalate Case and Close Case are offered only to a caller whose permission
 * set may EDIT a case (#2060 item 8): `visible` mirrors the grant, never a
 * convenience flag. Both buttons edit the
 * case they sit on. The sets that may are `service_agent` (declared by both service positions)
 * and the two administrator sets. `sales_rep` and `sales_manager` read cases
 * (an account's support history) with `allowEdit: false`, and
 * `marketing_user` holds no case grant at all. Before this, both buttons were
 * drawn for every reader on the record's state alone, and a sales rep's or a
 * sales manager's Escalate Case ended in "Node 'escalate' failed:
 * update_record(crm_case) failed: You do not have permission" (measured on
 * 18.0.0, pinned in `test/case-actions-offer.test.ts`).
 *
 * `current_user.can(…)` answers from the effective object permissions the
 * server publishes at `/auth/me/permissions`, the map the console evaluates it
 * against, so the offer follows the set rather than a list of names written
 * here. It answers per OBJECT, not per record: it does not see a record-level
 * share, which is not this declaration's to restate (a hand-copied sharing
 * rule in a predicate drifts from the rule).
 *
 * No `confirmText` on either: each flow opens on a screen that asks for the reason (escalation reason, resolution),
 * and that screen IS the confirmation, with its own Cancel. A "Continue?" modal
 * in front of it was two dialogs and three clicks before any input (#2240).
 * `confirmText` is the UI prompt only: what an AI caller is asked to confirm is
 * `ai.requiresConfirmation`, which neither action declares (#1578), so this
 * leaves the AI side as it was. Pinned in `test/case-action-one-dialog.test.ts`.
 */
export const EscalateCaseAction: Action = {
  name: 'escalate_case',
  label: 'Escalate Case',
  objectName: 'crm_case',
  icon: 'alert-triangle',
  type: 'flow',
  target: 'escalate_case',
  locations: ['record_header', 'list_item'],
  // The record's state, then the caller's edit right on cases (see the header).
  visible: P`has(record.is_escalated) && record.is_escalated == false && has(record.is_closed) && record.is_closed == false && current_user.can("crm_case", "edit")`,
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
  // Same grant as Escalate Case: closing a case is editing it (see the header).
  visible: P`has(record.is_closed) && record.is_closed == false && current_user.can("crm_case", "edit")`,
  successMessage: 'Case closed successfully!',
  refreshAfter: true,
};

/**
 * Reopen Case (#2366 row 8) — a resolved or closed case back to In Progress,
 * the one move `case_status_progression` (`case.object.ts`) allows out of
 * either. Before this the move was Edit and the Status dropdown.
 *
 * A declarative update, as `complete_task` (`src/sales/actions/task.actions.ts`)
 * is and for its reason: the platform's action door writes the patch AS THE
 * CALLER, so the case's permissions and sharing judge it as they judge the same
 * status set by Edit, and `case_sla_defaults` derives `is_closed` back to
 * false on the same write. The patch is the status alone.
 *
 * What a reopen does to the SLA is NOT changed here, only stated (the Service
 * Manual, `src/service/docs/crm_service_cases.md`): the case keeps the SLA Due
 * Date it had, the clock is not restarted, a breach already recorded stays
 * recorded, and a reopened case past its due date is overdue live work again.
 * What it does to the close is not changed here either: `case_sla_defaults`
 * clears Closed Date and Resolution Time on any move back to an open status,
 * this button's or Edit's alike, and the next close stamps both afresh (#2375).
 * `test/case-reopen-action.test.ts` reads each of those back after a real run.
 *
 * Offered by the grant Escalate Case and Close Case read (see the header): a
 * reopen edits the case. No `confirmText`: closing it again undoes it.
 */
export const ReopenCaseAction: Action = {
  name: 'reopen_case',
  label: 'Reopen Case',
  objectName: 'crm_case',
  icon: 'rotate-ccw',
  operation: 'update',
  patch: { status: 'in_progress' },
  locations: ['record_header'],
  visible: P`has(record.status) && (record.status == "resolved" || record.status == "closed") && current_user.can("crm_case", "edit")`,
  successMessage: 'Case {{ record.display_title }} reopened.',
  refreshAfter: true,
};

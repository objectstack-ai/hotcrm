// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * Case actions — all three delegate to screen flows in
 * `src/service/flows/case-actions.flow.ts` (see the note there for why: modal
 * actions never execute their body in 16.1.0, and script bodies cannot
 * UPDATE a record on a sharing-ruled object; screen flows are the mechanism
 * that demonstrably works, same as `convert_lead` / `schedule_followup`).
 *
 * ⚠️ Escalate Case and Close Case are offered only to a caller whose permission
 * set may EDIT a case (#2060 item 8), by the rule `claim_case` states below:
 * `visible` mirrors the grant, never a convenience flag. Both buttons edit the
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
 * rule in a predicate is the drift `claim_case` pins against).
 *
 * No `confirmText` on either, by the rule `claim_case` states below: each flow
 * opens on a screen that asks for the reason (escalation reason, resolution),
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
 * Claim Case — the affordance for the unassigned-triage gesture.
 *
 * ⚠️ `visible` MUST mirror the sharing grant, never a convenience flag.
 * `case_unassigned_triage_sharing` (`src/service/sharing/case.sharing.ts`) is what
 * decides whether the agent looking at this button may write the row at all, so
 * the predicate here is copied from it verbatim. ⛔ Never restate it as
 * `record.is_closed == false`: that flag is derived as `status === 'closed'` and
 * never flips on `resolved`, so it would offer a Claim button on resolved
 * ownerless cases the agent is not shared and cannot claim — a button that
 * answers FORBIDDEN. The button and the grant are one sentence stated twice, and
 * `test/claim-case-one-owner-writer.test.ts` holds them to that.
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
  // ⛔ Deliberately NOT `has()`-guarded — the one site the #1890 totality sweep
  // left alone after making every other `visible` in `src/actions/` total. This
  // predicate is the sharing grant's own text, verbatim, and
  // `test/claim-case-one-owner-writer.test.ts` compares the two strings; the
  // grant itself cannot carry `has()`, because `plugin-sharing` compiles a
  // criteria condition with `compileCelToFilter`, which rejects the whole
  // function-call class, and an untranslatable rule is DROPPED by the seeder
  // (#621). `src/service/sharing/case.sharing.ts` writes that out in full, including why
  // `record.owner_id == null` is total one layer down (`{ owner_id: { $null: true } }`).
  // ⚠️ What that reasoning does NOT cover is THIS surface: an action `visible` is
  // interpreted by CEL in the browser against whatever the page holds, which is
  // `{}` for the first renders, so this predicate does abort there. Making it
  // total needs the grant and the parity pin moved together — a maintainer call,
  // not this card's. (#1890)
  visible: P`record.owner_id == null && record.status != "resolved" && record.status != "closed"`,
  successMessage: 'Case claimed — it is yours now.',
  refreshAfter: true,
};

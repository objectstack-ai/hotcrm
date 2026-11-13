// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';

/**
 * Share escalated/critical cases with service managers.
 * ADR-0090 D3: `role_and_subordinates` is gone (positions are flat); the
 * grant now targets the manager position itself.
 *
 * ### ⚠️ `is_closed == false` is DELIBERATE here — ruled 2026-08-31, do NOT align it
 *
 * `is_closed` is derived by `case_sla_defaults` as `effStatus === 'closed'` and
 * never flips on `resolved`, so this grant stands for the WHOLE
 * `resolved → closed` window: a manager keeps `edit` on a critical case that an
 * agent has already resolved, until somebody closes it.
 *
 * That standing access is the point, not an oversight. `resolved` means "the
 * agent believes this is fixed", not "this case is over", and the work that
 * belongs in the gap is the manager's: quality-sampling the resolution, calling
 * the customer back, reopening it when the fix did not hold. Taking the grant
 * away at `resolved` would revoke access exactly when that review starts. It is
 * also how mainstream service clouds shape the same window — a Zendesk
 * satisfaction rating arrives after Solved, ServiceNow surveys on resolution
 * and auto-closes on a timer.
 *
 * Two properties keep this from being the accumulating-permission hazard that
 * #1145 was about: it is NARROW (`critical` only — not every case a manager
 * could ask for) and it is BOUNDED (closing the case ends it, and closing is an
 * ordinary agent gesture, not an admin one).
 *
 * ⛔ Do not rewrite this as `status not_in ['resolved', 'closed']` for symmetry
 * with the `unassigned_triage` view (`src/service/views/case.view.ts`). Same
 * spelling, different question: that view asks "is this work waiting for a
 * human", this one asks "may a manager still reach this case". `test/live-work-predicate-parity.test.ts`
 * holds the difference on its boundary roster, so the alignment turns it red
 * rather than landing silently.
 *
 * ### What would make this the WRONG shape
 *
 * The keep rests on a workflow nobody has yet measured a real user performing,
 * so it is a judgement with named conditions rather than a fact. Any of these
 * turning true makes it a card to re-decide, not a tidy-up to perform:
 *
 *   - cases pile up in `resolved` because nothing closes them, so "bounded"
 *     stops being true in practice and the grant is effectively permanent;
 *   - the post-resolution review moves to a surface that needs no record access
 *     (a survey object, a report), leaving this grant with no consumer;
 *   - the criteria widens past `critical`, at which point "narrow" is gone too;
 *   - somebody measures that no manager ever opens a resolved case — the one
 *     piece of evidence #1328 could not obtain and explicitly declined to
 *     assume either way.
 */
export const CaseEscalationSharingRule = {
  name: 'case_escalation_sharing',
  label: 'Escalated Cases Sharing',
  object: 'crm_case',
  type: 'criteria' as const,
  condition: P`record.priority == "critical" && record.is_closed == false`,
  accessLevel: 'edit' as const,
  sharedWith: { type: 'position' as const, value: 'crm_service_manager' },
};

/**
 * The same escalation visibility one rung up.
 *
 * Positions are FLAT (ADR-0090 D3), so the director rung needs its own grant —
 * without it a service director cannot open the critical case their manager is
 * being paged about. Read-only: the manager on the rule above handles it.
 *
 * ### ⚠️ `is_closed == false` is DELIBERATE here too — ruled 2026-08-31
 *
 * Read the note on `CaseEscalationSharingRule` above in full; it is the same
 * decision and the same conditions for revisiting it. The short form: the flag
 * never flips on `resolved`, so a director keeps `read` on a resolved critical
 * case until it is closed, and that `resolved → closed` window is precisely
 * when a director looks — an escalation is reviewed after it is handled, not
 * while it is still burning. `read`, not `edit`, is the whole difference from
 * the rule above: the director watches the window, the manager works it.
 *
 * ⛔ Do not move this onto `status not_in ['resolved', 'closed']`. Pinned on the
 * boundary roster of `test/live-work-predicate-parity.test.ts`, with the reason.
 */
export const CaseDirectorSharingRule = {
  name: 'case_director_sharing',
  label: 'Escalated Cases — Service Director',
  object: 'crm_case',
  type: 'criteria' as const,
  condition: P`record.priority == "critical" && record.is_closed == false`,
  accessLevel: 'read' as const,
  sharedWith: { type: 'position' as const, value: 'crm_service_director' },
};

/**
 * The agent an escalation took the case from keeps READ on it while it is open
 * (#2060 item 3).
 *
 * `case_escalation_reassign` hands an escalating case to the `service_manager`
 * pool, and `service_agent` reads `crm_case` with `readScope: 'own'` — so the
 * agent who logged a Critical case (escalated on create) or pressed Escalate
 * lost it in the same save, and the console answered "Record not found" over
 * the success toast. The escalation notice links that same agent to the case.
 *
 * The recipient is RECORD-RELATIVE (`type: 'field'`, #14103): the user the
 * hand-off stamps into `escalated_from`, one person per case — never a pool.
 * Not `created_by`: measured on the demo, every case an agent owns from intake,
 * triage or seed has none, so the creator is the wrong person to key on.
 *
 * `read`, not `edit`: the manager works the case now; the agent follows it.
 * Bounded by `is_closed == false`, the window the two rules above keep on
 * purpose (read the note on `CaseEscalationSharingRule`). An empty column
 * shares with nobody.
 */
export const CaseEscalatedFromSharingRule = {
  name: 'case_escalated_from_sharing',
  label: 'Escalated Cases — Previous Owner',
  object: 'crm_case',
  type: 'criteria' as const,
  condition: P`record.is_closed == false`,
  accessLevel: 'read' as const,
  sharedWith: { type: 'field' as const, value: 'escalated_from' },
};

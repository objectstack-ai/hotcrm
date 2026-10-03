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
 * with `case_unassigned_triage_sharing` below. Same spelling, different
 * question: that rule asks "is this work waiting for a human", this one asks
 * "may a manager still reach this case". `test/live-work-predicate-parity.test.ts`
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
  sharedWith: { type: 'position' as const, value: 'service_manager' },
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
  sharedWith: { type: 'position' as const, value: 'service_director' },
};

/**
 * The intake queue's read side: an OPEN case that nobody owns is visible to
 * every service agent, so they can pull it out of triage (#1096).
 *
 * ### What was broken
 *
 * #596 shipped round-robin intake plus a pinned `Unassigned — triage` tab, and
 * `case_auto_assign` is a deliberate NO-OP whenever the `service_agent` pool is
 * empty or unreadable (the anonymous web-to-case path cannot read
 * `sys_user_position` at all). Those cases land ownerless — and `service_agent`
 * holds `crm_case` with `readScope: 'own'`, so an unowned row matched nobody's
 * own-scope. The tab was pinned in every Cases list including the agent's, and
 * it returned zero rows for the one persona it exists for.
 *
 * ### Why THIS shape (the ruling on #1096, option A)
 *
 * The grant is **self-limiting**: it holds only while `owner_id` is empty, so
 * the instant an agent claims the case the criteria stops matching, the share
 * is revoked on the next reconcile, and ordinary own-scope resumes. There is no
 * accumulating permission surface — the rule's own condition destroys it. That
 * is what makes it narrower than the two rejected alternatives: `viewAllRecords`
 * on the profile (option C) hands every agent every customer's entire case
 * history to solve a null-owner problem, and unpinning the tab (option B) is not
 * expressible — `ViewTabSchema` has no per-profile scoping — so it means
 * removing the tab for everyone.
 *
 * `edit`, not `read`: triage is a pull queue. An agent who can see the row but
 * not write it cannot claim it, and claiming is the whole point.
 *
 * ### ⚠️ Why there is no `has()` guard here, and why adding one would break it
 *
 * A sharing condition is NOT an interpreted CEL predicate. `plugin-sharing`
 * compiles it to a pushdown filter with `compileCelToFilter`, which rejects the
 * whole function-call class — so a `has(record.owner_id)` guard makes this rule
 * *untranslatable*, and the seeder then refuses it outright (never degrading it
 * to match-all). The rule would be declared, documented and silently unseeded:
 * exactly the #621 defect. The house totality rule (AGENTS.md #630) governs the
 * two INTERPRETED surfaces — object `validations[]` / field predicates, and
 * record-change flow conditions — and does not reach this one.
 *
 * Totality is still answered, one layer down: `record.owner_id == null` lowers
 * to `{ owner_id: { $null: true } }`, and `$null` is the operator form that
 * treats an ABSENT key and a NULL column alike. That matters because the two
 * shapes are both real — `driver-memory` stores only the columns a row was
 * written with, SQL stores every column — and a marketplace app does not choose
 * its host's datasource. Both are MEASURED, end to end, in
 * `test/unassigned-case-triage-reach.test.ts`; the compiler's own verdict on
 * `has()` is pinned in `test/sharing-seeding.test.ts`.
 *
 * ### ⚠️ Why the second clause is a STATUS chain, not `is_closed == false`
 *
 * This grant is deliberately NARROWER than it was. `is_closed` is derived by
 * `case_sla_defaults` as `effStatus === 'closed'`, so it never flips on
 * `resolved` — and the old predicate therefore handed every service agent
 * `edit` on every RESOLVED ownerless case, forever. A resolved case is not
 * backlog and not work waiting for a human, so the grant is now the same
 * "no longer live work" predicate the load-balancing hooks
 * (`CLOSED_CASE_STATUSES` in `_case-assignment.ts`) and `case_sla_monitor`
 * already use: the case is shared only while its status is neither `resolved`
 * nor `closed`. `test/live-work-predicate-parity.test.ts` holds the four
 * consumers to that one set, BY NAME.
 *
 * ⚠️ The tightening does NOT break the claim seam. Record access is resolved
 * against the STORED row, so an agent resolving an unowned open case straight
 * out of triage is still reachable (the case is open at the moment of the
 * write) — #1143's "finishing a case is not picking it up" is unchanged. What
 * the agent loses is reopening an *already* resolved ownerless case, which puts
 * `resolved` in exactly the bucket `closed` has been in since #1134: reopening
 * a terminal unowned case is an admin move, not a triage move.
 *
 * The spelling is the `!=` chain rather than `!(record.status in [...])`, and
 * that is measured, not stylistic. Both compile, but the membership form lowers
 * to a TOP-LEVEL `$not` wrapping an `$in`, a combination absent from the
 * measured operator matrix in `test/sharing-seeding.test.ts` and on the one
 * operator that file records a driver regression for. The chain lowers to
 * `{ $and: [{ status: { $ne: … } }, …] }` — plain conjunction of the operator
 * that matrix lists as supported. An untranslatable or unexecutable sharing
 * condition is not a loud failure: the seeder DROPS the rule and the tab goes
 * empty again (#621), so this rule takes the portable form.
 *
 * `status` needs no totality guard the way `owner_id` does: it is `required`
 * with `storage: { notNull: true }` on `crm_case`, so unlike the ownerless
 * column it is never the absent-key shape.
 *
 * A resolved or closed unowned case stays hidden on purpose: it is history, not
 * backlog, and the tab's row count has to keep meaning "work waiting for a
 * human".
 */
export const CaseUnassignedTriageSharingRule = {
  name: 'case_unassigned_triage_sharing',
  label: 'Unassigned Cases — Triage',
  object: 'crm_case',
  type: 'criteria' as const,
  condition: P`record.owner_id == null && record.status != "resolved" && record.status != "closed"`,
  accessLevel: 'edit' as const,
  sharedWith: { type: 'position' as const, value: 'service_agent' },
};

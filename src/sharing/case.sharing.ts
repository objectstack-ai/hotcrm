// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';

/**
 * Share escalated/critical cases with service managers.
 * ADR-0090 D3: `role_and_subordinates` is gone (positions are flat); the
 * grant now targets the manager position itself.
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
 * A closed unowned case stays hidden on purpose: it is history, not backlog,
 * and the tab's row count has to keep meaning "work waiting for a human".
 */
export const CaseUnassignedTriageSharingRule = {
  name: 'case_unassigned_triage_sharing',
  label: 'Unassigned Cases — Triage',
  object: 'crm_case',
  type: 'criteria' as const,
  condition: P`record.owner_id == null && record.is_closed == false`,
  accessLevel: 'edit' as const,
  sharedWith: { type: 'position' as const, value: 'service_agent' },
};

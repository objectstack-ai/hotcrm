// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

export const ServiceAgentProfile = {
  name: 'service_agent',
  label: 'Service Agent',
  objects: {
    // Reference context an agent needs to work ANY ticket — a customer's cases
    // are meaningless without seeing the account/contact behind them, so these
    // are org-visible reads (viewAllRecords: true), NOT own-only. This was the
    // security-private-no-readscope warning's real signal: allowRead on a
    // private object with no scope had silently locked agents out of every
    // account they didn't personally own.
    // `allowExport` where an export surface exists — canonical note in
    // `src/profiles/index.ts`. `crm_opportunity` carries no export bit: this
    // set has no read on it at all, and the axis never widens read.
    crm_lead:        { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false, allowExport: true },
    crm_account:     { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false, allowExport: true },
    crm_contact:     { allowCreate: false, allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: true,  modifyAllRecords: false, allowExport: true },
    crm_opportunity: { allowCreate: false, allowRead: false, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    // Cases + tasks: an agent's own queue by default (readScope: 'own').
    // Cross-agent visibility exists for CASES only — the escalation rules widen
    // open critical cases to service_manager / service_director. `crm_task` has
    // no sharing rule at all, so an agent reading an account org-wide still
    // sees only their own tasks on it (#549).
    crm_case:        { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const, allowExport: true },
    // `allowTransfer` on `crm_task` ONLY — canonical note in
    // `src/profiles/index.ts`. Narrow and load-bearing: escalating a case fires
    // `case_status_side_effects`, which opens the follow-up task OWNED BY the
    // account owner (`case.hook.ts`). That insert runs on `ctx.api` with the
    // agent's own context, so planting it under another user is a transfer and
    // is denied without this bit — the case update would fail with it. This is
    // "assign work to a colleague", not "reassign the ticket": the agent holds
    // no transfer grant on `crm_case` or any customer record.
    //
    // ⚠️ Escalation DOES now move a case to the `service_manager` pool (#1070),
    // and it does so with no `crm_case` grant here — deliberately. That
    // hand-off runs on the `beforeUpdate` seam, which the #3004 guard cannot
    // see (measured, three readings, in `_case-assignment.ts`'s header and
    // pinned in `test/case-assignment.test.ts`), so the case moves as part of
    // the escalation write the automation is already performing rather than as
    // an agent-initiated transfer. Doing it the other way — a `ctx.api` write
    // from `afterUpdate` — WOULD need `crm_case.allowTransfer` here, which
    // would let an agent reassign any case they can edit. That is a
    // permission-model decision and is not being taken as a side effect of a
    // hook: this line stays `crm_task` only.
    crm_task:        { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: true,  viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const, allowTransfer: true },
    // #592 — `log_call` / `log_meeting` are scoped to `crm_case` too, and an
    // agent who cannot INSERT a `crm_event` gets a button that 403s. Same
    // own-scoped shape as their tasks.
    crm_event:       { allowCreate: true,  allowRead: true,  allowEdit: true,  allowDelete: true,  viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    crm_event_attendee: { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: false, modifyAllRecords: false },
    crm_product:     { allowCreate: false, allowRead: true,  allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    // The knowledge base is this team's own surface: agents draft and revise
    // articles (draft → in_review → published is enforced by the KB flow, not by
    // CRUD), and read every published article regardless of author. Archiving
    // is destructive-by-policy, so deletion stays with admins. Before #488 the
    // object had no grant at all — the "Knowledge" nav item was denied for
    // everyone, including the agents it was built for.
    // Agents rate the articles they use to close cases (#601). Create + edit
    // their OWN row (`modifyAllRecords: false` keeps them off everyone else's
    // vote); no delete — a withdrawn opinion is a changed verdict, not an
    // erased one.
    crm_article_feedback: { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
    crm_knowledge_article: { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
  },
  fields: {
    'crm_case.is_sla_violated':        { readable: true, editable: false },
    'crm_case.resolution_time_hours':  { readable: true, editable: false },
    // Internal notes are the agent's working memory on a ticket — full access
    // here, read-only for sales_manager, masked for sales_rep (#488).
    'crm_case.internal_notes':         { readable: true, editable: true },
    // Account health is renewal-team data an agent reads for context only.
    'crm_account.health_score':        { readable: true, editable: false },
  },
};

/**
 * The SERVICE MANAGER binding (#1779) — the same set, under the position's name.
 *
 * ### What was ruled
 *
 * `service_manager` is a declared position (`src/sharing/positions.ts`) that
 * `case_escalation_sharing` names and that `case_escalation_reassign` routes
 * escalating cases to — measured, 35 of them on a demo box — and no permission
 * set reached it, so the persona was denied every CRM object (403). Director
 * seat, decision batch #92, 2026-09-08, under the maintainer's standing
 * 「继续决策」 delegation: bind the EXISTING `service_agent` set to the
 * `service_manager` position. ⛔ B (author a manager-specific profile) was
 * refused — no measured puller for a manager-only grant. ⛔ C (reroute the
 * escalation pool) was refused — it deletes the persona's reason to exist.
 *
 * ### Why the binding is a NAME and not a key — measured, not inferred
 *
 * There is no authorable binding on either side. `PermissionSetSchema` rejects
 * `profiles` / `roles` / `users`, and `PositionSchema` rejects `permissionSets`
 * with its own prescription: capability reaches a position ONLY through
 * `sys_position_permission_set` rows, "created in Setup or by an app's
 * `kernel:ready` binder" — and a pure-metadata app ships neither.
 *
 * What it ships instead is a name. Measured on a fresh 17.3.0 SQLite box:
 * `sys_position_permission_set` holds exactly ONE row (`everyone` →
 * `member_default`, the ADR-0090 D5 baseline the platform binds itself), and
 * yet `POST /api/v1/security/explain` for a `service_agent` position holder
 * answers `permissionSets: [service_agent, member_default]`, crediting the
 * object-level grant to `[service_agent]` `via: position:service_agent`. The
 * resolver is `resolvePermissionSets()` in `@objectstack/plugin-security`: it
 * matches the caller's POSITION NAMES against declared `PermissionSet.name`,
 * so a set named for a position is bound to it with no row at all.
 *
 * ⇒ For this app, "bind set X to position P" has exactly one spelling: declare
 * X's grants under the name P. Hence this export rather than a new file.
 *
 * ### Why a spread and not a copy
 *
 * `objects` and `fields` are carried by REFERENCE, so the two personas share
 * one grant table and cannot drift: nothing here can widen the agent's grants,
 * and a future edit to them lands on both at once. That is the ruling's own
 * finding — escalation handling is the same object access as working a ticket —
 * expressed in a way the next reader cannot half-apply. ⛔ Do not expand this
 * into a literal second grant table to "make it explicit"; that would be
 * option B, refused, and it would let the two silently diverge.
 *
 * ### Reversal (ruling item 4)
 *
 * If a customer needs a manager grant that DIFFERS from an agent's, it comes
 * back as a product card with the puller named — and only then does this become
 * an authored set of its own.
 */
export const ServiceManagerProfile = {
  ...ServiceAgentProfile,
  name: 'service_manager',
  label: 'Service Manager',
};

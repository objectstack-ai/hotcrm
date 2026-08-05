// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Profile Definitions Barrel
 *
 * ─── `allowExport` — the opt-in bulk-egress axis (@objectstack 17, #3544) ───
 *
 * This is the canonical note; the profiles point here.
 *
 * Before 17.0 the export axis was advisory: an unset `allowExport` inherited
 * read, so "can list ⇒ can export" and the bit only ever hid a button. 17.0
 * makes it a real gate and inverts the default — `resolveUserExportAllowed`
 * (plugin-security) returns true only for an explicit `allowExport: true`, and
 * neither `viewAllRecords` nor `modifyAllRecords` substitutes for it. An unset
 * bit now DENIES. Both bulk-egress doors ask before they read: the list views'
 * built-in `exportOptions`, and `ReportService.assertExportAllowed`, which
 * fails a report export closed with `EXPORT_NOT_PERMITTED`.
 *
 * So the grants below are authored, not inherited. The rule, pinned by
 * `test/authorization-coverage.test.ts`:
 *
 *   a profile grants `allowExport` on an object IFF it already holds
 *   `allowRead` there AND the app ships an export surface for that object —
 *   a list view declaring `exportOptions`, or a report whose dataset is
 *   built on it.
 *
 * That union is exactly `crm_account`, `crm_case`, `crm_contact`, `crm_lead`,
 * `crm_opportunity` today. Adding `exportOptions` to a view (or a report over
 * a new dataset) means adding the matching grant here in the same change — the
 * guard fails otherwise, which is the point: a surface nobody can use is the
 * failure this axis exists to make loud instead of silent.
 *
 * Export is READ-DERIVED (`export ⊆ list`), so the grant opens the door but
 * does not widen the rows: record scope, RLS and sharing still apply on top. A
 * `sales_rep` exporting `crm_opportunity` gets their own book, not the org's.
 *
 * `guest_portal` deliberately carries none. Per ADR-0090 D9 a set holding
 * `allowExport` is high-privilege and cannot be bound to the `everyone` or
 * `guest` anchors at all — granting it there would both hand anonymous
 * visitors bulk table egress and make the set unbindable.
 */
/**
 * ─── `allowTransfer` — the ownership-transfer axis (#548) ───────────────────
 *
 * This is the canonical note; the profiles point here.
 *
 * HotCRM has ONE owner column: the platform's `owner_id`, injected into every
 * business object by the registry (`applySystemFields`) and auto-stamped to the
 * inserting user. It is the column OWD, sharing rules, owner-scope widening and
 * the `is_private` row filter all read — so whoever can write it decides who may
 * see and edit the row.
 *
 * The app used to author its own `owner` lookup beside it. Reassigning that
 * field moved the record in every list and report and moved NO access at all,
 * and it did so for any user with plain edit rights — a transfer with none of
 * the transfer semantics. #548 removed it.
 *
 * With one column, ownership writes go through the platform's gate: an
 * insert planting a record under another user, or an update reassigning /
 * disowning one, is DENIED unless the caller holds `allowTransfer` — enforced
 * today through the ordinary insert/update door, not merely declared
 * (`@objectstack/spec` `permission.zod.ts`, the #3004 owner_id guard).
 * `modifyAllRecords` implies it. Two writes are deliberately NOT transfers and
 * need no grant: an insert leaving `owner_id` empty (auto-stamped to the
 * caller) and a form save echoing the unchanged owner back.
 *
 * The rule the grants below follow, pinned by
 * `test/authorization-coverage.test.ts`:
 *
 *   `allowTransfer` is granted IFF the set already holds `allowEdit` on that
 *   object, and only to `system_admin` (every business object) and
 *   `sales_manager` (exactly the objects it holds `modifyAllRecords` on — the
 *   sales book it owns the number for).
 *
 * On those objects `modifyAllRecords` already implies the bit, so authoring it
 * grants nothing new. It is authored anyway, for the same reason `allowExport`
 * is: the capability a persona is meant to have should be readable in the
 * profile, and it must survive a future narrowing of `modifyAllRecords` rather
 * than disappearing with it. Reps and service agents hold no transfer grant —
 * for them ownership is assigned, never taken.
 */
export { GuestPortalProfile } from './guest-portal.profile';
export { MarketingUserProfile } from './marketing-user.profile';
export { SalesManagerProfile } from './sales-manager.profile';
export { SalesRepProfile } from './sales-rep.profile';
export { ServiceAgentProfile } from './service-agent.profile';
export { SystemAdminProfile } from './system-admin.profile';

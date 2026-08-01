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
export { GuestPortalProfile } from './guest-portal.profile';
export { MarketingUserProfile } from './marketing-user.profile';
export { SalesManagerProfile } from './sales-manager.profile';
export { SalesRepProfile } from './sales-rep.profile';
export { ServiceAgentProfile } from './service-agent.profile';
export { SystemAdminProfile } from './system-admin.profile';

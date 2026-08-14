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
 * bit now DENIES.
 *
 * WHERE it is enforced, measured on a running dev server (#798). One route
 * carries bulk egress in this app: `GET /api/v1/data/:object/export`
 * (`csv` / `xlsx` / `json`), gated by `enforceExportPermission` →
 * `security.canExport` in `@objectstack/rest`. A principal holding the grant
 * gets 200 and the rows; one without it gets 403 `EXPORT_NOT_PERMITTED`.
 *
 * A list view's `exportOptions` is NOT a second door — it declares which
 * formats the toolbar's Export button offers, and that button calls the very
 * same route. So the gate is object-wide and reachable with `curl`, which is
 * exactly why it has to be enforced server-side rather than by hiding a button.
 *
 * SHAPE (@objectstack/spec 17.0.0, #8010, maintainer ruling 2026-08-12): the
 * declaration is the OBJECT form `exportOptions: { formats: ['csv', 'xlsx'] }`.
 * The bare array this app used through 17.0.0-rc.6 is the legacy spelling; it
 * still parses and LIFTS to `{ formats: [...] }`, so `z.input` accepts both
 * while `z.output` — everything that reads loaded metadata, this app's own
 * guards included — only ever sees the object. That asymmetry is why the bump
 * to 17.0.0 blinded the guard below rather than failing it: the views still
 * declared their surfaces, and a reader testing the legacy array's `.length`
 * silently measured `undefined` on every one of them. Read `.formats`.
 * `'pdf'` left the format enum in the same change (#1301 NOT_PLANNED); this
 * app never declared it.
 *
 * `ReportService.assertExportAllowed` is a genuinely separate gate, but it
 * belongs to the `reports` capability (saved reports + emailed digests over
 * `sys_saved_report`), which this app does not require — `/api/v1/reports`
 * answers 501 on a default boot, and the Console's report page ships no export
 * affordance either way. It is not what any grant below lands on. Do not read
 * the rule below as depending on it: #798 was filed on exactly that reading.
 *
 * So the grants below are authored, not inherited. The rule, pinned by
 * `test/authorization-coverage.test.ts`:
 *
 *   a profile grants `allowExport` on an object IFF it already holds
 *   `allowRead` there AND the app ships an export surface for that object —
 *   that is, a list view declaring `exportOptions`.
 *
 * That rule is an AUTHORING DISCIPLINE about which affordances this app ships,
 * not a statement about reachability: the export route exists for every
 * API-exposed object, so a grant on any of them would work. The discipline
 * keeps the grant list to objects a user can actually reach an export from,
 * so the permission table stays a description of the product rather than of
 * the platform. Reachability is pinned separately, by the `enable` guard at
 * the end of that same test file.
 *
 * That union is exactly `crm_account`, `crm_case`, `crm_contact`, `crm_lead`,
 * `crm_opportunity` today, each behind the `exportOptions` on its own list
 * view. Adding `exportOptions` to a view means adding the matching grant here
 * in the same change — the guard fails otherwise, which is the point: a
 * surface nobody can use is the failure this axis exists to make loud instead
 * of silent.
 *
 * A REPORT IS NOT AN EXPORT SURFACE. The Console's report page renders a chart
 * and a data table and offers no download (measured on a running server in
 * #798), and `ReportService`'s own export gate belongs to the `reports`
 * capability above. Until #817 the guard counted reports anyway, and
 * `crm_case` hung off that leg alone: the grant was live but reachable only by
 * `curl`, and deleting the case reports would have made the guard demand this
 * useful grant be deleted with them. #817 gave the Cases list view its own
 * `exportOptions` and retired the report leg, so a report over some future
 * dataset no longer conjures a grant requirement out of a page with no
 * download button.
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

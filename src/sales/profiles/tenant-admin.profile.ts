// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { SystemAdminProfile } from './system-admin.profile';

/**
 * Tenant Administrator — the admin persona of the SaaS / multi-org composition
 * (#1361). Registered ONLY by that composition; the community app ships
 * `system_admin` exactly as it always has and this file is not in its artifact.
 *
 * ### Why a second admin set instead of narrowing the first
 *
 * The two admins are different people. `system_admin` is the operator of a
 * single-org install: the one who owns the deployment. A tenant admin owns an
 * ORGANIZATION inside somebody else's deployment, and under an `isolated`
 * posture every other organization in that database is none of their business.
 * A profile is a description of a persona, so where the persona differs the
 * profile does — narrowing `system_admin` in place would have changed the
 * community app's meaning to describe a customer it does not have.
 *
 * ### The OBJECT grants are shared, on purpose and by reference
 *
 * A tenant admin administers their own org's records with exactly the authority
 * `system_admin` has over a single-org install's records — same objects, same
 * CRUD, same all-records depth, same transfer and export bits. So the map is
 * DERIVED from `SystemAdminProfile.objects` rather than transcribed.
 *
 * That is the load-bearing half. Permission sets are explicit-allow only, so an
 * object missing from the map is permission-denied for tenant admins too, and a
 * transcribed copy would drift the first time an object shipped — the exact
 * defect `test/authorization-coverage.test.ts` exists to catch on the community
 * set (#488: objects that shipped with navigation, views, hooks and seeds but a
 * grant in no set at all). Deriving means a new object lands in both admins the
 * day it lands in one, with nothing to remember.
 *
 * ### What changes: `manage_users` → `manage_org_users`
 *
 * `manage_users` is `scope: 'platform'` in the platform's own capability
 * registry — "Create, edit, and deactivate users across the platform". Handing
 * that to a tenant is handing them every other tenant's people. Its org-scoped
 * sibling, `manage_org_users` ("Manage members within the caller's
 * organization"), is the member-management authority a tenant admin should hold,
 * and it is declared in the released `@objectstack/spec` 17.1.0 this app depends
 * on (verified against the installed `PLATFORM_CAPABILITIES`, not against a
 * newer platform checkout — an app on a released line cannot grant a capability
 * that line has not shipped).
 *
 * Both are DECLARATIONS here, not enforcement: measured against the installed
 * 17.1.0 packages, `manage_users` appears in a single comment and nothing reads
 * either name — the member-management door is the enterprise organizations
 * runtime's, and it is the edition that supplies the gate. That is the shape the
 * maintainer's 2026-08-11 ruling asks for and `objectstack.config.ts` already
 * follows for `hierarchy-security`: 「本项目是元数据app，在企业版运行就具备企业版
 * 相关的能力，不重复开发。」 The app states what it MEANS; the edition enforces.
 *
 * ### What `view_all_data` / `modify_all_data` mean under the wall — the audit
 *
 * They are KEPT, and they are bounded by the organization, not by them.
 *
 * Two measurements, both against the 17.1.0 line — the version
 * installed AT THE TIME they were taken, not the current pin (#1676: this
 * repo has installed 17.3.0 since PR #1577).
 *
 * ⚠️ The zero-occurrence result in 1 — the load-bearing half — reproduced on
 * 17.2.0 and has not been re-run since (#1676). The three CONTROL counts in
 * it do NOT reproduce: they are
 * as-measured-then figures and have since moved. They are kept at their
 * measured values on purpose rather than refreshed, because what they are
 * evidence FOR is that the sweep can find a name it looks for — never a
 * current total. ⛔ Do not cite them as one, and ⛔ do not "fix" them by
 * pasting today's numbers over a 17.1.0 measurement.
 *
 *  1. **Neither string is read by anything.** `view_all_data` and
 *     `modify_all_data` occur in ZERO installed `@objectstack/*` JavaScript
 *     files (control probes in the same sweep: `manage_sharing` 15 files,
 *     `manage_metadata` 25, `setup.access` 32 — so the sweep can find a name it
 *     is looking for). They are app-declared vocabulary. The authority that is
 *     really enforced is the PER-OBJECT `viewAllRecords` / `modifyAllRecords`
 *     bits in the map above, which the sharing layer reads on every request.
 *  2. **The organization predicate is not part of that layer.** A tenant-scoped
 *     read is compiled by the DRIVER from the execution context's tenant id,
 *     underneath permissions and sharing entirely. Measured on a real engine: a
 *     caller in `org_a` reading `crm_account` sees 1 of the 2 rows in the table
 *     — and still sees 1 of 2 with the tenancy posture flipped to `single`,
 *     which is what shows the boundary belongs to the driver and the context
 *     rather than to a deployment knob a profile might hope to out-rank.
 *
 * So "all data" answers a question about DEPTH inside one organization — all
 * rows regardless of owner — and no permission-set bit can widen it past the
 * wall, because the wall is not applied by the permission set. The one context
 * that does cross it is a system context (`isSystem`), which no profile grants
 * and no session produces. Keeping the two grants therefore says the true
 * thing about a tenant admin: inside their org, they see and edit everything.
 *
 * ### What is deliberately DROPPED, and why it is not an oversight
 *
 * `customize_application`, `manage_profiles` and `manage_roles` are not
 * granted. All three describe METADATA authoring, and under a walled posture
 * the only metadata-authoring capability the platform has is `manage_metadata`
 * — `scope: 'platform'`, which unlocks env-wide tier-B authoring (objects,
 * flows) with cross-tenant reach. There is currently no key that lets a tenant
 * admin author even their own org's overlays without also handing them that
 * reach, so granting these three would describe an authority the deployment
 * cannot safely give.
 *
 * Blocked-by: objectstack-ai/objectstack#12702 — org-scoped presentation
 * customization authority. When that capability ships, the tenant admin gains
 * it here and this paragraph shrinks to a grant.
 *
 * `manage_sharing` IS granted: the platform declares it `scope: 'org'`
 * ("Administer record sharing … beyond one's own records"), which is precisely
 * a tenant admin's job over their own org's records.
 *
 * `view_setup` is kept for parity with the community admin — it is this app's
 * own Setup-entry vocabulary and, like the two above, has no platform consumer
 * on this line. (The platform's own `setup.access` is `scope: 'platform'` and
 * is not granted here for the same reason `manage_users` is not.)
 */
export const TenantAdminProfile = {
  name: 'tenant_admin',
  label: 'Tenant Administrator',
  // Derived, never transcribed — see the note above. Spread rather than
  // aliased so the two sets are independent values in the built artifact.
  objects: { ...SystemAdminProfile.objects },
  systemPermissions: [
    'view_setup',
    // The one substitution this profile exists for: org-scoped member
    // management instead of platform-wide user management.
    'manage_org_users',
    // Org-bounded by the driver's tenant predicate — see the audit above.
    'view_all_data', 'modify_all_data',
    'manage_sharing',
  ],
};

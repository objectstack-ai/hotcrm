// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The `tenancy` service a reduced test stack has to declare for itself
 * (ObjectStack 17.2.0).
 *
 * ### What this exists for
 *
 * Two files in this suite boot the enforcement stack for real — ObjectQL +
 * `plugin-security` + `plugin-sharing` over `objectstack.config.ts` — and then
 * ask the engine what a persona can see. Neither mounts `plugin-auth`, because
 * nothing they measure needs it.
 *
 * `plugin-auth` is also the thing that registers the **`tenancy`** service, and
 * from 17.2.0 that service decides whether declared sharing rules get seeded at
 * all. `SharingServicePlugin`'s `sharingPosture()` reads `ctx.getService(
 * 'tenancy')` and, when the lookup throws, falls back to `'isolated'` — the
 * strictest WALLED posture, on the deliberate ADR-0105 rule that an
 * unresolvable posture is not evidence of `single`. A walled posture then
 * routes rule seeding through `resolveRuleSeedPasses`, which enumerates
 * `sys_organization` and seeds **once per organization** (objectstack#10103:
 * "Materialize the RBAC catalog per organization"). A stack with no
 * organizations therefore gets **zero passes** and zero seeded rules.
 *
 * Through 17.1.0 `bootstrapDeclaredSharingRules` ran unconditionally, once,
 * organization-less, so a harness that never declared a posture still got its
 * rules — the omission was invisible.
 *
 * ### Measured, on the 17.2.0 upgrade (#1441)
 *
 * The same app config, the same `memory` driver, the same zero-organization
 * database, booted four ways:
 *
 *   | tenancy service            | organizations | `sys_sharing_rule` rows |
 *   | -------------------------- | ------------- | ----------------------- |
 *   | absent (the bare harness)  | none          | **0**                   |
 *   | `posture: 'single'`        | none          | 10                      |
 *   | `posture: 'isolated'`      | none          | **0**                   |
 *   | absent, org inserted after | one           | 10 (org-creation hook)  |
 *
 * And the shipped app, for the control that decides which row is the product's:
 * `objectstack start` over this same config — the full plugin set, `plugin-auth`
 * included — seeds all **10** rules with `organization_id: null` on a database
 * holding **zero** `sys_organization` rows. That is the `single`-posture row.
 *
 * So the empty catalogue is an artefact of the harness's reduced plugin set, not
 * a property of HotCRM: the community app runs single-tenant, and the reduced
 * stack simply had no way to say so. This module is that missing sentence.
 *
 * ### Why a stand-in rather than an organization row
 *
 * Inserting a `sys_organization` row also seeds the rules (the fourth row
 * above), but it seeds them **organization-stamped**, against fixtures whose
 * records carry no organization at all — a different tenancy shape from the one
 * the shipped app was measured in, introduced into tests that are about record
 * visibility rather than about tenancy. The probe reproduces the shipped
 * posture exactly, `organization_id: null` rules included, and changes nothing
 * else.
 *
 * ⚠️ Mount it BEFORE `SharingServicePlugin`: the posture is read during that
 * plugin's own boot, so a probe registered after it is registered too late.
 */

/** The tenancy posture vocabulary this probe can report. */
export type TenancyPosture = 'single' | 'group' | 'isolated';

/**
 * A minimal `tenancy` service reporting `posture`.
 *
 * The two members are the ones `SharingServicePlugin.sharingPosture()` reads:
 * `posture` first (normalised through the platform's own vocabulary), then
 * `isolationActive` as the older boolean fallback. Both are stated so the probe
 * cannot answer one way through one member and another way through the other.
 */
export function tenancyProbe(posture: TenancyPosture = 'single') {
  return {
    name: 'test-tenancy-probe',
    version: '1.0.0',
    init(ctx: { registerService: (name: string, service: unknown) => void }): void {
      ctx.registerService('tenancy', {
        posture,
        isolationActive: posture !== 'single',
      });
    },
  };
}

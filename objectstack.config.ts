// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { composeStacks } from '@objectstack/spec';

// The app package — its manifest, its capability slate and the artifact's
// locale configuration. It takes the collections it registers as an argument;
// `src/sales/index.ts` says why.
import { createHotCrmAppStack } from './src/sales/index.js';
// The support module — a package of its own, assembling its own collections.
import { createHotCrmServiceStack } from './src/service/index.js';

// The app package's metadata, collected and ORDERED — see
// `objectstack.composition.ts`, which also records why that collection cannot
// live in this file (⛔ this module may carry no named export: the build parses
// it against a `.strict` stack schema and fails on any key but the default).
import {
  appObjects, appActions, appDashboards, appDatasets, appReports,
  appMappings, appApps, appViews, appPages, appTranslations, appProfiles,
  appHooks, appFlows, appSkills,
  CrmSharingRules, CrmPositions,
  seedDataFor,
} from './objectstack.composition.js';
import { SystemAdminProfile, TenantAdminProfile } from './objectstack.composition.js';
import { resolveComposition } from './src/sales/data/index.js';
import { DemoBootstrapFlow } from './src/sales/flows/index.js';

// ─── Which SHAPE of HotCRM this build assembles (#1361) ───────────────────
//
// `default` (unset, or `HOTCRM_COMPOSITION=default`) is the community app and
// is byte-for-byte what it always was — every field below that a composition
// touches falls through to the same value it had before this knob existed.
// `HOTCRM_COMPOSITION=saas` assembles the shape a multi-org operator deploys on
// the enterprise runtime under a walled tenancy posture; an unrecognised value
// throws here rather than quietly assembling the wrong app (see
// `resolveComposition`).
//
// The knob is resolved ONCE, here at the root, and handed to the package stack
// it affects already applied — every field it touches belongs to the app
// package. It is deliberately COMPOSITION-time and uniform. The platform's
// `seed-replayer` gives every newly founded organization its own private copy
// of the registered dataset union (maintainer ruling 2026-08-27,
// objectstack#12701: 「种子也不应该是全局的呀 …只是参考呀，租户要自己删除呀」),
// but it has no per-family or per-tenant selection and none is chartered — so
// WHAT gets replayed is decided once, here, for every tenant alike.
//
// Three things change, and nothing else. There is no runtime branch anywhere in
// `src/`, and no enterprise package is imported: an artifact built either way
// runs on the community runtime.
//
//  1. `data` — the catalogue family only. See `SaasTenantSeedData`.
//  2. `flows` — `demo_bootstrap` is dropped. It is a DEMO sweep (its own header
//     says so) and under the wall it is actively wrong, not merely useless: it
//     runs `runAs: 'system'`, and a system context is the one context the
//     organization predicate does not apply to. Measured on a real engine under
//     `OS_TENANCY_POSTURE=isolated` — the sweep's own shape, a system-context
//     select of ownerless rows followed by an owner stamp, sees rows in EVERY
//     organization and writes org A's first user onto org B's row. That is an
//     identity crossing the wall. `test/saas-composition.test.ts` reproduces it
//     rather than asserting it in prose. (It is also redundant in this shape:
//     the catalogue's `crm_product` declares no `owner_id`, so a catalog-only
//     tenant has nothing ownerless for the sweep to claim.)
//     `demo-staffing` needs no exclusion — `src/sales/sharing/demo-staffing.ts` is
//     deliberately not exported from `src/sales/sharing/index.js` and not registered
//     in any composition (#640, pinned by `test/demo-staffing.test.ts`).
//  3. `permissions` — `system_admin` is replaced by `tenant_admin`, which holds
//     org-scoped `manage_org_users` instead of platform-scope `manage_users`.
//     Read `src/sales/profiles/tenant-admin.profile.ts` for the full audit, including
//     what `view_all_data` / `modify_all_data` mean under the wall.
const composition = resolveComposition();
const isSaas = composition === 'saas';

/**
 * The seed families each package registers under this composition.
 *
 * A family is registered by the package that OWNS its object — `defineStack`
 * refuses `data` naming an object the stack does not define — so this is a
 * split, not a choice. `objectstack.composition.ts` holds the replay order it
 * came out of.
 */
const seedData = seedDataFor(composition);

/**
 * Flows the app package registers under this composition.
 *
 * Filtered by IDENTITY, not by name string: renaming `demo_bootstrap` must not
 * silently turn the exclusion into a no-op that ships the sweep to every
 * tenant. `test/saas-composition.test.ts` additionally asserts the filter
 * removed exactly one flow, so a refactor that makes it match nothing is red.
 * The support module's flows are its own and no composition touches them.
 */
const compositionFlows = isSaas ? appFlows.filter((flow) => flow !== DemoBootstrapFlow) : appFlows;

/** Permission sets this composition registers — same identity discipline. */
const compositionPermissions = isSaas
  ? [...Object.values(appProfiles).filter((set) => set !== SystemAdminProfile), TenantAdminProfile]
  : Object.values(appProfiles);

/**
 * ONE release artifact, TWO packages (ADR-0130 D4).
 *
 * `manifest: 'preserve'` is the only option that separates "one artifact
 * carrying N packages" from the pick-one composition every other strategy
 * performs. It is ADDITIVE: the composed stack is the flattened one the
 * platform has always produced — every collection concatenated to the top
 * level, which is what the metadata service reads — PLUS `packages[]`, one
 * entry per input stack carrying that package ASSEMBLED. `packages[]` is what
 * `ObjectQL.registerApp` registers package by package, and it is where
 * per-package OWNERSHIP comes from; without it a two-package artifact installs
 * two package records owning nothing at all.
 *
 * The App package is LAST deliberately, and that is not the load-bearing half:
 *
 *  - `preserve` is additive, so the singular `manifest` is still picked by the
 *    default `'last'` rule — the artifact identifies as the App a consumer
 *    installs (ADR-0019 D1), `app.objectstack.hotcrm`, not as one of its
 *    modules.
 *  - REGISTRATION order is decided by `dependencies` — the service module
 *    declares `app.objectstack.hotcrm`, and `packages[]` is sorted through the
 *    platform's one topological sorter (ADR-0130 D5, ADR-0116) — so the app
 *    registers first whatever slot it occupies here. An artifact that only
 *    worked because someone listed the packages in the right order is the
 *    failure ADR-0116 exists about, and it fails SILENTLY.
 *
 * `objectstack build` compiles this file into one `dist/objectstack.json`;
 * `objectstack dev` boots the same shape straight from source.
 */
export default composeStacks(
  [
    createHotCrmServiceStack({ data: seedData.service }),
    createHotCrmAppStack({
      objects: appObjects,
      actions: appActions,
      dashboards: appDashboards,
      datasets: appDatasets,
      reports: appReports,
      // Reusable import projections (#603). Referenced by name from the import
      // endpoint — `mappingName: 'crm_account_import'` — so a customer's own
      // spreadsheet loads without per-column mapping by hand. Templates:
      // `assets/import-templates/`.
      mappings: appMappings,
      flows: compositionFlows,
      skills: appSkills,
      permissions: compositionPermissions,
      apps: appApps,
      views: appViews,
      pages: appPages,
      // Approvals are modeled as `record_change` flows with `approval` nodes
      // (ADR-0019); see src/sales/flows/opportunity-approval.flow.ts. The
      // standalone `approvals` stack field was removed in ObjectStack 7.4.
      // No `analyticsCubes`: datasets (ADR-0021) are the semantic layer — the
      // analytics service compiles each dataset into its cube internally, and a
      // second hand-written cube layer only duplicates and drifts.
      hooks: appHooks,
      data: seedData.app,
      translations: appTranslations,
      sharingRules: CrmSharingRules,
      // ADR-0090 D3: positions are flat capability-distribution groups — the v1
      // role hierarchy's parent links are gone (hierarchy belongs to the
      // business-unit tree, which this app does not model).
      positions: CrmPositions,
    }),
  ],
  { manifest: 'preserve' },
);

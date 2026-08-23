// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineStack } from '@objectstack/spec';

import * as objects from './src/objects/index.js';
import * as actions from './src/actions/index.js';
import * as dashboards from './src/dashboards/index.js';
import * as datasets from './src/datasets/index.js';
import * as reports from './src/reports/index.js';
import * as mappings from './src/mappings/index.js';
import { allFlows } from './src/flows/index.js';
import { allSkills } from './src/skills/index.js';
import * as profiles from './src/profiles/index.js';
import * as apps from './src/apps/index.js';
import * as views from './src/views/index.js';
import * as pages from './src/pages/index.js';
import * as translations from './src/translations/index.js';
import { CrmSeedData } from './src/data/index.js';

import {
  AccountTeamSharingRule, TerritorySharingRules,
  OpportunitySalesSharingRule, OpportunityExecutiveSharingRule,
  CaseEscalationSharingRule, CaseDirectorSharingRule, CaseUnassignedTriageSharingRule,
  CampaignLeadershipSharingRules,
  CrmPositions,
} from './src/sharing/index.js';

import { allHooks } from './src/hooks/index.js';

export default defineStack({
  manifest: {
    id: 'app.objectstack.hotcrm',
    namespace: 'crm',
    version: '3.0.0',
    type: 'app',
    name: 'HotCRM',
    description: 'AI-Native CRM for the ObjectStack marketplace — Accounts, Contacts, Leads, Opportunities, Cases, Knowledge, Forecasts, Campaigns, Contracts.',
    // ADR-0087 protocol handshake (ADR-0025 §3.2): the metadata/runtime
    // protocol major this app's metadata is authored against. Only the major
    // participates in the check — a runtime on a different major refuses the
    // load with a structured OS_PROTOCOL_INCOMPATIBLE diagnostic (naming the
    // `objectstack migrate meta` replay) instead of failing deep in a schema
    // parse. Bump together with `specVersion` on every platform upgrade
    // (docs/MAINTENANCE.md §3) — `test/docs-drift.test.ts` now enforces that
    // pairing against `objectstack.manifest.json` instead of trusting this
    // comment, because two platform upgrades in a row (rc.2, then rc.3) moved
    // the manifest and left this line behind (#728).
    engines: { protocol: '^17.1.0' },
  },

  // ─── Platform capabilities this app needs ─────────────────────────
  // The runtime resolves each capability name to a built-in service plugin
  // and auto-loads it (with extras like Automation's node packs). No need
  // to hand-instantiate plugins or pass `--preset` flags. See
  // packages/cli/src/commands/serve.ts CAPABILITY_PROVIDERS for the
  // complete map; explicit `plugins: [...]` always shadows the resolver.
  // `auth` enables the auth/login surface (login/register) via @objectstack/plugin-auth.
  // `ui`   serves the unified Console shell and CRM apps under /_console/
  //        (login at /_console/login). ObjectStack 7.x replaced the legacy
  //        /_studio/ and /_account/ mounts with this single /_console/ surface.
  // Both are required for a clickable login flow when running `objectstack start`
  // off the compiled artifact.
  // Note: the foundational slate (queue, job, cache, settings, email,
  // storage) is auto-injected by the CLI for every non-`minimal`
  // preset — see `ALWAYS_CAPS` in packages/cli/src/commands/serve.ts.
  // Listed below only the *opt-in* capabilities this stack actually
  // wants on top of that slate.
  // `triggers` installs the record-change + schedule trigger providers that
  // actually fire autolaunched flows (record_change & schedule types). Without
  // it the `automation` engine registers flows but nothing ever launches them.
  // Schedule triggers run via the job service (in the always-on slate).
  //
  // `ai` is deliberately NOT listed. ObjectStack 11.3.0 (ADR-0025 S2) removed
  // `@objectstack/service-ai` from the open edition — the AI runtime now ships
  // only in the closed cloud package, and the framework CLI does not depend on
  // it. Under ObjectStack 16, `requires: ['ai']` is a *fail-fast* capability:
  // the serve command hard-aborts boot when the package is absent, so keeping it
  // here would break `objectstack start`/`dev` for this open-edition app (the AI
  // block runs before every other capability resolves). The AI metadata is
  // unaffected — the skills still validate, build into the artifact, and run
  // wherever a runtime provides the `ai` tier (cloud's objectos-runtime). There
  // are no app-authored agents: they were retired in #512 and the surface is
  // skills-only (ADR-0063 §2); skills attach to a platform agent by `surface`.
  // A local open-edition boot simply omits the AI service and hides its console
  // surface. To run AI locally, declare `@objectstack/service-ai` (cloud) in
  // package.json — its mere presence best-effort auto-loads it.
  // `hierarchy-security` is the ONE enterprise-edition capability this app
  // declares (#880). `sales_manager` authors `writeScope: 'own_and_reports'` on
  // `crm_contract`, an ADR-0057 HIERARCHY scope resolved by the
  // `hierarchy-scope-resolver` service that ships only in
  // `@objectstack/security-enterprise`. Declaring the capability is REQUIRED to
  // author that scope at all — `defineStack` refuses the grant outright without
  // it — and the pair is one declaration: move them together or not at all.
  //
  // Maintainer ruling, 2026-08-11, verbatim: 「本项目是元数据app，在企业版运行就
  // 具备企业版相关的能力，不重复开发。」 The app states what it MEANS and the
  // edition supplies the capability, rather than approximating it with a broader
  // open-edition value.
  //
  // UNLIKE `ai` above, this is SAFE to declare on an open-edition boot and does
  // NOT fail fast. Verified against `@objectstack/cli`'s serve command: the
  // capability resolver looks the token up in `CAPABILITY_PROVIDERS`, finds no
  // entry, and because `hierarchy-security` IS in the known
  // `PLATFORM_CAPABILITY_TOKENS` vocabulary it takes the deliberate "stay quiet"
  // branch — no warning, no abort — since the capability arrives via an explicit
  // enterprise plugin in `plugins[]`. Only tier-gated tokens (ai / ai-studio /
  // i18n / ui / auth) have the dedicated hard-abort blocks the note above
  // describes. `objectstack validate` does print one informational line naming
  // the package to install; that is expected output, asserted by
  // `test/contract-write-depth.test.ts`, not a defect to silence.
  //
  // What an OPEN-edition boot gets: the resolver is absent, so the scope fails
  // CLOSED to owner-only and a Sales Manager still cannot edit a rep's contract.
  // That is an edition boundary, and the docs say so per edition.
  requires: ['automation', 'triggers', 'analytics', 'auth', 'ui', 'approvals', 'sharing', 'hierarchy-security'],

  objects: Object.values(objects),
  actions: Object.values(actions),
  dashboards: Object.values(dashboards),
  datasets: Object.values(datasets),
  reports: Object.values(reports),
  // Reusable import projections (#603). Referenced by name from the import
  // endpoint — `mappingName: 'crm_account_import'` — so a customer's own
  // spreadsheet loads without per-column mapping by hand. Templates:
  // `assets/import-templates/`.
  mappings: Object.values(mappings),
  flows: allFlows,
  skills: allSkills,
  permissions: Object.values(profiles),
  apps: Object.values(apps),
  views: Object.values(views),
  pages: Object.values(pages),
  // Approvals are modeled as `record_change` flows with `approval` nodes
  // (ADR-0019); see src/flows/opportunity-approval.flow.ts. The
  // standalone `approvals` stack field was removed in ObjectStack 7.4.
  // No `analyticsCubes`: datasets (ADR-0021) are the semantic layer — the
  // analytics service compiles each dataset into its cube internally, and a
  // second hand-written cube layer only duplicates and drifts.

  hooks: allHooks,

  data: CrmSeedData,

  i18n: {
    defaultLocale: 'en',
    supportedLocales: ['en', 'zh-CN', 'ja-JP', 'es-ES'],
    fallbackLocale: 'en',
  },

  translations: Object.values(translations),

  sharingRules: [
    AccountTeamSharingRule,
    OpportunitySalesSharingRule,
    OpportunityExecutiveSharingRule,
    CaseEscalationSharingRule,
    CaseDirectorSharingRule,
    CaseUnassignedTriageSharingRule,
    ...TerritorySharingRules,
    ...CampaignLeadershipSharingRules,
  ],
  // ADR-0090 D3: positions are flat capability-distribution groups — the v1
  // role hierarchy's parent links are gone (hierarchy belongs to the
  // business-unit tree, which this app does not model).
  positions: CrmPositions,
});

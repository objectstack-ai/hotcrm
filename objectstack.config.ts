// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineStack } from '@objectstack/spec';
import * as cubes from './src/cubes/index.js';

import * as objects from './src/objects/index.js';
import * as actions from './src/actions/index.js';
import * as dashboards from './src/dashboards/index.js';
import * as datasets from './src/datasets/index.js';
import * as reports from './src/reports/index.js';
import { allFlows } from './src/flows/index.js';
import { allAgents } from './src/agents/index.js';
import { allSkills } from './src/skills/index.js';
import * as profiles from './src/profiles/index.js';
import * as apps from './src/apps/index.js';
import * as views from './src/views/index.js';
import * as pages from './src/pages/index.js';
import * as translations from './src/translations/index.js';
import { CrmSeedData } from './src/data/index.js';

import {
  AccountTeamSharingRule, TerritorySharingRules,
  OpportunitySalesSharingRule,
  CaseEscalationSharingRule,
  CrmPositions,
} from './src/sharing/index.js';

import { allHooks } from './src/hooks/index.js';

export default defineStack({
  manifest: {
    id: 'app.objectstack.hotcrm',
    namespace: 'crm',
    version: '2.2.2',
    type: 'app',
    name: 'HotCRM',
    description: 'AI-Native CRM for the ObjectStack marketplace — Accounts, Contacts, Leads, Opportunities, Cases, Knowledge, Forecasts, Campaigns, Contracts.',
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
  // unaffected — the two agents + skills still validate, build into the artifact,
  // and run wherever a runtime provides the `ai` tier (cloud's objectos-runtime).
  // A local open-edition boot simply omits the AI service and hides its console
  // surface. To run AI locally, declare `@objectstack/service-ai` (cloud) in
  // package.json — its mere presence best-effort auto-loads it.
  requires: ['automation', 'triggers', 'analytics', 'auth', 'ui', 'approvals', 'sharing'],

  objects: Object.values(objects),
  actions: Object.values(actions),
  dashboards: Object.values(dashboards),
  datasets: Object.values(datasets),
  reports: Object.values(reports),
  flows: allFlows,
  agents: allAgents,
  skills: allSkills,
  permissions: Object.values(profiles),
  apps: Object.values(apps),
  views: Object.values(views),
  pages: Object.values(pages),
  // Approvals are modeled as `record_change` flows with `approval` nodes
  // (ADR-0019); see src/flows/opportunity-discount-approval.flow.ts. The
  // standalone `approvals` stack field was removed in ObjectStack 7.4.
  analyticsCubes: Object.values(cubes),

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
    CaseEscalationSharingRule,
    ...TerritorySharingRules,
  ],
  // ADR-0090 D3: positions are flat capability-distribution groups — the v1
  // role hierarchy's parent links are gone (hierarchy belongs to the
  // business-unit tree, which this app does not model).
  positions: CrmPositions,
});

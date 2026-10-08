// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The four packages, collected into the two package stacks this artifact
 * carries.
 *
 * A directory under `src/` IS a package (ADR-0130, `module-split-plan.md`
 * items 4–9). Two of them are packages of the ARTIFACT as well:
 *
 *   - `src/sales/` — `app.objectstack.hotcrm`, the `type: 'app'` package this
 *     artifact takes its identity from. Its `defineStack` is the factory in
 *     `src/sales/index.ts`, and this file hands it its collections: the sales
 *     barrels plus those of `src/revenue/` and `src/marketing/`, which stay
 *     directories of the app package until they get packaging cards of their
 *     own, and which a file under `src/sales/` may not import.
 *   - `src/service/` — `app.objectstack.hotcrm.service`, a `type: 'module'`.
 *     Its `defineStack` is `src/service/index.ts`, which assembles its own
 *     collections from its own barrels; this file hands it only the seed rows
 *     the composition knob selects.
 *
 * `objectstack.config.ts` composes the two into ONE release artifact. This file
 * builds them, because it is the one place that may see every package AND carry
 * named exports.
 *
 * ## Why this is not simply the top of `objectstack.config.ts`
 *
 * That file may carry NO named export. `objectstack build` reads the config
 * module and parses it against `ObjectStackDefinitionSchema`, which is
 * `.strict`, so any export beside the default is an unrecognised top-level
 * stack key and the build fails by name. Measured on the pre-move tree, not
 * assumed: appending `export const ProbeNamedExport = [1, 2, 3];` to the
 * unmodified `objectstack.config.ts` at 590b095 fails `pnpm build` with
 * "Unrecognized key(s) on this stack definition: `ProbeNamedExport`".
 *
 * Two kinds of value need to be importable, so they live here:
 *
 *   - the AUTHORED collections — about a dozen suites assert against them
 *     upstream of `defineStack()`, which is the only side of that call where
 *     `CrmSeedData` and the stack's `data` are distinguishable at all (see the
 *     note in `test/saas-composition.test.ts`);
 *   - the two BUILT package stacks — a multi-package artifact carries every
 *     collection once, inside its package's body in `packages[]`, and no longer
 *     beside them at the top level (ADR-0130 D4, 2026-09-22 addendum), so a
 *     suite that reads "every object of the app" composes these two itself.
 *
 * ## Order
 *
 * Registration order within a collection is a property of each PACKAGE now:
 * the artifact carries each package's collections in its own body, in the order
 * that package's stack was handed them. Two orders stay load-bearing and are
 * stated explicitly below — `CrmSeedData`, the replay order a seed row's
 * natural-key lookups were written against, and the hand-ordered lists
 * (`appHooks`, `appFlows`, `appSkills`, `appSharingRules`) that keep the order
 * the single-tree barrels had. Everything else uses `byExportName()` — a
 * module namespace enumerates its exports in ascending code-unit order of the
 * export NAME, so merging several barrels and sorting by that name is the same
 * rule one barrel already applied, rather than a new one.
 */

import { createHotCrmAppStack } from './src/sales/index.js';
import {
  createHotCrmServiceStack, serviceHooks, serviceFlows, serviceSkills, serviceSharingRules,
} from './src/service/index.js';

import * as salesObjects from './src/sales/objects/index.js';
import * as revenueObjects from './src/revenue/objects/index.js';
import * as marketingObjects from './src/marketing/objects/index.js';

import * as salesActions from './src/sales/actions/index.js';
import * as marketingActions from './src/marketing/actions/index.js';

import * as salesDashboards from './src/sales/dashboards/index.js';

import * as salesDatasets from './src/sales/datasets/index.js';
import * as revenueDatasets from './src/revenue/datasets/index.js';

import * as salesReports from './src/sales/reports/index.js';

import * as mappings from './src/sales/mappings/index.js';
import * as apps from './src/sales/apps/index.js';
import * as profiles from './src/sales/profiles/index.js';
import * as translations from './src/sales/translations/index.js';

import * as salesViews from './src/sales/views/index.js';
import * as revenueViews from './src/revenue/views/index.js';
import * as marketingViews from './src/marketing/views/index.js';

import * as salesPages from './src/sales/pages/index.js';

import * as salesEmailTemplates from './src/sales/email-templates/index.js';
import * as revenueEmailTemplates from './src/revenue/email-templates/index.js';

import { SystemAdminProfile } from './src/sales/profiles/index.js';
import { TenantAdminProfile } from './src/sales/profiles/tenant-admin.profile.js';

// Hooks — one barrel per directory, assembled below in source-file-name order.
import {
  accountHook, contactHook, eventHook, forecastHook, leadHook,
  leadCampaignMetricsHook, opportunityHook, opportunityCampaignMetricsHook, taskHook,
} from './src/sales/objects/hooks.js';
import {
  contractHook, opportunityLineItemHook, productHook, quoteHook, quoteLineItemHook,
} from './src/revenue/objects/hooks.js';
import { campaignHook, campaignMemberHook } from './src/marketing/objects/hooks.js';

// Flows — the registration order the single `allFlows` array used to hold.
import {
  ContactWelcomeFlow, ForecastSnapshotFlow, LeadAssignmentFlow,
  AccountApprovalFlow,
  LeadConversionFlow, LeadConversionApprovalFlow,
  OpportunityApprovalFlow, OpportunityApprovalOnCreateFlow,
  OpportunityStatusChangeApprovalFlow, OpportunityQualificationApprovalFlow,
  OpportunityStagnationFlow, OpportunityWonAlertFlow, ScheduleFollowUpFlow,
  TaskDueReminderFlow, TaskUrgentAlertFlow, BillingHandoffClosedWonFlow,
} from './src/sales/flows/index.js';
import {
  QuoteGenerationFlow, ContractRenewalFlow, QuoteExpirationFlow, ContractExpirationFlow,
  BillingHandoffContractActivatedFlow,
} from './src/revenue/flows/index.js';
import {
  CampaignEnrollmentFlow, CampaignLeadMemberEnrollFlow, CampaignContactMemberEnrollFlow,
  CampaignCompletionFlow,
} from './src/marketing/flows/index.js';

// Skills — likewise.
import {
  LeadQualificationSkill, EmailDraftingSkill, RevenueForecastingSkill,
  Customer360Skill, LiveDataSkill,
} from './src/sales/skills/index.js';

import {
  AccountTeamSharingRule, TerritorySharingRules,
  OpportunitySalesSharingRule, OpportunityExecutiveSharingRule,
  CrmPositions,
} from './src/sales/sharing/index.js';
import { CampaignLeadershipSharingRules } from './src/marketing/sharing/index.js';

import type { EmailTemplateDefinition } from '@objectstack/spec/system';

// Seed rows — the replay order lives in `CrmSeedData` below.
import type { HotCrmComposition } from './src/sales/data/index.js';
import {
  resolveComposition,
  accounts, contacts, leads, opportunities,
  tasks, events, eventAttendeesFromContacts, eventAttendeesFromLeads, leadInteractionPointers, forecasts,
} from './src/sales/data/index.js';
import { products, opportunityLineItems, contracts, quotes, quoteLineItems } from './src/revenue/data/index.js';
import { cases, knowledgeArticles } from './src/service/data/index.js';
import { campaigns, campaignMembersFromLeads, campaignMembersFromContacts } from './src/marketing/data/index.js';

/**
 * One registration array out of the merged per-package barrels of a metadata
 * type, ordered by EXPORT NAME.
 *
 * `Object.values(<module namespace>)` — what this file did for each of these
 * collections while there was one barrel per type — enumerates in ascending
 * code-unit order of the export name, not in the barrel's declaration order.
 * (Measured on the pre-move artifact: `src/pages/index.ts` declared
 * `LeadDetailPage` first and the artifact's `pages[]` still began with
 * `account_detail_page`.) So sorting the merged entries by export name is not
 * a new ordering rule — it is the same one, applied across four namespaces
 * instead of one.
 *
 * The namespaces are spread into one object at the call site, which is also
 * what keeps the entries TYPED: each barrel is its own module namespace with
 * its own element union, so passing them as separate arguments makes
 * TypeScript infer `T` from the first one alone and reject the rest. A
 * duplicate export name across two packages would collide in that spread — it
 * could not happen while the exports shared one namespace either, and it is a
 * compile error the day two packages export the same name.
 */
const byExportName = <T>(merged: Record<string, T>): T[] =>
  Object.entries(merged)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, value]) => value);

/* ─── The app package's collections ──────────────────────────────────────── */

/**
 * Every CRM lifecycle hook the APP PACKAGE registers, in the order
 * `src/hooks/index.ts` registered them (by hook source file name) — see the
 * ORDER note at the top of this file.
 *
 * `*.hook.ts` files sit beside the `*.object.ts` they name, one directory each,
 * which is what enforces ADR-0130 R4. Two entries therefore come from a
 * different directory than the campaign metadata they maintain:
 * `opportunityCampaignMetricsHook` and `leadCampaignMetricsHook` are attached
 * to `crm_opportunity` and `crm_lead`, so they live in sales. The three service
 * hooks register with the service package (`serviceHooks`).
 */
export const appHooks = [
  accountHook,
  campaignHook,
  opportunityCampaignMetricsHook,
  leadCampaignMetricsHook,
  campaignMemberHook,
  contactHook,
  contractHook,
  eventHook,
  forecastHook,
  leadHook,
  opportunityHook,
  opportunityLineItemHook,
  productHook,
  quoteHook,
  quoteLineItemHook,
  taskHook,
].flatMap((entry) => (Array.isArray(entry) ? entry : [entry]));

/**
 * Every flow the app package registers, in the order the single `allFlows`
 * array registered them. The seven case flows register with the service
 * package (`serviceFlows`).
 */
export const appFlows = [
  CampaignEnrollmentFlow,
  CampaignLeadMemberEnrollFlow,
  CampaignContactMemberEnrollFlow,
  AccountApprovalFlow,
  LeadConversionFlow,
  LeadConversionApprovalFlow,
  ScheduleFollowUpFlow,
  OpportunityApprovalFlow,
  OpportunityApprovalOnCreateFlow,
  OpportunityStatusChangeApprovalFlow,
  OpportunityQualificationApprovalFlow,
  QuoteGenerationFlow,
  ContractRenewalFlow,
  OpportunityStagnationFlow,
  ForecastSnapshotFlow,
  LeadAssignmentFlow,
  CampaignCompletionFlow,
  QuoteExpirationFlow,
  ContractExpirationFlow,
  ContactWelcomeFlow,
  OpportunityWonAlertFlow,
  TaskUrgentAlertFlow,
  TaskDueReminderFlow,
  BillingHandoffClosedWonFlow,
  BillingHandoffContractActivatedFlow,
];

/**
 * Every skill the app package registers — the cross-domain ones are all here.
 * The case-triage skill registers with the service package (`serviceSkills`).
 */
export const appSkills = [
  LeadQualificationSkill,
  EmailDraftingSkill,
  RevenueForecastingSkill,
  Customer360Skill,
  LiveDataSkill,
];

/** Every object definition the app package registers. */
export const appObjects = byExportName({
  ...salesObjects, ...revenueObjects, ...marketingObjects,
});

/** Every UI / AI-callable action it registers. */
export const appActions = byExportName({ ...salesActions, ...marketingActions });

/** Its dashboards — the cross-domain ones included (plan item 4). */
export const appDashboards = byExportName({ ...salesDashboards });

/** Its analytics datasets (ADR-0021). */
export const appDatasets = byExportName({ ...salesDatasets, ...revenueDatasets });

/** Its reports. */
export const appReports = byExportName({ ...salesReports });

/** Its list-view groups. */
export const appViews = byExportName({
  ...salesViews, ...revenueViews, ...marketingViews,
});

/** Its page layouts — `home`, `app_launcher` and `utility_bar` among them. */
export const appPages = byExportName({ ...salesPages });

/** Every import mapping — sales only; nothing else authors one. */
export const appMappings = byExportName({ ...mappings });

/** The app itself, and its navigation GROUPS (the containers modules aim at). */
export const appApps = byExportName({ ...apps });

/** The locale packs — whole in the app package (plan item 4), service labels included. */
export const appTranslations = byExportName({ ...translations });

/**
 * Every `sys_email_template` row the app package registers — the localizable
 * content path for `notify` (#9205). The service package registers its own two
 * case templates, beside the flows that send them.
 *
 * A package barrel exports ONE symbol carrying that package's rows, so
 * `byExportName()` orders them by export name and `.flat()` produces the
 * single array `defineStack({ emailTemplates })` takes. Reaching the package
 * barrel IS reaching the registration here: no hand-kept ordered list, because
 * nothing about the order is load-bearing — a row is resolved by
 * `(name, locale)` at delivery time, never by position.
 */
export const appEmailTemplates = byExportName<EmailTemplateDefinition[]>({
  ...salesEmailTemplates, ...revenueEmailTemplates,
}).flat();

/**
 * The permission sets, as the NAMESPACE rather than an array: the SaaS
 * composition filters them by identity below, which needs `Object.values()`
 * over the same object the named exports come from.
 *
 * They stay WHOLE in the app package (ADR-0130 addendum, 2026-09-02), service
 * grants included: a permission set is a role a person holds across the whole
 * product, not a property of one module.
 */
export const allProfiles = profiles;

export { SystemAdminProfile, TenantAdminProfile };

/**
 * The sharing rules the app package registers, in the order this app has
 * always registered them. The three CASE rules are authored against
 * `crm_case` and register with the service package (`serviceSharingRules`).
 */
export const appSharingRules = [
  AccountTeamSharingRule,
  OpportunitySalesSharingRule,
  OpportunityExecutiveSharingRule,
  ...TerritorySharingRules,
  ...CampaignLeadershipSharingRules,
];

export { CrmPositions };

/* ─── Artifact-wide sweeps — what the suites read ───────────────────────── */

/**
 * Every hook in the ARTIFACT, both packages.
 *
 * The suites that sweep hooks (`test/refusal-envelope.test.ts`,
 * `test/runtime-coverage.test.ts`, `test/hook-write-shape.test.ts`,
 * `test/action-sandbox.test.ts`, `test/territory-single-source.test.ts`) are
 * about the app a customer installs, which is the whole artifact — so they keep
 * reading one list, assembled here from each package's own.
 */
export const allHooks = [...appHooks, ...serviceHooks];

/** Every flow in the artifact, both packages — same reason as {@link allHooks}. */
export const allFlows = [...appFlows, ...serviceFlows];

/** Every skill in the artifact, both packages — same reason as {@link allHooks}. */
export const allSkills = [...appSkills, ...serviceSkills];

/** Every sharing rule in the artifact, both packages — same reason as {@link allHooks}. */
export const CrmSharingRules = [...appSharingRules, ...serviceSharingRules];


/**
 * Ownership and CRM positions are NOT seeded here — they can't be.
 *
 * A seed can't name a user. Lookup values are resolved against the target's
 * externalId and that only works for objects in the app's own graph, so
 * `owner_id: 'Dev Admin'` would store the literal string rather than an id (verified:
 * a `sys_user_position` row seeded that way is unmatchable by the real user
 * id), and `cel\`os.user.id\`` inside a seed evaluates to nothing. The id does
 * not exist until first boot.
 *
 * The PLATFORM does it, at the only moment it can: when the seed settles,
 * `@objectstack/plugin-security` re-runs its seed-ownership claim on
 * `app:seeded` and hands every ownerless row of every object carrying
 * `owner_id` to the first platform administrator (objectstack#17872, shipped in
 * 17.6.0). No HotCRM flow is involved. The `demo_bootstrap` sweep that used
 * to do this every ten minutes was retired once a fresh boot measured that
 * claim leaving all twelve seeded owner-scoped objects at zero ownerless rows
 * with the sweep disabled (#1892).
 *
 * `owner_id` is the app's ONE ownership column (#548 retired the app-authored
 * `owner` lookup that used to sit beside it — the #622 split). Seed writes run
 * under `{ isSystem: true }`, which short-circuits the security middleware, so
 * its insert-time auto-stamp of `owner_id` never fires — "seeds either declare
 * those fields explicitly per record" — and per the paragraph above these seeds
 * cannot declare it. So a seeded row reaches the database owned by nobody
 * (`owner_id` null) until that claim runs. Nothing here should grow an
 * `owner_id` seed value to paper over that: the platform claim is the
 * mechanism.
 */

/**
 * All CRM seed datasets, in REPLAY ORDER — the ARTIFACT's whole seed union.
 *
 * This list assembles here rather than in a package barrel for two reasons,
 * and the second is the binding one. It names rows from all four packages, and
 * no `src/` file may reach sideways into another package (plan item 7). And
 * the order is load-bearing — rows resolve their lookups against rows seeded
 * earlier, and the order interleaves the packages (products between
 * opportunities and tasks, contracts after campaign members), so it is not
 * recoverable by concatenating four per-package lists in any package order.
 * It is exactly the order `CrmSeedData` has always had. About ten suites read
 * this union; {@link seedDataFor} is what the two package stacks register.
 */
export const CrmSeedData = [
  accounts,
  contacts,
  leads,
  opportunities,
  products,
  opportunityLineItems,
  tasks,
  cases,
  // Events come after the five objects their `related_to_*` lookups resolve
  // against (accounts, contacts, leads, opportunities, cases); the attendee
  // junctions come after the events they hang off.
  events,
  eventAttendeesFromContacts,
  eventAttendeesFromLeads,
  leadInteractionPointers,
  campaigns,
  campaignMembersFromLeads,
  campaignMembersFromContacts,
  contracts,
  quotes,
  quoteLineItems,
  forecasts,
  knowledgeArticles,
];

/**
 * The seed datasets a SaaS tenant gets: the product CATALOGUE, and nothing else.
 *
 * Maintainer ruling, 2026-08-27 (objectstack#12701, quoted untranslated):
 * 「每个租户应该各自使用各自的数据吧」 — every tenant uses its own data, the
 * product catalogue included; and 「种子也不应该是全局的呀，因为种子数据不同的客户
 * 都是要改的呀，只是参考呀，租户要自己删除呀」 — a seed is a per-tenant
 * REFERENCE copy the tenant edits and deletes.
 *
 * The platform already replays per tenant: `@objectstack/runtime`'s
 * `seed-replayer` replays the registered dataset union into each newly founded
 * organization stamped with that organization's id. What it has no notion of is
 * WHICH families to replay — it always replays the whole union — so the
 * selection is made HERE, once, at composition time. That is also the shape the
 * ruling wants: uniform for every tenant, with no per-tenant opt-in mechanism
 * to author, mis-set, or support.
 *
 * Why the catalogue and only the catalogue:
 *
 *  - A catalogue is the one family that is genuinely a starting point. A new
 *    tenant needs priceable products before they can quote anything, and the
 *    rows are theirs to rename, re-price and delete.
 *  - `sales` / `service` / `marketing` / `revenue` are STORYTELLING: Acme
 *    Corporation's pipeline, nine escalated cases, a finished campaign. Landing
 *    those in a paying tenant's org is not a helpful head start, it is someone
 *    else's data in their CRM.
 *  - It is also the family with no outgoing references, so the shrink cannot
 *    strand a lookup: `src/revenue/data/catalog.seed.ts` resolves nothing against
 *    another object, while every other family points at accounts, contacts or products
 *    by natural key.
 *
 * ⛔ Not a place to grow a "starter data" bundle. A family added here ships
 * into every tenant of every SaaS deployment; the bar is "a tenant cannot
 * operate without it", not "it looks nice on day one".
 */
export const SaasTenantSeedData = [products];

/**
 * The seed families of the SERVICE package — the rows whose object it owns.
 *
 * ⚠️ A seed family is REGISTERED BY THE PACKAGE THAT OWNS ITS OBJECT. Named
 * here, beside the replay order it is cut out of, so the two cannot drift
 * apart: the split is a property of {@link CrmSeedData}.
 */
export const ServiceSeedData = [cases, knowledgeArticles];

/** Everything else — the app package's own families, in {@link CrmSeedData} order. */
export const AppSeedData = CrmSeedData.filter((family) => !ServiceSeedData.includes(family));

/**
 * The seed datasets each package registers under a composition.
 *
 * The SaaS selection is still made once, here: a tenant gets the product
 * catalogue and nothing else, so the service package registers no rows at all
 * in that shape. See {@link SaasTenantSeedData} for why.
 */
export const seedDataFor = (
  composition: HotCrmComposition,
): { app: typeof CrmSeedData; service: typeof CrmSeedData } =>
  composition === 'saas'
    ? { app: SaasTenantSeedData, service: [] }
    : { app: AppSeedData, service: ServiceSeedData };

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
// The knob is resolved ONCE, here, and handed to the package stacks already
// applied. It is deliberately COMPOSITION-time and uniform. The platform's
// `seed-replayer` gives every newly founded organization its own private copy
// of the registered dataset union (maintainer ruling 2026-08-27,
// objectstack#12701: 「种子也不应该是全局的呀 …只是参考呀，租户要自己删除呀」),
// but it has no per-family or per-tenant selection and none is chartered — so
// WHAT gets replayed is decided once, here, for every tenant alike.
//
// Two things change, and nothing else. There is no runtime branch anywhere in
// `src/`, and no enterprise package is imported: an artifact built either way
// runs on the community runtime. Both shapes register the same flows: the one
// flow the SaaS shape used to drop, the `demo_bootstrap` ownership sweep, is
// retired from the app (#1892) — the platform claims seeded rows itself.
//
//  1. `data` — the catalogue family only, so the service package registers
//     none. See `SaasTenantSeedData`.
//     `demo-staffing` needs no exclusion — `src/sales/sharing/demo-staffing.ts` is
//     deliberately not exported from `src/sales/sharing/index.js` and not registered
//     in any composition (#640, pinned by `test/demo-staffing.test.ts`).
//  2. `permissions` — `system_admin` is replaced by `tenant_admin`, which holds
//     org-scoped `manage_org_users` instead of platform-scope `manage_users`.
//     Read `src/sales/profiles/tenant-admin.profile.ts` for the full audit, including
//     what `view_all_data` / `modify_all_data` mean under the wall.
const composition = resolveComposition();
const isSaas = composition === 'saas';
const seedData = seedDataFor(composition);

/**
 * Permission sets this composition registers. Filtered by IDENTITY, not by name
 * string, so a rename cannot silently turn the substitution into a no-op.
 */
const compositionPermissions = isSaas
  ? [...Object.values(allProfiles).filter((set) => set !== SystemAdminProfile), TenantAdminProfile]
  : Object.values(allProfiles);

/* ─── The two package stacks `objectstack.config.ts` composes ───────────── */

/** `app.objectstack.hotcrm.service` — see `src/service/index.ts`. */
export const serviceStack = createHotCrmServiceStack({ data: seedData.service });

/**
 * `app.objectstack.hotcrm` — see `src/sales/index.ts`, including why it is
 * handed `artifactObjects`: its permission sets stay whole here and grant on
 * the service package's objects too.
 */
export const appStack = createHotCrmAppStack(
  {
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
    flows: appFlows,
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

    // The localizable content path for `notify` (#9205). A node names a template
    // and supplies its `templateData`; the delivery path resolves
    // `(name, locale)` against these rows PER RECIPIENT, after fan-out — the
    // recipient's own `sys_user.locale` when set, else `i18n.defaultLocale` —
    // so two people on one notification can read it in two languages.
    emailTemplates: appEmailTemplates,

    sharingRules: appSharingRules,
    // ADR-0090 D3: positions are flat capability-distribution groups — the v1
    // role hierarchy's parent links are gone (hierarchy belongs to the
    // business-unit tree, which this app does not model).
    positions: CrmPositions,
  },
  { artifactObjects: (serviceStack.objects ?? []).map((object) => object.name) },
);

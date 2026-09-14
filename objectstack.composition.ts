// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The collection step the two package stacks consume.
 *
 * A directory under `src/` IS a package (ADR-0130, `module-split-plan.md`
 * items 4–9). Two of them are packages of the ARTIFACT as well:
 * `src/sales/` — `app.objectstack.hotcrm`, the `type: 'app'` package this
 * artifact takes its identity from, whose `defineStack` is
 * `src/sales/index.ts` — and `src/service/` —
 * `app.objectstack.hotcrm.service`, a `type: 'module'`, whose `defineStack`
 * is `src/service/index.ts` and which assembles its own collections there.
 * `src/revenue/` and `src/marketing/` are directories of the app package
 * until they get packaging cards of their own.
 *
 * This file is therefore the one place that sees every package. It assembles
 * the APP PACKAGE's collections (sales plus the two not-yet-packaged
 * directories) and the app-wide sweeps the suites read; the service package
 * assembles its own and hands back `serviceHooks` / `serviceFlows` so the
 * sweeps can stay app-wide without a second enumeration.
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
 * The assembled collections need to be importable — about a dozen suites
 * assert against the AUTHORED value upstream of `defineStack()`, which is the
 * only side of that call where `CrmSeedData` and the stack's `data` are
 * distinguishable at all (see the note in `test/saas-composition.test.ts`) —
 * so they live in a module that is allowed to export them.
 *
 * ## Order
 *
 * Registration order within a collection is no longer load-bearing for the
 * ARTIFACT: with two packages the artifact's flattened arrays are the
 * composition's concatenation (module first, app last), and the packaging PR
 * that introduced that is the one place it is measured. Two orders still are
 * load-bearing, and both are stated explicitly below:
 *
 *   - `CrmSeedData`, because a seed row resolves its lookups against rows
 *     seeded EARLIER;
 *   - `CrmSharingRules`, which this app has always registered in one order.
 *
 * Everything else uses {@link byExportName} — a module namespace enumerates
 * its exports in ascending code-unit order of the export NAME, so merging
 * several barrels and sorting by that name is the same rule one barrel
 * already applied, rather than a new one.
 */

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

// Flows.
import {
  ContactWelcomeFlow, DemoBootstrapFlow, ForecastSnapshotFlow, LeadAssignmentFlow,
  LeadConversionFlow, OpportunityApprovalFlow, OpportunityApprovalOnCreateFlow,
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

// Skills.
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

// The service package assembles its own collections; these two are re-exported
// by it so the app-wide sweeps below need no second enumeration of them.
import { serviceFlows, serviceHooks } from './src/service/index.js';

// Seed rows — the replay order lives in `CrmSeedData` below.
import type { HotCrmComposition } from './src/sales/data/index.js';
import {
  accounts, contacts, leads, opportunities,
  tasks, events, eventAttendeesFromContacts, eventAttendeesFromLeads, forecasts,
} from './src/sales/data/index.js';
import { products, opportunityLineItems, contracts, quotes, quoteLineItems } from './src/revenue/data/index.js';
import { cases, knowledgeArticles } from './src/service/data/index.js';
import { campaigns, campaignMembersFromLeads, campaignMembersFromContacts } from './src/marketing/data/index.js';

/**
 * One registration array out of merged per-directory barrels of a metadata
 * type, ordered by EXPORT NAME.
 *
 * `Object.values(<module namespace>)` — what a single barrel gives — enumerates
 * in ascending code-unit order of the export name, not in the barrel's
 * declaration order. (Measured: `src/pages/index.ts` declared `LeadDetailPage`
 * first and the artifact's `pages[]` still began with `account_detail_page`.)
 * So sorting the merged entries by export name is not a new ordering rule — it
 * is the same one, applied across several namespaces instead of one.
 *
 * The namespaces are spread into one object at the call site, which is also
 * what keeps the entries TYPED: each barrel is its own module namespace with
 * its own element union, so passing them as separate arguments makes
 * TypeScript infer `T` from the first one alone and reject the rest. A
 * duplicate export name across two directories would collide in that spread —
 * it could not happen while the exports shared one namespace either, and it is
 * a compile error the day two of them export the same name.
 */
const byExportName = <T>(merged: Record<string, T>): T[] =>
  Object.entries(merged)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, value]) => value);

/* ─── The app package's collections ──────────────────────────────────────── */

/**
 * Every CRM lifecycle hook the APP PACKAGE registers, by hook source file name.
 *
 * `*.hook.ts` files sit beside the `*.object.ts` they name, one directory each,
 * which is what enforces ADR-0130 R4. Two entries therefore come from a
 * different directory than the campaign metadata they maintain:
 * `opportunityCampaignMetricsHook` and `leadCampaignMetricsHook` are attached
 * to `crm_opportunity` and `crm_lead`, so they live in sales.
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

/** Every flow the app package registers. */
export const appFlows = [
  CampaignEnrollmentFlow,
  CampaignLeadMemberEnrollFlow,
  CampaignContactMemberEnrollFlow,
  LeadConversionFlow,
  ScheduleFollowUpFlow,
  DemoBootstrapFlow,
  OpportunityApprovalFlow,
  OpportunityApprovalOnCreateFlow,
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

/** Every skill the app package registers — the cross-domain ones are all here. */
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

/** Its dashboards — the two cross-domain ones included (plan item 4). */
export const appDashboards = byExportName({ ...salesDashboards });

/** Its analytics datasets (ADR-0021). */
export const appDatasets = byExportName({ ...salesDatasets, ...revenueDatasets });

/** Its reports. */
export const appReports = byExportName({ ...salesReports });

/** Its list-view groups. */
export const appViews = byExportName({
  ...salesViews, ...revenueViews, ...marketingViews,
});

/** Its page layouts. */
export const appPages = byExportName({ ...salesPages });

/** Every import mapping — sales only; nothing else authors one. */
export const appMappings = byExportName({ ...mappings });

/** The app itself, and its navigation GROUPS (the containers modules aim at). */
export const appApps = byExportName({ ...apps });

/** The locale packs — whole in the app package (plan item 4). */
export const appTranslations = byExportName({ ...translations });

/**
 * The permission sets, as the NAMESPACE rather than an array: the SaaS
 * composition filters them by identity in `objectstack.config.ts`, which needs
 * `Object.values()` over the same object the named exports come from.
 *
 * They stay WHOLE in the app package (ADR-0130 addendum, 2026-09-02), service
 * grants included: a permission set is a role a person holds across the whole
 * product, not a property of one module.
 */
export const appProfiles = profiles;

export { SystemAdminProfile, TenantAdminProfile };

/**
 * The sharing rules the app package registers, in the order this app has
 * always registered them.
 *
 * The three CASE rules are no longer here — they are authored against
 * `crm_case` and register with the service package.
 */
export const CrmSharingRules = [
  AccountTeamSharingRule,
  OpportunitySalesSharingRule,
  OpportunityExecutiveSharingRule,
  ...TerritorySharingRules,
  ...CampaignLeadershipSharingRules,
];

export { CrmPositions };

/* ─── App-wide sweeps — what the suites read ─────────────────────────────── */

/**
 * Every hook in the ARTIFACT, both packages.
 *
 * The suites that sweep hooks (`test/refusal-envelope.test.ts`,
 * `test/runtime-coverage.test.ts`, `test/hook-write-shape.test.ts`,
 * `test/action-sandbox.test.ts`, `test/territory-single-source.test.ts`) are
 * about the app a customer installs, which is the whole artifact — so they keep
 * reading one list, and it is assembled here from each package's own.
 */
export const allHooks = [...appHooks, ...serviceHooks];

/** Every flow in the artifact, both packages — same reason as {@link allHooks}. */
export const allFlows = [...appFlows, ...serviceFlows];

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
 * The `demo_bootstrap` scheduled flow (`src/sales/flows/demo-bootstrap.flow.ts`)
 * does it at the only moment it can: once the first real user exists, its
 * periodic sweep claims every ownerless seeded record for that user.
 *
 * That sweep owns the app's ONE ownership column, `owner_id` (#548 retired the
 * app-authored `owner` lookup that used to sit beside it — the #622 split).
 * Seed writes run under `{ isSystem: true }`, which short-circuits the security
 * middleware, so its insert-time auto-stamp of `owner_id` never fires — "seeds
 * either declare those fields explicitly per record" — and per the paragraph
 * above these seeds cannot declare it. So a seeded row reaches the database
 * owned by nobody at the PLATFORM level (`owner_id` null), and under
 * `sharingModel: 'private'` such a row is editable by no one at all, admin
 * included. Nothing here should grow an `owner_id` seed value to paper over
 * that: the sweep is the mechanism, and `test/flow-scheduled.test.ts` holds it
 * to leaving no claimed object ownerless.
 */

/**
 * All CRM seed datasets, in REPLAY ORDER — the ARTIFACT's whole seed union.
 *
 * It assembles here because it names rows from every package and no `src/`
 * file may reach sideways into another one (plan item 7), and because the
 * order interleaves the packages (products between opportunities and tasks,
 * cases before the events that point at them, contracts after campaign
 * members) so no per-package list can carry it. About ten suites read this
 * union; {@link seedDataFor} is what the two stacks actually register.
 *
 * ⚠️ A seed family is REGISTERED BY THE PACKAGE THAT OWNS ITS OBJECT, and that
 * is not a style choice: `defineStack` refuses `data` naming an object the
 * stack does not define (*"Seed data references object 'crm_case' which is not
 * defined in objects"*), so `cases` and `knowledgeArticles` cannot stay with
 * the app package once `crm_case` leaves it. The composed stack concatenates
 * `data` in composition order — module first, app last — so the replayed order
 * is no longer the order of this list. What that costs is measured, at boot,
 * in the PR that split the packages; ⛔ do not change either list on the
 * assumption that it is free.
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
 * Named here, beside the replay order they came out of, rather than in
 * `src/service/`: the split is a property of {@link CrmSeedData}, and stating
 * it next to that list is what keeps the two from drifting apart.
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

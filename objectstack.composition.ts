// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The four packages, collected into the arrays `defineStack()` takes.
 *
 * A directory under `src/` IS a package (ADR-0130, `module-split-plan.md`
 * items 6–9): `src/sales/` is the `type: 'app'` package this artifact takes
 * its identity from, and `src/service/`, `src/revenue/` and `src/marketing/`
 * are its modules, each with its own per-type barrels. There is still exactly
 * ONE `defineStack` — manifests, `composeStacks` and per-package `index.ts`
 * are the packaging PR, not this one — and it is next door in
 * `objectstack.config.ts`. This file is the collection step it consumes.
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
 * ⚠️ ORDER IS PART OF THE OUTPUT. The builder writes each collection into
 * `dist/objectstack.json` in the order it is handed (measured: reversing an
 * input array reverses the artifact array), so the assembly below reproduces
 * the exact order the single-tree barrels produced. That is what makes the
 * move PR's artifact byte-identical to the pre-move one. Two mechanisms:
 *
 *   - `byExportName()` for the collections that used to be one
 *     `Object.values(<barrel namespace>)` — a module namespace enumerates its
 *     exports in ascending code-unit order of the export NAME, so merging the
 *     four namespaces and sorting by that name gives back the one app-wide
 *     order. Four concatenated `Object.values()` calls would not.
 *   - an explicit ordered list for `hooks`, `flows`, `skills`, `sharingRules`
 *     and `data`, which were explicit ordered lists before too (in
 *     `src/hooks/index.ts`, `src/flows/index.ts`, `src/skills/index.ts`,
 *     `objectstack.config.ts` and `src/data/index.ts`). Their order
 *     interleaves the packages, so no per-package list can carry it — it
 *     belongs to whoever composes them.
 */

import * as salesObjects from './src/sales/objects/index.js';
import * as serviceObjects from './src/service/objects/index.js';
import * as revenueObjects from './src/revenue/objects/index.js';
import * as marketingObjects from './src/marketing/objects/index.js';

import * as salesActions from './src/sales/actions/index.js';
import * as serviceActions from './src/service/actions/index.js';
import * as marketingActions from './src/marketing/actions/index.js';

import * as salesDashboards from './src/sales/dashboards/index.js';
import * as serviceDashboards from './src/service/dashboards/index.js';

import * as salesDatasets from './src/sales/datasets/index.js';
import * as serviceDatasets from './src/service/datasets/index.js';
import * as revenueDatasets from './src/revenue/datasets/index.js';

import * as salesReports from './src/sales/reports/index.js';
import * as serviceReports from './src/service/reports/index.js';

import * as mappings from './src/sales/mappings/index.js';
import * as apps from './src/sales/apps/index.js';
import * as profiles from './src/sales/profiles/index.js';
import * as translations from './src/sales/translations/index.js';

import * as salesViews from './src/sales/views/index.js';
import * as serviceViews from './src/service/views/index.js';
import * as revenueViews from './src/revenue/views/index.js';
import * as marketingViews from './src/marketing/views/index.js';

import * as salesPages from './src/sales/pages/index.js';
import * as servicePages from './src/service/pages/index.js';

import { SystemAdminProfile } from './src/sales/profiles/index.js';
import { TenantAdminProfile } from './src/sales/profiles/tenant-admin.profile.js';

// Hooks — one barrel per package, assembled below in source-file-name order.
import {
  accountHook, contactHook, eventHook, forecastHook, leadHook,
  leadCampaignMetricsHook, opportunityHook, opportunityCampaignMetricsHook, taskHook,
} from './src/sales/objects/hooks.js';
import { articleFeedbackHook, caseHook, knowledgeArticleHook } from './src/service/objects/hooks.js';
import {
  contractHook, opportunityLineItemHook, productHook, quoteHook, quoteLineItemHook,
} from './src/revenue/objects/hooks.js';
import { campaignHook, campaignMemberHook } from './src/marketing/objects/hooks.js';

// Flows — the registration order the single `allFlows` array used to hold.
import {
  ContactWelcomeFlow, DemoBootstrapFlow, ForecastSnapshotFlow, LeadAssignmentFlow,
  AccountApprovalFlow,
  LeadConversionFlow, LeadConversionApprovalFlow,
  OpportunityApprovalFlow, OpportunityApprovalOnCreateFlow,
  OpportunityStagnationFlow, OpportunityWonAlertFlow, ScheduleFollowUpFlow,
  TaskDueReminderFlow, TaskUrgentAlertFlow, BillingHandoffClosedWonFlow,
} from './src/sales/flows/index.js';
import {
  CaseEscalationFlow, CaseEscalationOnCreateFlow, EscalateCaseFlow, CloseCaseFlow,
  ClaimCaseFlow, CaseEscalationStampFlow, CaseSlaMonitorFlow,
} from './src/service/flows/index.js';
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
import { CaseTriageSkill } from './src/service/skills/index.js';

import {
  AccountTeamSharingRule, TerritorySharingRules,
  OpportunitySalesSharingRule, OpportunityExecutiveSharingRule,
  CrmPositions,
} from './src/sales/sharing/index.js';
import {
  CaseEscalationSharingRule, CaseDirectorSharingRule, CaseUnassignedTriageSharingRule,
} from './src/service/sharing/index.js';
import { CampaignLeadershipSharingRules } from './src/marketing/sharing/index.js';

// Seed rows — the replay order lives in `CrmSeedData` below.
import type { HotCrmComposition } from './src/sales/data/index.js';
import {
  resolveComposition,
  accounts, contacts, leads, opportunities,
  tasks, events, eventAttendeesFromContacts, eventAttendeesFromLeads, forecasts,
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

/**
 * Every CRM lifecycle hook, in the order `src/hooks/index.ts` registered them
 * (by hook source file name) — see the ORDER note at the top of this file.
 *
 * `*.hook.ts` files now sit beside the `*.object.ts` they name, one package
 * each, which is what enforces ADR-0130 R4. Two entries therefore come from a
 * different package than the campaign metadata they maintain:
 * `opportunityCampaignMetricsHook` and `leadCampaignMetricsHook` are attached
 * to `crm_opportunity` and `crm_lead`, so they live in sales.
 */
export const allHooks = [
  accountHook,
  articleFeedbackHook,
  campaignHook,
  opportunityCampaignMetricsHook,
  leadCampaignMetricsHook,
  campaignMemberHook,
  caseHook,
  contactHook,
  contractHook,
  eventHook,
  forecastHook,
  knowledgeArticleHook,
  leadHook,
  opportunityHook,
  opportunityLineItemHook,
  productHook,
  quoteHook,
  quoteLineItemHook,
  taskHook,
].flatMap((entry) => (Array.isArray(entry) ? entry : [entry]));

/** Every flow, in the order the single `allFlows` array registered them. */
export const allFlows = [
  CampaignEnrollmentFlow,
  CampaignLeadMemberEnrollFlow,
  CampaignContactMemberEnrollFlow,
  CaseEscalationFlow,
  CaseEscalationOnCreateFlow,
  EscalateCaseFlow,
  CloseCaseFlow,
  ClaimCaseFlow,
  CaseEscalationStampFlow,
  AccountApprovalFlow,
  LeadConversionFlow,
  LeadConversionApprovalFlow,
  ScheduleFollowUpFlow,
  DemoBootstrapFlow,
  OpportunityApprovalFlow,
  OpportunityApprovalOnCreateFlow,
  QuoteGenerationFlow,
  ContractRenewalFlow,
  CaseSlaMonitorFlow,
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

/** Every skill, in the order the single `allSkills` array registered them. */
export const allSkills = [
  LeadQualificationSkill,
  EmailDraftingSkill,
  RevenueForecastingSkill,
  CaseTriageSkill,
  Customer360Skill,
  LiveDataSkill,
];

/* ─── The registration arrays, in the order `defineStack()` receives them ─── */

/** Every object definition the app registers. */
export const allObjects = byExportName({
  ...salesObjects, ...serviceObjects, ...revenueObjects, ...marketingObjects,
});

/** Every UI / AI-callable action. */
export const allActions = byExportName({ ...salesActions, ...serviceActions, ...marketingActions });

/** Every dashboard. */
export const allDashboards = byExportName({ ...salesDashboards, ...serviceDashboards });

/** Every analytics dataset (ADR-0021). */
export const allDatasets = byExportName({
  ...salesDatasets, ...serviceDatasets, ...revenueDatasets,
});

/** Every report. */
export const allReports = byExportName({ ...salesReports, ...serviceReports });

/** Every list-view group. */
export const allViews = byExportName({
  ...salesViews, ...serviceViews, ...revenueViews, ...marketingViews,
});

/** Every page layout. */
export const allPages = byExportName({ ...salesPages, ...servicePages });

/** Every import mapping — sales only; nothing else authors one. */
export const allMappings = byExportName({ ...mappings });

/** The app itself. */
export const allApps = byExportName({ ...apps });

/** The locale packs. */
export const allTranslations = byExportName({ ...translations });

/**
 * The permission sets, as the NAMESPACE rather than an array: the SaaS
 * composition filters them by identity in `objectstack.config.ts`, which needs
 * `Object.values()` over the same object the named exports come from.
 */
export const allProfiles = profiles;

export { SystemAdminProfile, TenantAdminProfile };

/**
 * The sharing rules, in the order this app has always registered them.
 *
 * Cross-package by nature — account and opportunity rules are sales', the case
 * rules service's, the campaign rules marketing's — and the order is the one
 * `objectstack.config.ts` spelled out before the split.
 */
export const CrmSharingRules = [
  AccountTeamSharingRule,
  OpportunitySalesSharingRule,
  OpportunityExecutiveSharingRule,
  CaseEscalationSharingRule,
  CaseDirectorSharingRule,
  CaseUnassignedTriageSharingRule,
  ...TerritorySharingRules,
  ...CampaignLeadershipSharingRules,
];

export { CrmPositions };


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
 * All CRM seed datasets, in REPLAY ORDER.
 *
 * This list assembles here rather than in a package barrel for two reasons,
 * and the second is the binding one. It names rows from all four packages, and
 * no `src/` file may reach sideways into another package (plan item 7). And
 * the order is load-bearing — rows resolve their lookups against rows seeded
 * earlier, and the order interleaves the packages (products between
 * opportunities and tasks, contracts after campaign members), so it is not
 * recoverable by concatenating four per-package lists in any package order.
 * It is exactly the order `CrmSeedData` has always had.
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

/** The seed datasets a composition registers. */
export const seedDataFor = (composition: HotCrmComposition): typeof CrmSeedData =>
  composition === 'saas' ? SaasTenantSeedData : CrmSeedData;

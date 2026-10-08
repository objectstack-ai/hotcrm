// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineStack, type ObjectStackDefinition, type ObjectStackDefinitionInput } from '@objectstack/spec';

import {
  EscalateCaseAction, CloseCaseAction, ClaimCaseAction,
  LogCallAction, LogMeetingAction, CaseScheduleMeetingAction,
  MarkArticleHelpfulAction, MarkArticleNotHelpfulAction,
} from './actions/index.js';
import { ServiceDashboard } from './dashboards/index.js';
import { CaseDataset } from './datasets/index.js';
import { ServiceEmailTemplates } from './email-templates/index.js';
import {
  CaseEscalationFlow, CaseEscalationOnCreateFlow, EscalateCaseFlow, CloseCaseFlow,
  ClaimCaseFlow, CaseEscalationStampFlow, CaseSlaMonitorFlow,
} from './flows/index.js';
import { ArticleFeedback, Case, KnowledgeArticle } from './objects/index.js';
import { articleFeedbackHook, caseHook, knowledgeArticleHook } from './objects/hooks.js';
import { CaseDetailPage } from './pages/index.js';
import {
  CasesByStatusPriorityReport, SlaPerformanceReport, CasesOpenedByDayPriorityReport,
} from './reports/index.js';
import {
  CaseDirectorSharingRule, CaseEscalationSharingRule, CaseUnassignedTriageSharingRule,
} from './sharing/index.js';
import { CaseTriageSkill } from './skills/index.js';
import { CaseViews, KnowledgeArticleViews } from './views/index.js';

/**
 * The four collections of this package that the app-wide sweeps also read,
 * named once, here.
 *
 * `objectstack.composition.ts` assembles `allHooks`, `allFlows`, `allSkills`
 * and `CrmSharingRules` — every hook, flow, skill and sharing rule of the
 * ARTIFACT — out of each package's own list, so the suites that sweep them keep
 * reading one list and this package's half of it is the very array its stack
 * registers. `.flat()` because a `*.hook.ts` may default-export an ARRAY of
 * hooks (one file, several triggers on its object).
 */
export const serviceHooks = [articleFeedbackHook, caseHook, knowledgeArticleHook].flat();

/** This package's flows — see {@link serviceHooks}. */
export const serviceFlows = [
  CaseEscalationFlow, CaseEscalationOnCreateFlow, EscalateCaseFlow, CloseCaseFlow,
  ClaimCaseFlow, CaseEscalationStampFlow, CaseSlaMonitorFlow,
];

/** This package's skills — see {@link serviceHooks}. */
export const serviceSkills = [CaseTriageSkill];

/** This package's sharing rules — see {@link serviceHooks}. */
export const serviceSharingRules = [
  CaseEscalationSharingRule, CaseDirectorSharingRule, CaseUnassignedTriageSharingRule,
];

/**
 * What this package registers but does not assemble: its seed rows.
 *
 * Everything else comes from this package's own barrels. The seed families are
 * the one exception because WHICH families a build replays is the
 * `HOTCRM_COMPOSITION` knob's decision (#1361), made once, at the root — a
 * SaaS tenant gets the product catalogue and nothing else, so this package
 * registers no rows in that shape. See `seedDataFor` in
 * `objectstack.composition.ts`.
 */
export type HotCrmServiceCollections = Pick<ObjectStackDefinitionInput, 'data'>;

/**
 * `app.objectstack.hotcrm.service` — the SUPPORT module of this artifact
 * (ADR-0130 D4: one release artifact, N packages, one namespace).
 *
 * It owns `crm_case`, `crm_knowledge_article` and `crm_article_feedback`, and
 * every item authored against them: their hooks, views, the case detail page,
 * the seven case flows, the case and article actions, `case_metrics` and the
 * three reports over it, the Service Overview dashboard, the case-triage skill,
 * the three case sharing rules, the two case notification templates and the
 * case and knowledge seed rows.
 *
 * Three properties are load-bearing:
 *
 *  - **The same `namespace` as the app package.** That is what ADR-0130 D1
 *    buys: co-ownership of one namespace inside one artifact, so `crm_case`
 *    keeps its name instead of becoming `service_case`. The object `name` IS
 *    the table name, the REST path and the saved-view key (ADR-0129 D1–D2), so
 *    a rename would be a data migration; this split costs none.
 *  - **`dependencies` is the edge; the array order in `objectstack.config.ts`
 *    is not.** The load path sorts `packages[]` through the platform's one
 *    topological sorter (ADR-0130 D5, ADR-0116), so the app package registers
 *    first whatever slot it occupies in the `composeStacks([…])` call.
 *  - **Navigation crosses only through contributions** — the block below.
 *
 * ⛔ No `i18n` here: it is a `'single'`-disposition stack key, so two stacks
 * declaring DIFFERENT values make `composeStacks` throw and declaring identical
 * ones twice is a second place to drift. The app package declares it once, for
 * the artifact — and the locale packs that label this package's objects stay
 * whole in the app package with it.
 *
 * `requires` is the opposite: `defineStack` validates trigger capability PER
 * STACK, so a package whose own flows declare `record_change` / `schedule`
 * triggers must declare `triggers` itself — the app package's slate does not
 * reach this parse:
 *
 *     ✗ flow 'case_escalation' declares a 'record_change' trigger but
 *       `requires` does not include 'triggers' …
 *
 * So this list is exactly what THIS package's metadata needs: `automation` and
 * `triggers` for the seven case flows, `analytics` for `case_metrics` and the
 * items over it, `sharing` for the three case sharing rules. The app package's
 * surface capabilities (`auth`, `ui`, `approvals`, `hierarchy-security`) are
 * not repeated.
 *
 * Registration stays file-by-file: every item is named here, through its
 * directory barrel. A file that reaches no barrel and no line below is
 * validated by nothing.
 */
export const createHotCrmServiceStack = (
  collections: HotCrmServiceCollections,
): ObjectStackDefinition => defineStack({
  manifest: {
    id: 'app.objectstack.hotcrm.service',
    name: 'HotCRM Service',
    // The app package's namespace, deliberately (ADR-0130 D1).
    namespace: 'crm',
    // The ARTIFACT's version: one `package.json`, one build, one release
    // (ADR-0130 D6), so a module of this artifact is never at a version of its
    // own. `changeset version` moves it together with the app package's.
    version: '3.1.0',
    type: 'module',
    description: 'HotCRM support module — cases, knowledge articles, and the SLA surface.',
    // The same protocol as the app package (ADR-0087 handshake); bump it with
    // `specVersion` on every platform upgrade, exactly as the app's is.
    engines: { protocol: '^17.7.0' },
    // The App package this module extends.
    dependencies: { 'app.objectstack.hotcrm': '^3.1.0' },

    /**
     * The five navigation entries this module puts into the app's menu
     * (ADR-0029 D7).
     *
     * Not a design choice: an app's own `navigation` may not name another
     * package's object (ADR-0130 §1.5, rule R3 of `module-split-plan.md`), so
     * all five became contributions the moment `crm_case`,
     * `crm_knowledge_article`, `service_dashboard` and `sla_performance` left
     * the app package. The app keeps the GROUPS (`group_service`, `group_work`,
     * `group_insights`) — a container a module cannot declare inside an app it
     * does not own — and this module fills them.
     *
     * `app` is the app's bare `name` (`crm_enterprise`), not the manifest id: a
     * dotted id is refused as a non-snake_case identifier.
     *
     * ⚠️ `priority` orders CONTRIBUTIONS against each other inside a group. It
     * does NOT interleave them with the app's own children — a contributed item
     * is appended after everything the app itself declares in that group. The
     * one visible consequence is `nav_my_cases`, 4th of 6 in *My Work* before
     * the split and last after it; the three `group_service` items and
     * `nav_report_sla` keep their positions because the app declares nothing
     * after them. ⛔ Do not compensate with a per-item `order`: that key sorts
     * in the renderer only, this app authors none anywhere, and adding one to
     * work around a platform merge rule is what AGENTS.md forbids.
     */
    navigationContributions: [
      {
        app: 'crm_enterprise',
        group: 'group_service',
        // Stated rather than defaulted so that the day a second package
        // contributes into one of these groups, the order is an authored fact
        // instead of a registration-order accident.
        priority: 10,
        items: [
          { id: 'nav_case',      type: 'object', objectName: 'crm_case',              label: 'Cases',     icon: 'life-buoy' },
          { id: 'nav_knowledge', type: 'object', objectName: 'crm_knowledge_article', label: 'Knowledge', icon: 'book-open' },
          { id: 'nav_service_dashboard', type: 'dashboard', dashboardName: 'service_dashboard', label: 'Service Overview', icon: 'gauge' },
        ],
      },
      {
        app: 'crm_enterprise',
        group: 'group_work',
        priority: 20,
        items: [
          { id: 'nav_my_cases', type: 'object', objectName: 'crm_case', viewName: 'my_open_cases', label: 'My Cases', icon: 'life-buoy' },
        ],
      },
      {
        app: 'crm_enterprise',
        group: 'group_insights',
        priority: 30,
        items: [
          { id: 'nav_report_sla', type: 'report', reportName: 'sla_performance', label: 'SLA Performance', icon: 'timer' },
        ],
      },
    ],
  },

  // What THIS package's metadata needs — see the `requires` paragraph above.
  requires: ['automation', 'triggers', 'analytics', 'sharing'],

  objects: [ArticleFeedback, Case, KnowledgeArticle],
  hooks: serviceHooks,
  views: [CaseViews, KnowledgeArticleViews],
  pages: [CaseDetailPage],
  flows: serviceFlows,
  actions: [
    EscalateCaseAction, CloseCaseAction, ClaimCaseAction,
    LogCallAction, LogMeetingAction, CaseScheduleMeetingAction,
    MarkArticleHelpfulAction, MarkArticleNotHelpfulAction,
  ],
  datasets: [CaseDataset],
  reports: [CasesByStatusPriorityReport, SlaPerformanceReport, CasesOpenedByDayPriorityReport],
  dashboards: [ServiceDashboard],
  skills: serviceSkills,
  sharingRules: serviceSharingRules,
  emailTemplates: ServiceEmailTemplates,

  ...collections,
});


// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineStack, P, type ObjectStackDefinition, type ObjectStackDefinitionInput } from '@objectstack/spec';

import {
  EscalateCaseAction, CloseCaseAction, ClaimCaseAction, ReopenCaseAction,
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
  CaseDirectorSharingRule, CaseEscalatedFromSharingRule, CaseEscalationSharingRule, CaseUnassignedTriageSharingRule,
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
  CaseEscalationSharingRule, CaseDirectorSharingRule, CaseUnassignedTriageSharingRule, CaseEscalatedFromSharingRule,
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
 * Who this package's case entries are for (#2244): everyone but a sales rep.
 *
 * A rep's permission set reads cases (an account's history is part of selling
 * to it), so the read gate alone kept Service Overview, Cases, My Cases and the
 * three case reports in a rep's sidebar: no case of their own, none they can
 * create, an overview of zeros. What a rep IS, is the holder of the
 * `sales_rep` position — the same question the app's Home gate asks
 * (`EXECUTIVE_AUDIENCE` in `src/sales/apps/crm.app.ts`, which says why no
 * `current_user.can(…)` term can tell a rep apart). The two gates spell the
 * position out each: `P` interpolates a value as a literal, never as an
 * expression, so the sub-predicate cannot be shared by reference.
 *
 * Knowledge asks it too since #2367 row 1, and a rep gets it in the Sales
 * group instead (`SALES_REP` below). It had stayed in the Service group for a
 * rep, since articles are read while selling, which left a rep a Service group
 * of that one entry between Sales Home and the Sales group. A group whose
 * every entry is hidden is not drawn, so a rep's sidebar now runs Sales Home,
 * then Sales.
 *
 * Landing (#2060 item 5) is unmoved: a rep's first shown entry is Sales Home,
 * ahead of the Service group, and a service persona or the administrator
 * holds no `sales_rep` position, so the dashboard still leads for them.
 */
const NOT_A_SALES_REP = P`!("sales_rep" in current_user.positions)`;

/**
 * The rep's own Knowledge entry, folded into the Sales group (#2367 row 1):
 * exactly the members `NOT_A_SALES_REP` refuses, so every member is shown one
 * Knowledge entry and no member two.
 *
 * Folded, not hidden: the console's search box (⌘K) looks for records only in
 * the objects of the entries the member is shown (measured on 18.2.0, its
 * `GET /api/v1/search?objects=…`), so a rep with no Knowledge entry could no
 * longer find an article by its title. The entry opens the Published view,
 * the articles a rep reads, which also keeps it a different destination from
 * the Service group's plain list (`test/app-navigation-shape.test.ts`, #1259).
 */
const SALES_REP = P`"sales_rep" in current_user.positions`;

/**
 * The read gate on this package's dashboard and report entries (#2073 item 1,
 * #2338 item 1), narrowed to the audience above.
 *
 * The console prunes an object entry by read access, but not a dashboard or a
 * report entry. Service Overview carried `NOT_A_SALES_REP` alone until #2338,
 * so a member who reads no cases (the marketing user, whose set "see[s] no
 * cases") was offered it, and every one of its tiles answered "You don't have
 * permission to view the data behind this widget" (14 refused dataset queries,
 * measured on 18.2.0). Cases and My Cases were already hidden from that member
 * by the prune. The dashboard now asks the question the case reports ask.
 */
const CASE_READ_AUDIENCE = P`current_user.can("crm_case", "read") && !("sales_rep" in current_user.positions)`;

/**
 * `app.objectstack.hotcrm.service` — the SUPPORT module of this artifact
 * (ADR-0130 D4: one release artifact, N packages, one namespace).
 *
 * It owns `crm_case`, `crm_knowledge_article` and `crm_article_feedback`, and
 * every item authored against them: their hooks, views, the case detail page,
 * the seven case flows, the case and article actions, `case_metrics` and the
 * three reports over it, the Service Overview dashboard, the case-triage skill,
 * the four case sharing rules, the two case notification templates and the
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
 *       `requires` does not include 'automation' or 'triggers' — no
 *       'record_change' trigger would be registered …
 *
 * (measured on 17.7.0 by deleting the line below: three such refusals, one
 * per triggered case flow).
 *
 * So this list is exactly what THIS package's metadata needs: `automation` and
 * `triggers` for the seven case flows, `analytics` for `case_metrics` and the
 * items over it, `sharing` for the four case sharing rules. The app package's
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
    // own. Bump it with the app package's and `package.json` —
    // `test/docs-declared-versions.test.ts` holds all three, and the range
    // below, to one value.
    version: '6.0.0',
    type: 'module',
    description: 'HotCRM support module — cases, knowledge articles, and the SLA surface.',
    // The same protocol as the app package (ADR-0087 handshake); bump it with
    // `specVersion` on every platform upgrade, exactly as the app's is.
    engines: { protocol: '^18.2.0' },
    // The App package this module extends.
    dependencies: { 'app.objectstack.hotcrm': '^6.0.0' },

    /**
     * The eight navigation entries this module puts into the app's menu
     * (ADR-0029 D7).
     *
     * Not a design choice: an app's own `navigation` may not name another
     * package's object or report (ADR-0130 §1.5, rule R3 of
     * `module-split-plan.md`), so this package's entries became contributions
     * the moment `crm_case`, `crm_knowledge_article`, `service_dashboard` and
     * the case reports left the app package. The app keeps the GROUPS
     * (`group_service`, `group_sales`, `group_work`, `group_reports`) — a
     * container a module cannot declare inside an app it does not own — and
     * this module fills them.
     *
     * `app` is the app's bare `name` (`crm_enterprise`), not the manifest id: a
     * dotted id is refused as a non-snake_case identifier.
     *
     * ⚠️ `priority` orders CONTRIBUTIONS against each other inside a group. It
     * does NOT interleave them with the app's own children — a contributed item
     * is appended after everything the app itself declares in that group. So
     * `nav_my_cases` is last in *My Work*, and the case reports follow the
     * sales reports in *Reports*. ⛔ Do not compensate with a per-item
     * `order`: that key sorts in the renderer only, this app authors none
     * anywhere, and adding one to work around a platform merge rule is what
     * AGENTS.md forbids.
     *
     * The dashboard and report entries ask for case read: the console prunes
     * object entries by read access but not dashboard or report entries, so a
     * member who reads no cases (the marketing user) would otherwise get a
     * dashboard and three pages of 403s (`CASE_READ_AUDIENCE` above). The app's
     * `READS_OPPORTUNITIES` note in `crm.app.ts` says why it is `visible` and
     * not `requiredPermissions`. Every entry of the Service group, and My Cases,
     * also asks that the member is not a sales rep (`NOT_A_SALES_REP` above,
     * #2244; Knowledge since #2367).
     */
    navigationContributions: [
      {
        app: 'crm_enterprise',
        group: 'group_service',
        // Stated rather than defaulted so that the day a second package
        // contributes into one of these groups, the order is an authored fact
        // instead of a registration-order accident.
        priority: 10,
        // The dashboard leads (#2060 item 5): `group_service` is the app's
        // first group and declares no children, so this item is the first
        // entry a service agent or manager is shown, and the app opens on it.
        items: [
          { id: 'nav_service_dashboard', type: 'dashboard', dashboardName: 'service_dashboard', label: 'Service Overview', icon: 'gauge', visible: CASE_READ_AUDIENCE },
          { id: 'nav_case',      type: 'object', objectName: 'crm_case',              label: 'Cases',     icon: 'life-buoy', visible: NOT_A_SALES_REP },
          { id: 'nav_knowledge', type: 'object', objectName: 'crm_knowledge_article', label: 'Knowledge', icon: 'book-open', visible: NOT_A_SALES_REP },
        ],
      },
      {
        app: 'crm_enterprise',
        // A rep's Knowledge (#2367 row 1, `SALES_REP` above), last in Sales:
        // after the app's own children and after the revenue module's entries
        // (priority 40).
        group: 'group_sales',
        priority: 60,
        items: [
          { id: 'nav_knowledge_published', type: 'object', objectName: 'crm_knowledge_article', viewName: 'published_articles', label: 'Knowledge', icon: 'book-open', visible: SALES_REP },
        ],
      },
      {
        app: 'crm_enterprise',
        group: 'group_work',
        priority: 20,
        items: [
          { id: 'nav_my_cases', type: 'object', objectName: 'crm_case', viewName: 'my_open_cases', label: 'My Cases', icon: 'life-buoy', visible: NOT_A_SALES_REP },
        ],
      },
      {
        app: 'crm_enterprise',
        // Every shipped report has an entry in the app's Reports group
        // (#2073 item 1); this package's three land after the sales ones.
        group: 'group_reports',
        priority: 30,
        items: [
          { id: 'nav_report_cases_by_status',     type: 'report', reportName: 'cases_by_status_priority',     label: 'Cases by Status and Priority', icon: 'chart-column',  visible: CASE_READ_AUDIENCE },
          { id: 'nav_report_sla',                 type: 'report', reportName: 'sla_performance',              label: 'SLA Performance',              icon: 'timer',         visible: CASE_READ_AUDIENCE },
          { id: 'nav_report_cases_opened_by_day', type: 'report', reportName: 'cases_opened_by_day_priority', label: 'Cases Opened by Day',          icon: 'calendar-days', visible: CASE_READ_AUDIENCE },
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
    EscalateCaseAction, CloseCaseAction, ClaimCaseAction, ReopenCaseAction,
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


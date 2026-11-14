// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineStack, type ObjectStackDefinition, type ObjectStackDefinitionInput } from '@objectstack/spec';

import {
  EscalateCaseAction, CloseCaseAction, ReopenCaseAction,
  LogCallAction, LogMeetingAction, CaseScheduleMeetingAction,
  MarkArticleHelpfulAction, MarkArticleNotHelpfulAction,
} from './actions/index.js';
import { ServiceDashboard } from './dashboards/index.js';
import { ServiceApp, SALES_REP } from './apps/index.js';
import { CrmServiceManual } from './books/index.js';
import { CaseDataset } from './datasets/index.js';
import { ServiceEmailTemplates } from './email-templates/index.js';
import {
  CaseEscalationFlow, CaseEscalationOnCreateFlow, EscalateCaseFlow, CloseCaseFlow,
  CaseEscalationStampFlow, CaseSlaMonitorFlow,
} from './flows/index.js';
import { ArticleFeedback, Case, KnowledgeArticle } from './objects/index.js';
import { articleFeedbackHook, caseHook, knowledgeArticleHook } from './objects/hooks.js';
import { CaseDetailPage } from './pages/index.js';
import {
  CasesByStatusPriorityReport, SlaPerformanceReport, CasesOpenedByDayPriorityReport,
} from './reports/index.js';
import {
  CaseDirectorSharingRule, CaseEscalatedFromSharingRule, CaseEscalationSharingRule,
} from './sharing/index.js';
import { CaseIntakeAssignmentRule } from './assignment-rules/index.js';
import { CaseIntakeQueue } from './queues/index.js';
import { CaseTriageSkill } from './skills/index.js';
import { ServiceTranslations } from './translations/index.js';
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
  CaseEscalationStampFlow, CaseSlaMonitorFlow,
];

/** This package's skills — see {@link serviceHooks}. */
export const serviceSkills = [CaseTriageSkill];

/** This package's sharing rules — see {@link serviceHooks}. */
export const serviceSharingRules = [
  CaseEscalationSharingRule, CaseDirectorSharingRule, CaseEscalatedFromSharingRule,
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
 * the artifact. `translations` is the opposite, a `'concat'` key: this package
 * registers the rows for its own items itself (`./translations/index.ts`).
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
    version: '6.2.1',
    type: 'module',
    description: 'HotCRM support module — cases, knowledge articles, and the SLA surface.',
    // The same protocol as the app package (ADR-0087 handshake); bump it with
    // the template manifest's `engines.protocol` on every platform upgrade,
    // exactly as the app's is.
    engines: { protocol: '^18.4.0' },
    // The App package this module extends.
    dependencies: { 'app.objectstack.hotcrm': '^6.2.1' },

    /**
     * The one entry this module puts into the Sales app (ADR-0029 D7): a
     * rep's Knowledge (#2367 row 1), the Published view, last in Sales after
     * the revenue module's entries (priority 40). Folded, not hidden: the
     * console's ⌘K looks for records only in the objects of the entries the
     * member is shown (measured on 18.2.0), so without it a rep could not
     * find an article by its title.
     *
     * Everything else this package shows lives in its own app, the Service app
     * (`./apps/service.app.ts`, #2417), which names this package's items
     * directly; the customers and the member's own tasks reach that app the
     * other way, contributed by `src/sales/index.ts`.
     *
     * `app` is the app's bare `name` (`crm_enterprise`), not the manifest id:
     * a dotted id is refused as a non-snake_case identifier.
     */
    navigationContributions: [
      {
        app: 'crm_enterprise',
        group: 'group_sales',
        priority: 60,
        items: [
          { id: 'nav_knowledge_published', type: 'object', objectName: 'crm_knowledge_article', viewName: 'published_articles', label: 'Knowledge', icon: 'book-open', visible: SALES_REP },
        ],
      },
    ],
  },

  // What THIS package's metadata needs — see the `requires` paragraph above.
  requires: ['automation', 'triggers', 'analytics', 'sharing'],

  objects: [ArticleFeedback, Case, KnowledgeArticle],
  apps: [ServiceApp],
  hooks: serviceHooks,
  views: [CaseViews, KnowledgeArticleViews],
  pages: [CaseDetailPage],
  flows: serviceFlows,
  actions: [
    EscalateCaseAction, CloseCaseAction, ReopenCaseAction,
    LogCallAction, LogMeetingAction, CaseScheduleMeetingAction,
    MarkArticleHelpfulAction, MarkArticleNotHelpfulAction,
  ],
  datasets: [CaseDataset],
  reports: [CasesByStatusPriorityReport, SlaPerformanceReport, CasesOpenedByDayPriorityReport],
  dashboards: [ServiceDashboard],
  skills: serviceSkills,
  sharingRules: serviceSharingRules,
  // ADR-0142: ownerless new cases wait in Support Intake and go to its
  // least-loaded member; an agent takes one with the console's Claim.
  queues: [CaseIntakeQueue],
  assignmentRules: [CaseIntakeAssignmentRule],
  emailTemplates: ServiceEmailTemplates,
  books: [CrmServiceManual],
  translations: [ServiceTranslations],

  ...collections,
});


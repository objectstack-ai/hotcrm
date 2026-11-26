// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineStack, type ObjectStackDefinition, type ObjectStackDefinitionInput } from '@objectstack/spec';

import { SubmitTimesheetAction } from './actions/index.js';
import { PsaApp } from './apps/index.js';
import { CrmPsaManual } from './books/index.js';
import { ProjectsOverviewDashboard } from './dashboards/index.js';
import { ProjectFinancialsDataset, TimeUtilizationDataset } from './datasets/index.js';
import { PsaEmailTemplates } from './email-templates/index.js';
import { ExpenseProjectExtensions } from './extensions/index.js';
import {
  ExpenseReportProjectApprovalFlow, ExpenseRequestProjectApprovalFlow, ExpenseRequestProjectApprovalOnCreateFlow,
  ProjectBudgetAlertFlow, ProjectBudgetApprovalFlow,
  ProjectInitiationApprovalFlow, ProjectMemberPersonRenameFlow, TimesheetApprovalFlow, TimesheetApprovalOnCreateFlow,
} from './flows/index.js';
import {
  Project, ProjectBudget, ProjectBudgetLine, ProjectMember, ProjectTask, RateCard, TimeEntry, Timesheet,
} from './objects/index.js';
import {
  projectBudgetHook, projectHook, projectMemberHook, projectTaskHook, timeEntryHook, timesheetHook,
} from './objects/hooks.js';
import {
  ProjectFinanceEditSharingRules,
  ProjectManagerEditSharingRule,
  ProjectTeamReadSharingRule,
  TimesheetApproverEditSharingRule,
} from './sharing/index.js';
import { PsaTranslations } from './translations/index.js';
import { PsaFlowStepTranslations } from './translations/flow-steps.js';
import {
  ProjectBudgetLineViews, ProjectBudgetViews, ProjectMemberViews, ProjectTaskViews, ProjectViews,
  RateCardViews, TimeEntryViews, TimesheetViews,
} from './views/index.js';

/**
 * This package's hooks, for the artifact-wide sweeps (`allHooks` in
 * `objectstack.composition.ts`) — see `serviceHooks` in
 * `src/service/index.ts` for the arrangement. Every one attaches to a module
 * object (ADR-0130 R4).
 */
export const psaHooks = [
  projectHook, projectBudgetHook, projectMemberHook, projectTaskHook, timesheetHook, timeEntryHook,
].flat();

/**
 * This package's flows (#2316 phase 1b) — see {@link psaHooks}: the
 * approvals (a budget top-up's since hotcrm#2547), the two insert twins, the
 * budget alert, the staffing rows' rename follower (hotcrm#2568), and the
 * project path of the expense module's report and travel request, with its
 * insert twin (hotcrm#2575).
 */
export const psaFlows = [
  ProjectInitiationApprovalFlow, ProjectBudgetApprovalFlow,
  TimesheetApprovalFlow, TimesheetApprovalOnCreateFlow,
  ProjectBudgetAlertFlow, ProjectMemberPersonRenameFlow,
  ExpenseReportProjectApprovalFlow,
  ExpenseRequestProjectApprovalFlow, ExpenseRequestProjectApprovalOnCreateFlow,
];

/** This package's sharing rules — see {@link psaHooks}. */
export const psaSharingRules = [
  ProjectTeamReadSharingRule, ProjectManagerEditSharingRule,
  TimesheetApproverEditSharingRule,
  ...ProjectFinanceEditSharingRules,
];

/**
 * `app.objectstack.hotcrm.psa` — the PROJECT DELIVERY module (PSA,
 * 「项目交付」) of this artifact (REQ-0002, `docs/architecture/psa-module-plan.md`,
 * hotcrm#2316).
 *
 * A `type: 'module'` package shipped inside the one HotCRM artifact, as
 * `src/o2c/` is, and switched on or off per tenant through the platform's
 * package disable. The maintainer ruled the shape on 2026-11-15 (the plan's
 * *Recorded 2026-11-15*, option A): a suite module with its own app, depending
 * on the app package only. A separately built artifact cannot hold a lookup
 * into a HotCRM object (`object-reference-unknown`, objectstack#25805 closed
 * not planned), and a project is a child of an account, an opportunity and a
 * contract.
 *
 * Phase 0 (#2471) joined the suite with the Project Delivery app skeleton.
 * Phase 1a adds the six v1 objects (ruling 3): project, staffing, rate card,
 * timesheet and its entries, expense, with the hooks that keep a project's
 * team and copy an entry's rates, the record-relative sharing rules, views,
 * seed rows and labels, and the actual cost, amount to bill and margin
 * roll-ups. Their grants are rows in the app package's permission sets
 * (ADR-0130 addendum, 2026-09-02): `project_manager`, `project_member` and
 * `finance_controller`, distributed by the positions in
 * `src/sales/sharing/positions.ts`. Phase 1b adds the three approvals and
 * the overrun alert and lock. Phase 2c (hotcrm#2547) adds budget versions
 * and their lines, the Approved Budget summed from the baseline. Phase 1c adds the module's manual under *Help*,
 * its two datasets and the Projects Overview dashboard that reads them.
 *
 * Since hotcrm#2556 the expense is the expense module's (REQ-0011): this
 * module depends on it, contributes the Project field on the expense and on
 * the expense report (hotcrm#2559) through `objectExtensions`, and keeps the
 * expense cost summaries on the project. It owns the approval of an expense
 * report or a travel request on a project (`expense_report_project_approval`,
 * `expense_request_project_approval` and its insert twin, with the report's
 * two turn-back notices), which sat in the expense module until the platform
 * judged a flow's trigger object against the package's dependencies
 * (objectstack#34616, in 18.6.0; moved back by hotcrm#2575).
 *
 * Packaged exactly as `src/service/index.ts` is; that file carries the
 * reasoning for `namespace`, `dependencies`, the absent `i18n` and the
 * artifact's version.
 */
/**
 * What the composition hands this package: its seed families, cut out of the
 * artifact's ordered union (`PsaSeedData` in `objectstack.composition.ts`).
 */
export type HotCrmPsaCollections = Pick<ObjectStackDefinitionInput, 'data'>;

export const createHotCrmPsaStack = (
  collections: HotCrmPsaCollections = {},
): ObjectStackDefinition => defineStack({
  manifest: {
    id: 'app.objectstack.hotcrm.psa',
    name: 'HotCRM Project Delivery',
    // The app package's namespace, deliberately (ADR-0130 D1).
    namespace: 'crm',
    // The ARTIFACT's version (ADR-0130 D6) — `test/docs-declared-versions.test.ts`
    // holds it, and the range below, to the app package's.
    version: '6.6.0',
    type: 'module',
    description: 'HotCRM project delivery module — projects, staffing, time, expenses and delivery margin.',
    engines: { protocol: '^19.0.0-next.0' },
    // The App package this module extends, and the expense module whose
    // `crm_expense` it extends with the project (hotcrm#2556) — the one
    // add-on → add-on edge `module-split-plan.md` item 18 allows; item 10
    // stands for every other add-on. No dependency on Order to Cash: how the
    // two connect is decided in phase 3 (ruling 4).
    dependencies: { 'app.objectstack.hotcrm': '^6.6.0', 'app.objectstack.hotcrm.expense': '^6.6.0' },
  },

  // What THIS package's metadata needs (see `requires` in
  // `src/service/index.ts`): `automation` and `triggers` for the record-change
  // flows, `approvals` for their approval nodes, `sharing` for the rules,
  // `analytics` for the datasets.
  requires: ['automation', 'triggers', 'approvals', 'sharing', 'analytics'],

  // The delivery team's app; see the app's own note.
  apps: [PsaApp],
  objects: [
    Project, ProjectBudget, ProjectBudgetLine, ProjectMember, ProjectTask, RateCard, Timesheet, TimeEntry,
  ],
  // The expense's Project field (hotcrm#2556); see the extension's own note.
  objectExtensions: ExpenseProjectExtensions,
  hooks: psaHooks,
  views: [
    ProjectViews, ProjectBudgetViews, ProjectBudgetLineViews, ProjectMemberViews, ProjectTaskViews, RateCardViews,
    TimesheetViews, TimeEntryViews,
  ],
  actions: [SubmitTimesheetAction],
  sharingRules: psaSharingRules,
  flows: psaFlows,
  emailTemplates: PsaEmailTemplates,
  // Read only by the module's own dashboard (phase-0 reading P4); see each
  // file's note.
  datasets: [ProjectFinancialsDataset, TimeUtilizationDataset],
  dashboards: [ProjectsOverviewDashboard],
  // Its manual (phase 1c), over `src/psa/docs/`. See the book's own note.
  books: [CrmPsaManual],
  data: collections.data,
  translations: [PsaTranslations, PsaFlowStepTranslations],
});

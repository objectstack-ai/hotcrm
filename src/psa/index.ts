// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineStack, type ObjectStackDefinition, type ObjectStackDefinitionInput } from '@objectstack/spec';

import { PsaApp } from './apps/index.js';
import { PsaEmailTemplates } from './email-templates/index.js';
import {
  ExpenseApprovalFlow, ExpenseApprovalOnCreateFlow, ProjectBudgetAlertFlow, ProjectInitiationApprovalFlow,
  TimesheetApprovalFlow, TimesheetApprovalOnCreateFlow,
} from './flows/index.js';
import { Expense, Project, ProjectMember, RateCard, TimeEntry, Timesheet } from './objects/index.js';
import { expenseHook, projectHook, projectMemberHook, timeEntryHook, timesheetHook } from './objects/hooks.js';
import {
  ExpenseApproverEditSharingRule,
  ProjectFinanceEditSharingRules,
  ProjectManagerEditSharingRule,
  ProjectTeamReadSharingRule,
  TimesheetApproverEditSharingRule,
} from './sharing/index.js';
import { PsaTranslations } from './translations/index.js';
import { ExpenseViews, ProjectMemberViews, ProjectViews, RateCardViews, TimeEntryViews, TimesheetViews } from './views/index.js';

/**
 * This package's hooks, for the artifact-wide sweeps (`allHooks` in
 * `objectstack.composition.ts`) — see `serviceHooks` in
 * `src/service/index.ts` for the arrangement. Every one attaches to a module
 * object (ADR-0130 R4).
 */
export const psaHooks = [projectHook, projectMemberHook, timesheetHook, timeEntryHook, expenseHook].flat();

/**
 * This package's flows (#2316 phase 1b) — see {@link psaHooks}: the three
 * approvals, the two insert twins and the budget alert.
 */
export const psaFlows = [
  ProjectInitiationApprovalFlow,
  TimesheetApprovalFlow, TimesheetApprovalOnCreateFlow,
  ExpenseApprovalFlow, ExpenseApprovalOnCreateFlow,
  ProjectBudgetAlertFlow,
];

/** This package's sharing rules — see {@link psaHooks}. */
export const psaSharingRules = [
  ProjectTeamReadSharingRule, ProjectManagerEditSharingRule,
  TimesheetApproverEditSharingRule, ExpenseApproverEditSharingRule,
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
 * the overrun alert and lock.
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
    version: '6.3.0',
    type: 'module',
    description: 'HotCRM project delivery module — projects, staffing, time, expenses and delivery margin.',
    engines: { protocol: '^18.4.0' },
    // The App package this module extends, and nothing else
    // (`module-split-plan.md` item 10: one dependency level). No dependency
    // on Order to Cash: how the two connect is decided in phase 3 (ruling 4).
    dependencies: { 'app.objectstack.hotcrm': '^6.3.0' },
  },

  // What THIS package's metadata needs (see `requires` in
  // `src/service/index.ts`): `automation` and `triggers` for the record-change
  // flows, `approvals` for their approval nodes, `sharing` for the rules.
  requires: ['automation', 'triggers', 'approvals', 'sharing'],

  // The delivery team's app; see the app's own note.
  apps: [PsaApp],
  objects: [Project, ProjectMember, RateCard, Timesheet, TimeEntry, Expense],
  hooks: psaHooks,
  views: [ProjectViews, ProjectMemberViews, RateCardViews, TimesheetViews, TimeEntryViews, ExpenseViews],
  sharingRules: psaSharingRules,
  flows: psaFlows,
  emailTemplates: PsaEmailTemplates,
  data: collections.data,
  translations: [PsaTranslations],
});

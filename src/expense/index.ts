// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineStack, type ObjectStackDefinition, type ObjectStackDefinitionInput } from '@objectstack/spec';

import { ExpenseApp } from './apps/index.js';
import { CrmExpenseManual } from './books/index.js';
import {
  SubmitForReimbursementAction, SubmitTripForReimbursementAction, SubmitExpenseReportAction, ReopenExpenseReportAction, MarkExpenseReportPaidAction,
  SubmitExpenseRequestAction, CancelExpenseRequestAction, CloseExpenseRequestAction,
} from './actions/index.js';
import {
  ExpenseReportApprovalFlow,
  ExpenseRequestApprovalFlow, ExpenseRequestApprovalOnCreateFlow,
} from './flows/index.js';
import { Expense, ExpenseReport, ExpenseRequest, ExpenseRequestLine, ExpenseStandard } from './objects/index.js';
import { expenseHook, expenseReportHook, expenseRequestHook, expenseRequestLineHook } from './objects/hooks.js';
import {
  ExpenseApproverEditSharingRule, ExpenseReportApproverEditSharingRule, ExpenseRequestApproverEditSharingRule,
} from './sharing/index.js';
import { ExpenseCheckSkill, ExpenseFilingSkill } from './skills/index.js';
import { ExpenseTranslations } from './translations/index.js';
import { ExpenseFlowStepTranslations } from './translations/flow-steps.js';
import { ExpenseReportViews, ExpenseRequestLineViews, ExpenseRequestViews, ExpenseStandardViews, ExpenseViews } from './views/index.js';

/**
 * This package's hooks, for the artifact-wide sweeps (`allHooks` in
 * `objectstack.composition.ts`) — see `serviceHooks` in
 * `src/service/index.ts` for the arrangement. Every one attaches to this
 * module's own object (ADR-0130 R4).
 */
export const expenseHooks = [expenseHook, expenseReportHook, expenseRequestHook, expenseRequestLineHook].flat();

/**
 * This package's flows: the approval of an expense report with no project
 * and of a travel request with no project (hotcrm#2578), with the travel
 * request's insert twin. A report or a request on a project goes to its
 * Project Manager through Project Delivery's flows (`src/psa/flows/`,
 * hotcrm#2575); each flow here starts only when the record names no project.
 */
export const expenseFlows = [
  ExpenseReportApprovalFlow,
  ExpenseRequestApprovalFlow, ExpenseRequestApprovalOnCreateFlow,
];

/** This package's actions — see {@link expenseHooks}. */
export const expenseActions = [
  SubmitForReimbursementAction, SubmitTripForReimbursementAction, SubmitExpenseReportAction, ReopenExpenseReportAction, MarkExpenseReportPaidAction,
  // The travel request's Submit, Cancel Trip and Close (hotcrm#2578).
  SubmitExpenseRequestAction, CancelExpenseRequestAction, CloseExpenseRequestAction,
];

/** This package's sharing rules — see {@link expenseHooks}. */
/** The expense module's skills (hotcrm#2617, F4b); `objectstack.composition.ts` adds them to `allSkills`. */
export const expenseSkills = [ExpenseFilingSkill, ExpenseCheckSkill];

export const expenseSharingRules = [
  ExpenseApproverEditSharingRule, ExpenseReportApproverEditSharingRule, ExpenseRequestApproverEditSharingRule,
];

/**
 * What the composition hands this package: its seed families, cut out of the
 * artifact's ordered union. It ships none today (an expense names a person,
 * and a seed cannot name a user), so it is handed an empty list.
 */
export type HotCrmExpenseCollections = Pick<ObjectStackDefinitionInput, 'data'>;

/**
 * `app.objectstack.hotcrm.expense` — the EXPENSE module (「费用报销」) of this
 * artifact (REQ-0011, `docs/architecture/expense-module-plan.md`,
 * hotcrm#2556).
 *
 * The maintainer ruled reimbursement its own package on 2026-11-16 (「报销
 * 应该是一个单独的软件包吧，很多系统还是单独的产品呢」, and the adopted card
 * option 「单独的报销包」): every employee records expenses, not only project
 * staff. A `type: 'module'` package shipped inside the one HotCRM artifact,
 * as `src/o2c/` and `src/psa/` are, with its own app, and switched on or off
 * per tenant through the platform's package disable (`module-split-plan.md`
 * item 15).
 *
 * It owns `crm_expense`, which moved here from Project Delivery under the
 * same name (item 16: one `crm` namespace, so no table rename),
 * `crm_expense_report`, on which expenses are sent, approved and paid back
 * (hotcrm#2559), `crm_expense_request`, the travel request (hotcrm#2578), and
 * `crm_expense_standard`, the company's spending standards, which finance keeps
 * and people and assistants read; nothing in the product compares an expense
 * with one (hotcrm#2616).
 * Project Delivery depends on this package — the one add-on → add-on edge
 * item 18 allows — and contributes the Project field on all three (the
 * travel request's at hotcrm#2581), the project cost summaries, and the
 * approval of an expense report or a travel request on a project
 * (`src/psa/flows/`, moved there by hotcrm#2575). This package depends on
 * the app package only, and sends no notice of its own.
 *
 * Packaged exactly as `src/service/index.ts` is; that file carries the
 * reasoning for `namespace`, `dependencies`, the absent `i18n` and the
 * artifact's version.
 */
export const createHotCrmExpenseStack = (
  collections: HotCrmExpenseCollections = {},
): ObjectStackDefinition => defineStack({
  manifest: {
    id: 'app.objectstack.hotcrm.expense',
    name: 'HotCRM Expenses',
    // The app package's namespace, deliberately (ADR-0130 D1).
    namespace: 'crm',
    // The ARTIFACT's version (ADR-0130 D6) — `test/docs-declared-versions.test.ts`
    // holds it, and the range below, to the app package's.
    version: '6.7.0',
    type: 'module',
    description: "HotCRM expense module — expenses with their receipts, travel requests, the reports that send expenses to be approved, their payment back, and the company's expense standards.",
    engines: { protocol: '^19.0.0-next.2' },
    // The App package this module extends, and nothing else.
    dependencies: { 'app.objectstack.hotcrm': '^6.7.0' },

    /**
     * Project staff keep My Expenses and Reports to Approve, and their own
     * travel requests (hotcrm#2581), inside the Project Delivery app (rule
     * R2): the app's own navigation may not name this package's objects (R3),
     * so this module contributes them into its *Time and Expenses* group.
     * With Project Delivery disabled the target app is gone and the entries
     * with it.
     */
    navigationContributions: [
      {
        app: 'crm_psa',
        group: 'group_time_expenses',
        priority: 50,
        items: [
          { id: 'nav_my_expenses', type: 'object', objectName: 'crm_expense', viewName: 'my_expenses', label: 'My Expenses', icon: 'receipt' },
          { id: 'nav_expense_reports_to_approve', type: 'object', objectName: 'crm_expense_report', viewName: 'expense_reports_to_approve', label: 'Reports to Approve', icon: 'clipboard-check' },
          { id: 'nav_my_travel_requests', type: 'object', objectName: 'crm_expense_request', viewName: 'my_travel_requests', label: 'My Travel Requests', icon: 'plane' },
        ],
      },
    ],
  },

  // What THIS package's metadata needs (see `requires` in
  // `src/service/index.ts`): `automation` and `triggers` for the record-change
  // flows, `approvals` for their approval nodes, `sharing` for the rule.
  requires: ['automation', 'triggers', 'approvals', 'sharing'],

  // Everyone's expenses app; see the app's own note.
  apps: [ExpenseApp],
  objects: [Expense, ExpenseReport, ExpenseRequest, ExpenseRequestLine, ExpenseStandard],
  hooks: expenseHooks,
  views: [ExpenseViews, ExpenseReportViews, ExpenseRequestViews, ExpenseRequestLineViews, ExpenseStandardViews],
  actions: expenseActions,
  sharingRules: expenseSharingRules,
  flows: expenseFlows,
  // Its manual, over `src/expense/docs/`. See the book's own note.
  books: [CrmExpenseManual],
  // The assistant's two skills (hotcrm#2617).
  skills: expenseSkills,
  data: collections.data,
  translations: [ExpenseTranslations, ExpenseFlowStepTranslations],
});

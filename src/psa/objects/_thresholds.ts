// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Project Delivery's cost-control lines, authored ONCE (#2316 phase 1b).
 *
 * Each has more than one consumer: a flow's entry or tier gate, the hook that
 * keeps `budget_status`, the user docs under `content/docs/(product)/projects/` and the
 * tests. Every flow and the hook interpolate the constant; a hook body cannot
 * import (it runs body-only), so `project.hook.ts` repeats the two budget
 * lines and `test/psa-approvals.test.ts` holds its copy equal to these.
 *
 * Every line cuts at `>=`: a project at exactly 80 % of its budget is in
 * warning, and an expense of exactly the review amount goes to finance.
 */

/** Budget Used % at which a project's budget is in warning. */
export const BUDGET_WARNING_PERCENT = 80;

/** Budget Used % at which a project's budget is exceeded. */
export const BUDGET_EXCEEDED_PERCENT = 100;

/**
 * Approved Budget at which a project's initiation also needs a finance
 * controller's sign-off, after the project director's. The same line the app
 * draws around a large deal (`LARGE_DEAL_AMOUNT`, $100,000), kept as its own
 * constant because the two may part.
 */
export const PROJECT_FINANCE_REVIEW_BUDGET = 100_000;

/**
 * Expense amount at which an expense also needs a finance controller's
 * sign-off, after the project manager's. Authored in the app package since
 * hotcrm#2556, because the expense module reads it too; re-exported here so
 * this package's flows and tests keep one import.
 */
export { EXPENSE_FINANCE_REVIEW_AMOUNT } from '../../sales/objects/_thresholds';

/**
 * How far a budget top-up may raise the baseline before a finance controller
 * signs it off too, after the project director or PMO (#2547): a new version
 * whose total is this percentage or more above the baseline's total. A top-up
 * of exactly 10 % goes to finance.
 */
export const BUDGET_TOP_UP_FINANCE_REVIEW_PERCENT = 10;

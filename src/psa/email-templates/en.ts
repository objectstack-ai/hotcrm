// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from '../../sales/email-templates/_bundle';

/** English (en-US) — Project Delivery's notification templates (`project_budget_alert`). */
export const en: EmailTemplatePack = {
  'crm.project_budget_warning': {
    label: 'Project Budget Warning',
    subject: 'Budget warning: {{name}}',
    bodyHtml: '<p>Project {{name}} has spent 80 % or more of its Approved Budget. Check its Budget Remaining. If no more time or expenses should be submitted, tick Lock Time and Expenses on the project.</p>',
  },
  'crm.project_budget_exceeded': {
    label: 'Project Budget Exceeded',
    subject: 'Budget exceeded: {{name}}',
    bodyHtml: '<p>Project {{name}} has spent its whole Approved Budget. To stop further time and expenses being submitted, tick Lock Time and Expenses on the project, then agree a new budget.</p>',
  },
  // `expense_project_approval` (hotcrm#2556): an expense submitted on a project
  // that takes none goes back to Draft, and its spender is told why.
  'crm.expense_project_over': {
    label: 'Expense on a Closed Project',
    subject: 'Expense turned back: {{name}}',
    bodyHtml: '<p>Your expense {{name}} was submitted on {{project}}, which is Closed or Cancelled and takes no expenses. It is back in Draft: move it to an open project and submit it there.</p>',
  },
  'crm.expense_project_locked': {
    label: 'Expense on a Locked Project',
    subject: 'Expense turned back: {{name}}',
    bodyHtml: '<p>Your expense {{name}} was submitted on {{project}}, which is locked for time and expenses. It is back in Draft: submit it again once the project manager unticks Lock Time and Expenses.</p>',
  },
};

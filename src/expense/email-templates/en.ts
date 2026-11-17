// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from '../../sales/email-templates/_bundle';

/** English (en-US) — the expense module's notification templates (`expense_project_approval`). */
export const en: EmailTemplatePack = {
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

// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from '../../sales/email-templates/_bundle';

/** English (en-US) — the expense module's notification templates (`expense_report_project_approval`). */
export const en: EmailTemplatePack = {
  'crm.expense_report_project_over': {
    label: 'Expense Report on a Closed Project',
    subject: 'Expense report turned back: {{name}}',
    bodyHtml: '<p>Your expense report {{name}} was submitted on {{project}}, which is Closed or Cancelled and takes no expenses. It is back in Draft: delete the report, move its expenses to an open project, and submit them again.</p>',
  },
  'crm.expense_report_project_locked': {
    label: 'Expense Report on a Locked Project',
    subject: 'Expense report turned back: {{name}}',
    bodyHtml: '<p>Your expense report {{name}} was submitted on {{project}}, which is locked for time and expenses. It is back in Draft: submit it again once the project manager unticks Lock Time and Expenses.</p>',
  },
};

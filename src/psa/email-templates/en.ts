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
};

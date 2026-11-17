// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineBook } from '@objectstack/spec';

/**
 * The Expenses Manual (hotcrm#2556) — the module's own pages, from
 * `src/expense/docs/`. Built as the Order to Cash Manual is: a book of this
 * package, opened from the Expenses app's *Help*, so the book, its entry and
 * its pages leave together when a tenant disables the module.
 */
export const CrmExpenseManual = defineBook({
  name: 'crm_expense_manual',
  label: 'HotCRM Expenses Manual',
  description: 'Recording an expense with its receipt, asking before a trip, sending expenses on a report, who approves them, their payment back, and what reaches a project.',
  icon: 'receipt',
  order: 7,
  groups: [
    { key: 'expense', label: 'Expenses', order: 1, include: 'crm_expense_*' },
  ],
});

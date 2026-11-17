// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The expense module's option lists (hotcrm#2556). They moved here from
 * Project Delivery with `crm_expense`, values unchanged, so every stored row
 * reads the same after the move.
 */

/** An expense's own lifecycle: written, sent, decided. */
export const EXPENSE_STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft', color: '#94A3B8', kind: 'open' as const },
  { label: 'Submitted', value: 'submitted', color: '#F59E0B', kind: 'open' as const },
  { label: 'Approved', value: 'approved', color: '#16A34A', kind: 'won' as const },
  { label: 'Rejected', value: 'rejected', color: '#DC2626', kind: 'lost' as const },
];

export const EXPENSE_CATEGORY_OPTIONS = [
  { label: 'Travel', value: 'travel' },
  { label: 'Lodging', value: 'lodging' },
  { label: 'Meals', value: 'meals' },
  { label: 'Equipment', value: 'equipment' },
  { label: 'Other', value: 'other' },
];

/**
 * Who paid (REQ-0011): the employee, who is owed it back, or the company, as
 * a ticket bought on the company's account. Either way an approved expense on
 * a project counts toward the project's cost.
 */
export const EXPENSE_PAID_BY_OPTIONS = [
  { label: 'Employee', value: 'employee', default: true },
  { label: 'Company', value: 'company' },
];

/**
 * Where the record came from (REQ-0011): typed by a person, written by an
 * agent through the API, or loaded by an import. The product reads it; it
 * never decides anything on it.
 */
export const EXPENSE_SOURCE_OPTIONS = [
  { label: 'Manual', value: 'manual', default: true },
  { label: 'Agent', value: 'agent' },
  { label: 'Import', value: 'import' },
];

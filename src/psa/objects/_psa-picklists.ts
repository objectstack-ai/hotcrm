// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Project Delivery option lists — each authored ONCE and spread into its field
 * (`docs/architecture/psa-module-plan.md`, *Picklists*), so a customer overlay
 * extends one list and every translation pack keys one set of values.
 *
 * Status lists carry no `default`: the field that spreads them names its own
 * default, so a list reused elsewhere does not drag one along.
 */

export const PROJECT_KIND_OPTIONS = [
  { label: 'Presales', value: 'presales', color: '#7C3AED' },
  { label: 'Delivery', value: 'delivery', color: '#0D9488' },
  { label: 'Internal', value: 'internal', color: '#64748B' },
];

export const PROJECT_BILLING_TYPE_OPTIONS = [
  { label: 'Fixed Fee', value: 'fixed_fee' },
  { label: 'Time and Materials', value: 'time_and_materials' },
  { label: 'Retainer', value: 'retainer' },
  { label: 'Non-billable', value: 'non_billable' },
];

export const PROJECT_STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft', color: '#94A3B8', kind: 'open' as const },
  { label: 'In Approval', value: 'in_approval', color: '#F59E0B', kind: 'open' as const },
  { label: 'Approved', value: 'approved', color: '#2563EB', kind: 'open' as const },
  { label: 'Rejected', value: 'rejected', color: '#DC2626', kind: 'lost' as const },
  { label: 'Active', value: 'active', color: '#16A34A', kind: 'open' as const },
  { label: 'On Hold', value: 'on_hold', color: '#EA580C', kind: 'open' as const },
  { label: 'Completed', value: 'completed', color: '#0D9488', kind: 'won' as const },
  { label: 'Closed', value: 'closed', color: '#475569', kind: 'won' as const },
  { label: 'Cancelled', value: 'cancelled', color: '#666666', kind: 'lost' as const },
];

/**
 * How much of its Approved Budget a project has spent, kept by
 * `project.hook.ts` at the lines in `_thresholds.ts` (#2316 phase 1b).
 */
export const BUDGET_STATUS_OPTIONS = [
  { label: 'On Track', value: 'on_track', color: '#16A34A' },
  { label: 'Warning', value: 'warning', color: '#F59E0B' },
  { label: 'Exceeded', value: 'exceeded', color: '#DC2626' },
];

export const PROJECT_RESPONSIBILITY_OPTIONS = [
  { label: 'Project Manager', value: 'project_manager' },
  { label: 'Project Director', value: 'project_director' },
  { label: 'Account Manager', value: 'account_manager' },
  { label: 'Architect', value: 'architect' },
  { label: 'Consultant', value: 'consultant' },
  { label: 'Quality Assurance', value: 'quality_assurance' },
  { label: 'Finance Partner', value: 'finance_partner' },
  { label: 'Subcontractor', value: 'subcontractor' },
];

export const RATE_CARD_SENIORITY_OPTIONS = [
  { label: 'Junior', value: 'junior' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Senior', value: 'senior' },
  { label: 'Lead', value: 'lead' },
  { label: 'Principal', value: 'principal' },
];

export const RATE_CARD_UNIT_OPTIONS = [
  { label: 'Per Hour', value: 'hour' },
  { label: 'Per Day', value: 'day' },
];

/** A timesheet's and an expense's own lifecycle: written, sent, decided. */
export const SUBMISSION_STATUS_OPTIONS = [
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
 * Hours in a working day, for a rate card priced per day: an entry records
 * hours, so a day rate is costed at rate ÷ this. Hook bodies cannot read a
 * module constant (they run body-only), so `time_entry.hook.ts` repeats the
 * number inside its handler and `test/psa-objects.test.ts` holds the two equal.
 */
export const HOURS_PER_DAY = 8;

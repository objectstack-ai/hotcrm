// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { Field } from '@objectstack/spec/data';

/**
 * The expense's Project field (hotcrm#2556). `crm_expense` is the expense
 * module's since that card, and knows nothing of projects; this module adds
 * the lookup through `objectExtensions` (ADR-0130 D5), so it comes and goes
 * with Project Delivery: disabled, the field leaves the object and the
 * records, and an expense is recorded and approved without it; enabled again,
 * the stored values return (measured on 18.5.0 before filing).
 *
 * Optional, where it was required while the object was this module's: an
 * expense with no project is an employee's ordinary claim, approved by their
 * manager in the expense module. The column keeps its name, so every stored
 * row keeps its project across the upgrade.
 *
 * A Closed or Cancelled project is not offered in the picker. That replaces
 * the refusal the expense's own hook used to make, which may not move here
 * (ADR-0130 R4: no hook on another package's object). The picker is the
 * form's guard only; a write through the API is caught when the expense is
 * submitted, where `expense_project_approval` turns an expense on an over or
 * locked project back to Draft
 * (`src/expense/flows/expense-project-approval.flow.ts`, in the expense module
 * for the platform gap that file names).
 */
export const ExpenseProjectExtensions = [
  {
    extend: 'crm_expense',
    fields: {
      crm_project: Field.lookup('crm_project', {
        label: 'Project',
        group: 'basic',
        relatedListColumns: ['name', 'owner_id', 'expense_date', 'category', 'amount', 'status'],
        lookupFilters: [{ field: 'status', operator: 'notIn', value: ['closed', 'cancelled'] }],
      }),
    },
  },
];

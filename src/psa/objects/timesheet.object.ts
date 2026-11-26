// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { P } from '@objectstack/spec';
import { SUBMISSION_STATUS_OPTIONS } from './_psa-picklists';

/**
 * Timesheet — one person's hours on one project for one period, submitted
 * and approved as a unit (hotcrm#2316, plan *crm_timesheet*).
 *
 * The person is the timesheet's owner: whoever writes it owns it, and it is
 * `private` to them; the approver reaches it through the approval request.
 * Weekly or monthly is the customer's choice of period, up to 31 days; one
 * timesheet per person, project and period start (`timesheet.hook.ts`).
 *
 * Only an APPROVED timesheet counts toward the project's cost and its amount
 * to bill (the project's summaries filter on `status`).
 */
export const Timesheet = ObjectSchema.create({
  name: 'crm_timesheet',
  label: 'Timesheet',
  pluralLabel: 'Timesheets',
  icon: 'clock',
  description: 'One person\'s hours on one project for one period, approved as a unit',

  sharingModel: 'private',
  nameField: 'name',
  highlightFields: ['crm_project', 'period_start', 'status', 'total_hours'],

  fieldGroups: [
    { key: 'basic',  label: 'Timesheet', icon: 'clock' },
    { key: 'totals', label: 'Totals',    icon: 'sigma' },
  ],

  fields: {
    // The person whose hours these are — canonical owner note in
    // `src/sales/objects/account.object.ts`.
    owner_id: Field.lookup('sys_user', {
      label: 'Person',
      group: 'basic',
      system: true,
      readonly: false,
      trackHistory: true,
    }),

    // Filled on save from the project and the period when left empty
    // (`timesheet.hook.ts`).
    name: Field.text({
      label: 'Timesheet',
      group: 'basic',
      maxLength: 200,
    }),

    crm_project: Field.lookup('crm_project', {
      label: 'Project',
      group: 'basic',
      required: true,
      relatedListColumns: ['name', 'owner_id', 'period_start', 'period_end', 'status', 'total_hours', 'total_cost'],
    }),

    period_start: Field.date({ label: 'Period Start', group: 'basic', required: true }),
    period_end: Field.date({ label: 'Period End', group: 'basic', required: true }),

    status: Field.select({
      label: 'Status',
      group: 'basic',
      required: true,
      trackHistory: true,
      options: SUBMISSION_STATUS_OPTIONS.map((o) => (o.value === 'draft' ? { ...o, default: true } : o)),
    }),

    // Stamped from the project's Project Manager when the timesheet is
    // created (`timesheet.hook.ts`).
    approver: Field.lookup('sys_user', {
      label: 'Approver',
      group: 'basic',
      readonly: true,
    }),

    total_hours: Field.summary({
      label: 'Total Hours',
      group: 'totals',
      scale: 2,
      readonly: true,
      summaryOperations: { object: 'crm_time_entry', field: 'hours', function: 'sum', relationshipField: 'crm_timesheet' },
    }),

    billable_hours: Field.summary({
      label: 'Billable Hours',
      group: 'totals',
      scale: 2,
      readonly: true,
      summaryOperations: {
        object: 'crm_time_entry',
        field: 'hours',
        function: 'sum',
        relationshipField: 'crm_timesheet',
        filter: { is_billable: true },
      },
    }),

    total_cost: Field.summary({
      label: 'Total Cost',
      group: 'totals',
      scale: 2,
      readonly: true,
      summaryOperations: { object: 'crm_time_entry', field: 'cost_amount', function: 'sum', relationshipField: 'crm_timesheet' },
    }),

    total_bill_amount: Field.summary({
      label: 'Amount to Bill',
      group: 'totals',
      scale: 2,
      readonly: true,
      summaryOperations: {
        object: 'crm_time_entry',
        field: 'bill_amount',
        function: 'sum',
        relationshipField: 'crm_timesheet',
        filter: { is_billable: true },
      },
    }),

    notes: Field.textarea({ label: 'Notes', group: 'basic' }),
  },

  validations: [
    {
      name: 'timesheet_period',
      type: 'script',
      severity: 'error',
      message: 'Period End must be on or after Period Start, and a timesheet covers at most 31 days.',
      condition: P`has(record.period_start) && record.period_start != null && has(record.period_end) && record.period_end != null && (record.period_end < record.period_start || daysBetween(record.period_start, record.period_end) > 30)`,
    },
    {
      name: 'timesheet_status_progression',
      type: 'state_machine',
      severity: 'error',
      message: 'This status change is not allowed. A timesheet moves Draft → Submitted → Approved or Rejected; a rejected timesheet goes back to Draft to be corrected.',
      field: 'status',
      // Protocol 19 asks for an entry contract (`state-machine-no-initial-states`). Every state is listed: a
      // record (an import or an integration included) may still be created in any of them, as on 18.6.
      // Narrowing this to the first state is a product decision of its own, not part of the upgrade.
      initialStates: ['draft', 'submitted', 'approved', 'rejected'],
      transitions: {
        draft: ['submitted'],
        submitted: ['approved', 'rejected', 'draft'],
        approved: [],
        rejected: ['draft'],
      },
    },
  ],

  indexes: [
    { fields: ['owner_id'] },
    { fields: ['crm_project'] },
    { fields: ['status'] },
    { fields: ['period_start'] },
  ],

  enable: {
    trackHistory: true,
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },
});

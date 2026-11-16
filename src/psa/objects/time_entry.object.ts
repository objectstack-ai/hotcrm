// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';

/**
 * Time Entry — the hours of one day inside a timesheet, with the cost and the
 * amount to bill they stand for (hotcrm#2316, plan *crm_time_entry*).
 *
 * The rates are COPIED from the rate card of the person's staffing on the
 * project when the entry is created, and stored (`time_entry.hook.ts`): a rate
 * card changed next quarter never rewrites last quarter's cost. Changing the
 * hours later recomputes the amounts at the stored rates.
 */
export const TimeEntry = ObjectSchema.create({
  name: 'crm_time_entry',
  label: 'Time Entry',
  pluralLabel: 'Time Entries',
  icon: 'timer',
  description: 'A day\'s hours in a timesheet, and the cost they stand for',

  sharingModel: 'controlled_by_parent',
  nameField: 'entry_date',
  highlightFields: ['hours', 'is_billable', 'crm_project_task', 'cost_amount'],

  fieldGroups: [
    { key: 'basic', label: 'Time Entry', icon: 'timer' },
    { key: 'rates', label: 'Cost and Billing', icon: 'dollar-sign', collapse: 'collapsed' },
  ],

  fields: {
    crm_timesheet: Field.masterDetail('crm_timesheet', {
      label: 'Timesheet',
      group: 'basic',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'cascade',
      relatedListColumns: ['entry_date', 'hours', 'is_billable', 'notes', 'cost_amount'],
    }),

    entry_date: Field.date({
      label: 'Date',
      group: 'basic',
      required: true,
      description: 'A day inside the timesheet\'s period.',
    }),

    hours: Field.number({
      label: 'Hours',
      group: 'basic',
      required: true,
      scale: 2,
      min: 0.25,
      max: 24,
    }),

    is_billable: Field.boolean({
      label: 'Billable',
      group: 'basic',
      defaultValue: true,
    }),

    // Optional (hotcrm#2545): which task of the timesheet's project the hours
    // went to. The task's Actual Hours sums them. `time_entry.hook.ts`
    // refuses a task from another project.
    crm_project_task: Field.lookup('crm_project_task', {
      label: 'Task',
      group: 'basic',
      description: 'The task of this project the hours were spent on.',
      relatedListColumns: ['entry_date', 'hours', 'is_billable', 'notes'],
    }),

    notes: Field.textarea({ label: 'Notes', group: 'basic' }),

    cost_rate: Field.currency({
      label: 'Cost Rate (per hour)',
      group: 'rates',
      readonly: true,
    }),

    cost_amount: Field.currency({
      label: 'Cost',
      group: 'rates',
      readonly: true,
    }),

    bill_rate: Field.currency({
      label: 'Bill Rate (per hour)',
      group: 'rates',
      readonly: true,
    }),

    bill_amount: Field.currency({
      label: 'Amount to Bill',
      group: 'rates',
      readonly: true,
    }),
  },

  indexes: [
    { fields: ['crm_timesheet'] },
    { fields: ['entry_date'] },
    { fields: ['crm_project_task'] },
  ],

  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },
});

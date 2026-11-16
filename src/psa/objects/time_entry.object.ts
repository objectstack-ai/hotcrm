// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';

/**
 * Time Entry — the hours of one day inside a timesheet, with the cost and the
 * amount to bill they stand for (hotcrm#2316, plan *crm_time_entry*).
 *
 * ## Entering a week (hotcrm#2546)
 *
 * A line names its project and its date; the timesheet is found or created
 * for it (`time_entry.hook.ts`): the person's timesheet on that project whose
 * period holds the date, else a new draft for the week (Monday to Sunday). So
 * a consultant on three projects enters the week line by line in My Week and
 * never builds a timesheet by hand, while each project's hours still go to
 * its own timesheet and its own project manager for approval. Changing a
 * line's project or date moves it to the matching timesheet.
 *
 * The lines are one row per person, project, task and day: the shape a
 * row-by-weekday grid reads, so such a grid can replace the My Week list
 * later with no change here.
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
  highlightFields: ['crm_project', 'hours', 'is_billable', 'crm_project_task'],

  fieldGroups: [
    { key: 'basic', label: 'Time Entry', icon: 'timer' },
    { key: 'rates', label: 'Cost and Billing', icon: 'dollar-sign', collapse: 'collapsed' },
  ],

  fields: {
    // The project the line is for (hotcrm#2546). Picked on a new line, it
    // chooses the timesheet; on a line written into a timesheet it is copied
    // from it. Always the timesheet's project (`time_entry.hook.ts`).
    crm_project: Field.lookup('crm_project', {
      label: 'Project',
      group: 'basic',
      description: 'The project the hours are for. On a new line, the timesheet for this project and week is found or created for you.',
      relatedListColumns: ['entry_date', 'crm_project_task', 'hours', 'is_billable', 'notes'],
    }),

    entry_date: Field.date({
      label: 'Date',
      group: 'basic',
      required: true,
      description: 'The day the hours were worked.',
    }),

    // The optional master (`required: false`, a shape the spec's
    // controlled_by_parent resolution keeps): a line entered from My Week names
    // its project and date and leaves the timesheet to the hook, which always
    // fills it, so the column stays NOT NULL. Left implicit, ObjectSchema
    // forces `required: true` and the console form would demand a timesheet.
    crm_timesheet: Field.masterDetail('crm_timesheet', {
      label: 'Timesheet',
      group: 'basic',
      required: false,
      storage: { notNull: true },
      deleteBehavior: 'cascade',
      description: 'Filled in for you from the project and the date. Pick one only to book onto a timesheet with another period.',
      relatedListColumns: ['entry_date', 'crm_project_task', 'hours', 'is_billable', 'notes', 'cost_amount'],
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
      dependsOn: ['crm_project'],
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
    { fields: ['crm_project'] },
    { fields: ['owner_id', 'entry_date'] },
    { fields: ['entry_date'] },
    { fields: ['crm_project_task'] },
  ],

  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },
});

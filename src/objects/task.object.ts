// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { P } from '@objectstack/spec';
import { TASK_TYPE_OPTIONS } from './_picklists';

export const Task = ObjectSchema.create({
  name: 'crm_task',
  label: 'Task',
  pluralLabel: 'Tasks',
  icon: 'check-square',
  description: 'Activities and to-do items',

  // ADR-0090 D1/D7: OWD is an authored decision. Personal activity records.
  sharingModel: 'private',

  // Every other business object with a detail page groups its fields; task was
  // one of the two that did not, so its detail page fell back to one flat grid
  // where the five polymorphic `related_to_*` lookups and the recurrence
  // machinery sat inline with the subject. The keys mirror the sections the
  // task form already uses (Task / Related Records / Recurrence & Effort) so
  // the two surfaces agree.
  fieldGroups: [
    { key: 'basic',      label: 'Task Information', icon: 'info' },
    { key: 'scheduling', label: 'Scheduling',       icon: 'calendar' },
    // No 'assignment' group: the assignee (`owner_id`) was its only member, and
    // the synthesized detail page hoists it into the highlight strip — so the
    // group rendered on forms and never on detail pages
    // (`field-group-shadowed`). It lives in `basic` alongside
    // subject/status/priority instead.
    { key: 'related',    label: 'Related Records',  icon: 'link' },
    { key: 'recurrence', label: 'Recurrence',       icon: 'refresh-ccw', defaultExpanded: false },
    { key: 'effort',     label: 'Progress & Effort', icon: 'activity',   defaultExpanded: false },
    { key: 'system',     label: 'System',           icon: 'database',    defaultExpanded: false },
  ],

  fields: {
    // Platform ownership anchor — canonical note in `account.object.ts` (#548).
    owner_id: Field.lookup('sys_user', {
      label: 'Assigned To',
      group: 'basic',
      system: true,
      readonly: false,
      trackHistory: true,
    }),

    // Task Information
    subject: Field.text({
      group: 'basic',
      label: 'Subject',
      required: true,
      storage: { notNull: true },
      searchable: true,
      maxLength: 255,
    }),
    
    description: Field.markdown({
      group: 'basic',
      label: 'Description',
    }),
    
    // Task Management
    status: Field.select({
      group: 'basic',
      label: 'Status',
      required: true,
      storage: { notNull: true },
      trackHistory: true,
      // Field-level default, not just the option flag: the option `default`
      // only preselects in some form surfaces, so a quick-create modal opened
      // from a related list left this required field blank and the rep had to
      // pick "Not Started" by hand every time.
      defaultValue: 'not_started',
      options: [
        { label: 'Not Started', value: 'not_started', color: '#808080', default: true },
        { label: 'In Progress', value: 'in_progress', color: '#FFA500' },
        { label: 'Waiting', value: 'waiting', color: '#FFD700' },
        { label: 'Completed', value: 'completed', color: '#00AA00' },
        { label: 'Deferred', value: 'deferred', color: '#999999' },
      ]
    }),

    priority: Field.select({
      group: 'basic',
      label: 'Priority',
      required: true,
      storage: { notNull: true },
      trackHistory: true,
      // `normal` is the default rather than `low`: a rep filing a to-do has
      // made no priority judgement, and defaulting everything to Low made the
      // field meaningless (nothing ever sorted above the noise).
      defaultValue: 'normal',
      options: [
        { label: 'Low', value: 'low', color: '#4169E1' },
        { label: 'Normal', value: 'normal', color: '#00AA00', default: true },
        { label: 'High', value: 'high', color: '#FFA500' },
        { label: 'Urgent', value: 'urgent', color: '#FF0000' },
      ]
    }),

    // Sortable ordinal for `priority` — see crm_case.priority_rank. Sorting on
    // the select itself compares raw strings (normal > low > high > urgent),
    // which pushes urgent work to the bottom of the to-do queue.
    //
    // `0` is the UNRANKED sentinel, identical to crm_case.priority_rank. ⛔ It
    // must stay identical on both: a differing sentinel orders the same unknown
    // priority differently on the two objects, and `2` here would make an
    // unranked task indistinguishable from a genuine `normal`.
    priority_rank: Field.number({
      label: 'Priority Rank',
      readonly: true,
      defaultValue: 0,
    }),

    type: Field.select({
      group: 'basic',
      label: 'Task Type',
      // Canonical set (#490) — the schedule_followup screen renders the same
      // list; see _picklists.ts.
      options: [...TASK_TYPE_OPTIONS],
    }),
    
    // Dates
    due_date: Field.date({
      group: 'scheduling',
      label: 'Due Date',
    }),
    
    reminder_date: Field.datetime({
      group: 'scheduling',
      label: 'Reminder Date/Time',
    }),
    
    completed_date: Field.datetime({
      group: 'scheduling',
      label: 'Completed Date',
      readonly: true,
    }),
    
    // Related To (Polymorphic relationship - can link to multiple object types)
    related_to_type: Field.select({
      group: 'related',
      label: 'Related To Type',
      options: [
        { label: 'Account', value: 'crm_account' },
        { label: 'Contact', value: 'crm_contact' },
        { label: 'Opportunity', value: 'crm_opportunity' },
        { label: 'Lead', value: 'crm_lead' },
        { label: 'Case', value: 'crm_case' },
      ]
    }),
    
    related_to_account: Field.lookup('crm_account', {
      group: 'related',
      label: 'Related Account',
    }),
    
    related_to_contact: Field.lookup('crm_contact', {
      group: 'related',
      label: 'Related Contact',
    }),
    
    related_to_opportunity: Field.lookup('crm_opportunity', {
      group: 'related',
      label: 'Related Opportunity',
    }),
    
    related_to_lead: Field.lookup('crm_lead', {
      group: 'related',
      label: 'Related Lead',
    }),
    
    related_to_case: Field.lookup('crm_case', {
      group: 'related',
      label: 'Related Case',
    }),
    
    // Recurrence (for recurring tasks)
    is_recurring: Field.boolean({
      group: 'recurrence',
      label: 'Recurring Task',
      defaultValue: false,
    }),
    
    recurrence_type: Field.select({
      group: 'recurrence',
      label: 'Recurrence Type',
      options: [
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Monthly', value: 'monthly' },
        { label: 'Yearly', value: 'yearly' },
      ]
    }),
    
    recurrence_interval: Field.number({
      group: 'recurrence',
      label: 'Recurrence Interval',
      defaultValue: 1,
      min: 1,
    }),
    
    recurrence_end_date: Field.date({
      group: 'recurrence',
      label: 'Recurrence End Date',
    }),
    
    // Flags
    is_completed: Field.boolean({
      group: 'system',
      label: 'Is Completed',
      defaultValue: false,
      readonly: true,
    }),
    
    is_overdue: Field.boolean({
      group: 'system',
      label: 'Is Overdue',
      defaultValue: false,
      readonly: true,
    }),

    // Set by the `task_due_reminder` schedule flow once a reminder has fired
    // (the sweep de-dups on `reminder_date`, which it clears; this flag is the
    // audit trail). NOT readonly: 16.x drops flow writes to readonly fields
    // (#2948) — same reason crm_case.is_sla_violated/escalated_date are open.
    reminder_sent: Field.boolean({
      group: 'system',
      label: 'Reminder Sent',
      defaultValue: false,
    }),

    // Progress
    progress_percent: Field.percent({
      group: 'effort',
      label: 'Progress (%)',
      min: 0,
      max: 100,
      defaultValue: 0,
    }),
    
    // No time tracking. `estimated_hours` / `actual_hours` were declared and
    // inert: no rollup summed them onto a case or an opportunity, no variance
    // report compared them, and nothing warned when actual overran estimate.
    // Effort on a task is `progress_percent`, which the task views do read.
  },
  
  // API surface. History → Field.trackHistory (ADR-0052).
  enable: {
    apiEnabled: true,
  },
  
  // Database indexes for performance
  indexes: [
    { fields: ['status'] },
    { fields: ['priority'] },
    { fields: ['owner_id'] },
    { fields: ['due_date'] },
  ],
  
  // ADR-0079: render-only `titleFormat` retired in favor of `nameField`,
  // which names the real field holding the record title (here: `subject`).
  nameField: 'subject',
  highlightFields: ['subject', 'status', 'priority', 'due_date', 'owner_id'],
  
  // Removed: list_views and form_views belong in UI configuration, not object definition
  
  // Predicates below are TOTAL: every `record.x` read is `has()`-guarded, so the
  // rule returns a verdict even when the merged record has no such key. See
  // AGENTS.md "Validation predicates must be TOTAL" and
  // test/object-validation-predicates.test.ts, which fails the build otherwise.
  validations: [
    {
      name: 'completed_date_required',
      type: 'script',
      severity: 'error',
      message: 'Completed date is required when status is Completed',
      condition: P`has(record.status) && record.status == "completed" && (!has(record.completed_date) || isBlank(record.completed_date))`,
    },
    {
      name: 'recurrence_fields_required',
      type: 'script',
      severity: 'error',
      message: 'Recurrence type is required for recurring tasks',
      condition: P`has(record.is_recurring) && record.is_recurring == true && (!has(record.recurrence_type) || isBlank(record.recurrence_type))`,
    },
    {
      name: 'related_to_required',
      type: 'script',
      severity: 'warning',
      message: 'At least one related record should be selected',
      condition: P`(!has(record.related_to_account) || isBlank(record.related_to_account)) && (!has(record.related_to_contact) || isBlank(record.related_to_contact)) && (!has(record.related_to_opportunity) || isBlank(record.related_to_opportunity)) && (!has(record.related_to_lead) || isBlank(record.related_to_lead)) && (!has(record.related_to_case) || isBlank(record.related_to_case))`,
    },
  ],
  
  // ⚠️ No `workflows[]` here, and none is possible: object `workflows[]` were
  // removed from the platform. Field updates live in this object's `*.hook.ts`;
  // scheduled status flips and notifications live in `src/flows/*.flow.ts`.
});

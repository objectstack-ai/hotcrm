// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Task Views
 *
 *   • grid     — to-do list with completion controls
 *   • kanban   — work board grouped by status
 *   • calendar — schedule by due_date
 *   • gantt    — execution plan from reminder_date → due_date
 *   • timeline — chronological worklog grouped by owner
 */
export const TaskViews = defineView({
  list: {
    type: 'grid',
    name: 'all_tasks',
    label: 'All Tasks',
    data: { provider: 'object', object: 'crm_task' },
    columns: [
      { field: 'is_completed', width: 60, align: 'center' },
      { field: 'subject', width: 280, sortable: true, link: true },
      { field: 'status', width: 130, sortable: true },
      { field: 'priority', width: 110, sortable: true },
      { field: 'due_date', width: 140, sortable: true },
      { field: 'progress_percent', width: 130, align: 'right' },
      { field: 'owner_id', width: 150 },
      { field: 'is_overdue', width: 100, align: 'center' },
    ],
    sort: [
      { field: 'is_completed', order: 'asc' },
      { field: 'due_date', order: 'asc' },
    ],
    rowColor: {
      // Task priority is low/normal/high/urgent — the previous critical/medium
      // keys were Case values, so urgent and normal rows got no color at all.
      // Colors mirror the option colors on crm_task.priority.
      field: 'priority',
      colors: { urgent: '#dc2626', high: '#f97316', normal: '#16a34a', low: '#94a3b8' },
    },
    selection: { type: 'multiple' },
    pagination: { pageSize: 50 },
    appearance: {
      showDescription: true,
      allowedVisualizations: ['grid', 'kanban', 'calendar', 'gantt', 'timeline'],
    },
    tabs: [
      { name: 'all', label: 'All', view: 'all_tasks', isDefault: true, pinned: true },
      { name: 'board', label: 'Board', icon: 'columns-3', view: 'task_board' },
      { name: 'schedule', label: 'Schedule', icon: 'calendar', view: 'task_calendar' },
      { name: 'plan', label: 'Plan', icon: 'gantt-chart', view: 'task_gantt' },
      { name: 'worklog', label: 'Worklog', icon: 'git-commit-horizontal', view: 'task_timeline' },
      { name: 'mine', label: 'My Tasks', icon: 'user', view: 'my_open_tasks' },
      { name: 'priority', label: 'Priority', icon: 'flag', view: 'todays_tasks' },
      { name: 'backlog', label: 'Backlog', icon: 'clock-alert', view: 'overdue_tasks' },
    ],
  },

  listViews: {
    /** Work board */
    task_board: {
      name: 'task_board',
      type: 'kanban',
      label: 'Task Board',
      data: { provider: 'object', object: 'crm_task' },
      columns: ['subject', 'priority', 'due_date', 'owner_id'],
      kanban: {
        groupByField: 'status',
        columns: ['subject', 'priority', 'due_date', 'progress_percent'],
      },
      filter: [{ field: 'is_completed', operator: 'equals', value: false }],
      navigation: { mode: 'drawer', width: '520px' },
    },

    /** Schedule view */
    task_calendar: {
      name: 'task_calendar',
      type: 'calendar',
      label: 'Task Schedule',
      data: { provider: 'object', object: 'crm_task' },
      columns: ['subject', 'priority', 'owner_id'],
      calendar: {
        startDateField: 'due_date',
        titleField: 'subject',
        colorField: 'priority',
      },
    },

    /** Execution plan */
    task_gantt: {
      name: 'task_gantt',
      type: 'gantt',
      label: 'Execution Plan',
      data: { provider: 'object', object: 'crm_task' },
      columns: ['subject', 'owner_id', 'progress_percent'],
      gantt: {
        startDateField: 'reminder_date',
        endDateField: 'due_date',
        titleField: 'subject',
        progressField: 'progress_percent',
      },
    },

    /** Worklog timeline */
    task_timeline: {
      name: 'task_timeline',
      type: 'timeline',
      label: 'Worklog Timeline',
      data: { provider: 'object', object: 'crm_task' },
      columns: ['subject', 'status'],
      timeline: {
        startDateField: 'reminder_date',
        endDateField: 'due_date',
        titleField: 'subject',
        groupByField: 'owner_id',
        colorField: 'status',
        scale: 'week',
      },
    },

    my_open_tasks: {
      name: 'my_open_tasks',
      type: 'grid',
      label: 'My Open Tasks',
      data: { provider: 'object', object: 'crm_task' },
      columns: ['subject', 'priority', 'due_date', 'progress_percent'],
      filter: [
        { field: 'owner_id', operator: 'equals', value: '{current_user_id}' },
        { field: 'is_completed', operator: 'equals', value: false },
      ],
      sort: [{ field: 'due_date', order: 'asc' }],
    },

    /** My open priority tasks — daily morning queue */
    todays_tasks: {
      name: 'todays_tasks',
      type: 'grid',
      label: '📅 My Priority Tasks',
      data: { provider: 'object', object: 'crm_task' },
      columns: ['subject', 'priority', 'status', 'due_date', 'related_to_type', 'owner_id'],
      // Operator-only filter — priority and status, no tokens — and the reason
      // recorded here for that has expired (#782). Two claims stood here; both
      // are wrong on the pinned 17.0.0-rc.2, in different ways.
      //
      // `{current_user_id}` DOES interpolate. `resolveFilterTokens()` was wired
      // into the ObjectQL READ path at 17.0.0-rc.0 (objectql #3582) ahead of
      // the middleware chain, covering `find` / `findOne` / `count` /
      // `aggregate` — saved-view filters included. `my_open_tasks`, the view
      // directly above, ships that exact token. Measured in #784 with two probes
      // that separate the three possible outcomes: `owner_id =
      // {current_org_id}` returned 0 rows (the filter is not being dropped)
      // while `owner_id = {current_user_id}` returned every seeded task (not a
      // literal-string compare either — the literal matches no owner at all).
      //
      // `{TODAY()}` is not a spelling of anything and never was. The vocabulary
      // is `{today}` / `{yesterday}` / `{tomorrow}` / `{now}`, the period
      // tokens, and the parameterised `{N_days_ago}` family. Nor is `{TODAY()}`
      // REJECTED, which is the part worth writing down: the placeholder grammar
      // is `/^\$?\{([a-zA-Z0-9_]+)\}$/`, parentheses fall outside it, so
      // `classifyFilterToken('{TODAY()}')` returns null — it is never treated
      // as a token, ships to the driver verbatim, and compares as text.
      // Measured on rc.2 over a four-row `crm_task` fixture (due 30d ago / 1d
      // ago / today / in 7d):
      //
      //     due_date <  '{today}'     ->  2 rows (the two past-due)
      //     due_date <= '{today}'     ->  3 rows
      //     due_date <  '{TODAY}'     ->  throws UnknownFilterTokenError
      //                                   (code FILTER_TOKEN_UNKNOWN)
      //     due_date <  '{TODAY()}'   ->  ALL 4 rows, including next week's
      //
      // That last line is the #744 lexicographic inversion ('2026-…' sorts
      // below '{'), still live for spellings the grammar cannot see. Nothing in
      // this repo can ship one: the author-time guard in
      // `test/metadata-references.test.ts` scans the broader `/\{([^{}]+)\}/`
      // and rejects any token neither path resolves.
      //
      // Correcting the comment is not a licence to change the filter. Whether
      // this view should carry a date bound at all — and whether a label
      // reading "My Priority Tasks" over a filter with no owner condition is
      // the right name — are BEHAVIOUR decisions on #770's line for the task
      // views, not this one's.
      //
      // The sort below is due_date-MAJOR, not priority-major: `priority_rank
      // desc` only breaks ties inside a single due date, so a high task due
      // tomorrow outranks an urgent one due next week. Measured on rc.2 with
      // the shipped sort over four rows — soon/urgent, soon/high, later/urgent,
      // later/high, in that order. What stood here said the sort "puts urgent
      // at top", which is what the OTHER key order would do.
      filter: [
        { field: 'status', operator: 'in', value: ['not_started', 'in_progress'] },
        { field: 'priority', operator: 'in', value: ['high', 'urgent'] },
      ],
      sort: [{ field: 'due_date', order: 'asc' }, { field: 'priority_rank', order: 'desc' }],
    },

    /** Overdue / open tasks across the team — sorted oldest-due first */
    overdue_tasks: {
      name: 'overdue_tasks',
      type: 'grid',
      // Honest label. Two independent reasons were recorded for it; one still
      // holds and one has expired (#782), so they are separated here.
      //
      // STILL TRUE — `is_overdue` is a WRITE-TIME snapshot. `task.hook.ts:68`
      // stamps it in `beforeSave` off that moment's clock (`effDue < todayStr`
      // and not completed) and nothing re-stamps it afterwards, so a task that
      // was on time when it was last saved still reads `is_overdue = false` the
      // day after its due date passes. A filter on that column would hand back
      // the wrong rows, and it would go wrong silently.
      //
      // EXPIRED — the other reason said the view layer cannot resolve
      // `due_date < {TODAY()}`, and that only `{current_user_id}` interpolates.
      // Both halves are wrong on the pinned 17.0.0-rc.2, and the file said the
      // opposite of itself: the note on `todays_tasks` above asserted that
      // `{current_user_id}` does NOT interpolate. It does. That comment carries
      // the measurements — including why `{TODAY()}` is not a spelling of
      // anything, and is not rejected either. The canonical `{today}` resolves
      // on the read path, so a strictly past-due filter IS expressible now:
      // `due_date < '{today}'` selected exactly the past-due rows out of four
      // on rc.2.
      //
      // So the honest statement is narrower than the one that stood here: this
      // view CAN be given a strictly past-due cut through `{today}`, and is not
      // given one. Adding it is a BEHAVIOUR change, not a comment correction —
      // it would drop today's due-today work out of the queue and turn an
      // "Open Tasks" backlog into a strict overdue list, which is the
      // cut-versus-ranking question already open on #770 for the task views.
      // That also retires the follow-up this comment used to end on: an hourly
      // flow re-stamping `is_overdue` was proposed as the ONLY route to a
      // truly-overdue gauge, because the filter route was believed closed.
      // There are two routes now, and choosing between them belongs to #770.
      //
      // As shipped: the open-task backlog ordered most-overdue-first (oldest
      // due date on top), which is the actionable queue a manager works.
      label: '⏰ Open Tasks · Most Overdue First',
      data: { provider: 'object', object: 'crm_task' },
      columns: ['subject', 'priority', 'status', 'due_date', 'owner_id'],
      filter: [
        { field: 'is_completed', operator: 'equals', value: false },
      ],
      sort: [{ field: 'due_date', order: 'asc' }],
    },
  },

  form: {
    type: 'simple',
    sections: [
      {
        name: 'task',
        label: 'Task',
        columns: 2,
        // `type` (call / email / meeting / demo) is what makes an activity
        // history readable and is the first thing a rep reaches for after the
        // subject — it was missing entirely. `description` captures what was
        // actually said on the call. `progress_percent` moved to the Effort
        // section: a task being filed is 0% by definition, so a percentage
        // slider on the create form is noise.
        fields: [
          { field: 'subject', required: true, colSpan: 2 },
          { field: 'type', required: false },
          { field: 'status', required: true },
          'priority',
          'due_date',
          'owner_id',
          'reminder_date',
          { field: 'description', colSpan: 2 },
        ],
      },
      {
        name: 'related_records',
        label: 'Related Records',
        collapsible: true,
        columns: 2,
        fields: [
          'related_to_account',
          'related_to_contact',
          'related_to_opportunity',
          'related_to_lead',
          'related_to_case',
        ],
      },
      {
        name: 'recurrence_and_effort',
        label: 'Recurrence & Effort',
        collapsible: true,
        collapsed: true,
        columns: 2,
        fields: [
          'is_recurring',
          'recurrence_type',
          'recurrence_interval',
          'recurrence_end_date',
          'progress_percent',
        ],
      },
    ],
  },
});

// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * Complete a task in one click, from its row in a task list or from its header (#2128).
 *
 * Before this, completing a task took four steps: open it, Edit, change Status,
 * Update.
 *
 * # Why a declarative update, and not a script body
 *
 * `operation: 'update'` + `patch` is the platform's own construct for "write
 * these fields to the record the action runs on". Two of its properties are the
 * reason it is used here instead of a `type: 'script'` body like
 * `mark_primary`:
 *
 *  - **It runs AS THE CALLER.** The runtime's action door writes the patch
 *    through the data plane under the requesting user's own execution context,
 *    so object, row and field permissions apply exactly as they do to an edit
 *    in the form. A user who cannot edit this task gets the platform's refusal.
 *    A script body would not: its `ctx.api` is system-elevated (the runtime's
 *    `buildActionExecutionContext` sets `isSystem: true`), so a hand-written
 *    write would succeed for a caller who may not edit the row, and this file
 *    would have to re-implement the permission check.
 *  - **Hooks and validations fire as for that edit.** So the action writes the
 *    ONE fact a user decides — the status — and nothing else.
 *
 * # Why the patch is `status` alone
 *
 * `task_completion` (`src/sales/objects/task.hook.ts`) already stamps
 * everything that follows from the status: on the transition into
 * `completed` it sets `completed_date` to now, `progress_percent` to 100 when
 * the write did not supply one, and recomputes `is_completed`. ⛔ Do not add
 * `completed_date` / `progress_percent` / `is_completed` to the patch. The hook
 * already writes them, and `completed_date` / `is_completed` are `readonly`, so
 * a caller-supplied value is stripped from a non-system write anyway. The same
 * status change also starts the next occurrence of a recurring task
 * (`task_recurrence`) and refreshes the customer's last-activity date
 * (`task_activity_bubble`), because those hooks key off the same transition.
 * `test/task-complete-action.test.ts` reads back each stamp after a real
 * dispatch.
 *
 * # What is deliberately left out
 *
 *  - **No `confirmText`.** #2128 asked for a confirmation only when the task
 *    has subtasks or an approval. `crm_task` has neither — no parent/subtask
 *    relation and no approval flow on the object — so there is nothing to
 *    confirm, and a dialog on every completion would bring back the extra step
 *    this action removes.
 *  - **No `undoable`.** The console's Undo would restore the `status` alone. It
 *    cannot reverse what the hooks did on the way in — `completed_date` and
 *    `progress_percent` stay stamped, and a recurring task's next occurrence
 *    stays created — so an Undo would leave the task half-completed.
 *  - **No `list_toolbar`.** A declarative update writes the one record it runs
 *    on, and the spec refuses it on a location that has none. Completing
 *    several tasks at once would be a `bulkActionDefs` entry on a view, which
 *    this card does not ask for.
 *
 * # Placement
 *
 * `variant: 'primary'` is what both surfaces read. On the record header the
 * action is the primary button. In a task list the console draws a row's
 * primary actions INLINE, as a button on the row (one by default), and every
 * other row action in the row's `⋯` menu. So on every open task in a list,
 * Complete is a button on the row rather than an entry in `⋯` — the "first
 * inline" placement #2128 asked for where the renderer has one.
 *
 * `visible` hides the button on a task that is already completed. It reads
 * `status`, the field the user edits; `is_completed` is derived from it by the
 * hook. It fails CLOSED like `convert_lead`'s: `status` is required with a
 * default, so an absent key means the page has no record yet, not a task with
 * no status. Hiding the button is the courtesy half; the as-caller write above
 * is the control.
 */
export const CompleteTaskAction: Action = {
  name: 'complete_task',
  label: 'Complete',
  objectName: 'crm_task',
  icon: 'check-circle',
  operation: 'update',
  patch: { status: 'completed' },
  locations: ['list_item', 'record_header'],
  variant: 'primary',
  visible: P`has(record.status) && record.status != "completed"`,
  successMessage: 'Task completed.',
  refreshAfter: true,
};

// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * Submit a timesheet for approval in one click (hotcrm#2546, PSA phase 2b).
 *
 * A declarative update, so it writes AS THE CALLER: the same write as setting
 * Status to Submitted in the form. `timesheet_stamps` judges it (a locked,
 * Closed or Cancelled project refuses it, naming the project) and the status
 * change starts `timesheet_approval`, which asks the timesheet's approver, its
 * project's manager. A script body would run as the system and skip those
 * person-side rules.
 *
 * "Submit this week" is the same write over a selection: the This Week's
 * Timesheets list (`timesheet.view.ts`) holds the person's draft timesheets of
 * the current week, one per project, and its bulk Submit sends each one
 * separately, so each goes to its own project manager and a refusal on one
 * project leaves the others submitted.
 */
export const SubmitTimesheetAction: Action = {
  name: 'submit_timesheet',
  label: 'Submit',
  objectName: 'crm_timesheet',
  icon: 'send',
  operation: 'update',
  patch: { status: 'submitted' },
  locations: ['record'],
  variant: 'primary',
  visible: P`has(record.status) && record.status == "draft" && current_user.can("crm_timesheet", "edit")`,
  successMessage: 'Timesheet {{ record.name }} submitted for approval.',
  refreshAfter: true,
};

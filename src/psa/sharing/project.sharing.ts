// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';

/**
 * Project Delivery record sharing (hotcrm#2316, plan *Permissions, positions,
 * sharing*). Projects and timesheets are `private`; these RECORD-RELATIVE
 * rules (`type: 'field'`, #14103) open each row to the people
 * the row itself names. Each re-materialises when the row's own write changes
 * that column; an empty column shares with nobody.
 *
 * The conditions match every row of the object. A criteria rule must carry
 * one, and the recipient column is what narrows these rules, not a predicate:
 * `record.id != ""` holds for every project and timesheet, both of which
 * require a name (a timesheet's is filled on save). The expense's approver
 * rule moved to the expense module with the object (hotcrm#2556).
 */

/** Everyone staffed on a project except its manager reads it (`team_members`, kept by `project_member.hook.ts`). */
export const ProjectTeamReadSharingRule = {
  name: 'project_team_read',
  label: 'Projects — Team',
  object: 'crm_project',
  type: 'criteria' as const,
  condition: P`record.id != ""`,
  accessLevel: 'read' as const,
  sharedWith: { type: 'field' as const, value: 'team_members' },
};

/** A project's manager edits it: staffing it is a write under the project. */
export const ProjectManagerEditSharingRule = {
  name: 'project_manager_edit',
  label: 'Projects — Project Manager',
  object: 'crm_project',
  type: 'criteria' as const,
  condition: P`record.id != ""`,
  accessLevel: 'edit' as const,
  sharedWith: { type: 'field' as const, value: 'project_manager' },
};

/**
 * The approver stamped on a timesheet edits it, so they can approve or reject
 * it (`timesheet.hook.ts` lets only them), and reads its entries with it.
 */
export const TimesheetApproverEditSharingRule = {
  name: 'timesheet_approver_edit',
  label: 'Timesheets — Approver',
  object: 'crm_timesheet',
  type: 'criteria' as const,
  condition: P`record.id != ""`,
  accessLevel: 'edit' as const,
  sharedWith: { type: 'field' as const, value: 'approver' },
};

/**
 * Finance edits every project's budget: one rule per position that holds
 * `finance_controller` (`src/sales/sharing/positions.ts`). An edit share
 * opens update and never delete.
 */
export const ProjectFinanceEditSharingRules = (['crm_finance_controller', 'crm_project_director', 'crm_pmo'] as const).map((position) => ({
  name: `project_finance_edit_${position.replace(/^crm_/, '')}`,
  label: 'Projects — Finance',
  object: 'crm_project',
  type: 'criteria' as const,
  condition: P`record.id != ""`,
  accessLevel: 'edit' as const,
  sharedWith: { type: 'position' as const, value: position },
}));

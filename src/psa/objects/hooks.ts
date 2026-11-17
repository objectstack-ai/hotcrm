// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Project Delivery hook registrations. See `src/sales/objects/hooks.ts` for
 * why these are named re-exports rather than an assembled array. Every hook
 * here attaches to one of this module's own objects (ADR-0130 R4): accounts,
 * opportunities and contracts are only ever read.
 */

export { default as projectHook } from './project.hook';
export { default as projectMemberHook } from './project_member.hook';
export { default as projectTaskHook } from './project_task.hook';
export { default as timesheetHook } from './timesheet.hook';
export { default as timeEntryHook } from './time_entry.hook';
export { default as projectBudgetHook } from './project_budget.hook';

// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

/**
 * A timesheet's own stamps and its one-per-period rule, on save:
 *
 *   - `name`, when empty: the project's name and the period, so a list of
 *     timesheets reads without opening each. A name the person typed is kept
 *     (hotcrm#2567). A generated name follows a later change of the project
 *     or the period; a typed one is never replaced.
 *   - `approver`, when the timesheet is created: the project's Project
 *     Manager at that moment (read-only to people; `timesheet_approval` asks
 *     them).
 *   - One timesheet per person, project and period start: a second one is
 *     refused, naming the first. Judged only on a person's write
 *     (`ctx.user` present); a seed or an import is its author's to keep
 *     consistent.
 *   - The approval decides (#2316 phase 1b): submitting starts
 *     `timesheet_approval`, which asks the approver in their Inbox and writes
 *     Approved or Rejected when they decide. A person who sets either status
 *     is refused, so nobody approves hours into the project's cost by editing
 *     the record; an administrator may, to repair a sheet whose approval
 *     cannot run.
 *   - A locked project takes no submissions: moving a timesheet to Submitted
 *     on a project whose Lock Time and Expenses is ticked is refused, naming
 *     the project. Drafts are never refused, and nobody is exempt: the way on
 *     is to untick the lock.
 *   - A project that is over takes no time (hotcrm#2491): on a Closed or
 *     Cancelled project, a person cannot create a timesheet, move one onto
 *     it, or submit one, and the refusal names the project and its status.
 *     A draft already there stays readable and editable, and can be moved to
 *     an open project; only its submission is refused, since that would put
 *     cost on a finished project. Completed stays open for late bookings (it
 *     can go back to Active, and Lock Time and Expenses closes it to
 *     submissions). Judged on a person's write, administrators included; a
 *     seed or an import is its author's to keep consistent.
 *
 * Runs as the caller: the person writing their own timesheet reads the
 * project they are staffed on, and counts only their own timesheets.
 */
const timesheetStamps: Hook = {
  name: 'timesheet_stamps',
  object: 'crm_timesheet',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 100,
  refusals: {
    RECORD_LOCKED: {
      message: 'This timesheet cannot be changed on this project now.',
      status: 409,
      params: ['project'],
      reasons: {
        project_locked: { message: '{{project}} is locked for time and expenses, so this timesheet cannot be submitted. Keep it as a draft, or ask the project manager to untick Lock Time and Expenses on the project.' },
        closed_takes_no_new: { message: '{{project}} is Closed, so it takes no new timesheets. Record the time on an open project.' },
        cancelled_takes_no_new: { message: '{{project}} is Cancelled, so it takes no new timesheets. Record the time on an open project.' },
        closed_no_submit: { message: '{{project}} is Closed, so this timesheet cannot be submitted. Keep it as a draft, or move it to an open project.' },
        cancelled_no_submit: { message: '{{project}} is Cancelled, so this timesheet cannot be submitted. Keep it as a draft, or move it to an open project.' },
      },
    },
    FORBIDDEN: { message: 'A timesheet is approved or rejected by its approver, from their Inbox, once it is submitted.', status: 403 },
    DUPLICATE_VALUE: {
      message: 'There is already a timesheet for this project and period. Add the hours to that one.',
      status: 409,
      params: ['timesheet'],
      reasons: {
        named: { message: 'There is already a timesheet for this project and period: {{timesheet}}. Add the hours to that one.' },
      },
    },
  },
  description: 'Fill an empty name and the approver, keep one timesheet per person, project and period, leave the decision to the approval, refuse a submission on a locked project, and take no timesheet onto a Closed or Cancelled project.',
  handler: async (ctx: HookContext) => {
    // The refusal envelope (#1075). Mirrored from `src/sales/objects/_refusal.ts` because a
    // lowered body has no module scope and `extractHookBody` THROWS on an
    // import; `test/refusal-envelope.test.ts` pins every copy against it.
    function refuse(
      message: string,
      code: string,
      status: number,
      userMessage: string = message,
    ): Error {
      const err = new Error(message) as Error & {
        code: string;
        status: number;
        userMessage: string;
      };
      err.code = code;
      err.status = status;
      err.userMessage = userMessage;
      return err;
    }
    function refId(value: unknown): string {
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object' && typeof (value as Record<string, unknown>).id === 'string') {
        return String((value as Record<string, unknown>).id);
      }
      return '';
    }
    const { input } = ctx;
    if (!input) return;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;
    const previous = (ctx.previous ?? {}) as Record<string, unknown>;
    const pick = (key: string): unknown => (key in input ? input[key] : previous[key]);

    const projectId = refId(pick('crm_project'));
    const periodStart = typeof pick('period_start') === 'string' ? String(pick('period_start')).slice(0, 10) : '';
    const periodEnd = typeof pick('period_end') === 'string' ? String(pick('period_end')).slice(0, 10) : '';
    const person = Boolean(ctx.user?.id) && !ctx.session?.isSystem;
    const submitting = person && input.status === 'submitted' && previous.status !== 'submitted';
    const moving = ctx.event === 'beforeUpdate' && 'crm_project' in input && projectId !== refId(previous.crm_project);
    const cleared = 'name' in input && (typeof input.name !== 'string' || input.name.trim() === '');
    const needsProject = ctx.event === 'beforeInsert' || 'crm_project' in input || 'period_start' in input || 'period_end' in input || cleared || submitting;
    const project = projectId && needsProject
      ? await api.object('crm_project').findOne({ where: { id: projectId }, fields: ['id', 'name', 'status', 'project_manager', 'time_entry_locked'] })
      : null;

    // The statuses of a project that is over, as the console labels them.
    const PROJECT_OVER: Record<string, string> = { closed: 'Closed', cancelled: 'Cancelled' };
    const over = person && project && typeof project.status === 'string' ? PROJECT_OVER[project.status] : undefined;
    if (over && (ctx.event === 'beforeInsert' || moving || submitting)) {
      const projectName = String(project?.name ?? 'This project');
      const fresh = ctx.event === 'beforeInsert' || moving;
      throw Object.assign(refuse(
        fresh
          ? `${projectName} is ${over}, so it takes no new timesheets. Record the time on an open project.`
          : `${projectName} is ${over}, so this timesheet cannot be submitted. Keep it as a draft, or move it to an open project.`,
        'RECORD_LOCKED',
        409,
      ), { reason: fresh ? (project?.status === 'closed' ? 'closed_takes_no_new' : 'cancelled_takes_no_new') : (project?.status === 'closed' ? 'closed_no_submit' : 'cancelled_no_submit'), params: { project: projectName } });
    }

    if (submitting && project && project.time_entry_locked === true) {
      throw Object.assign(refuse(
        `${String(project.name ?? 'This project')} is locked for time and expenses, so this timesheet cannot be submitted. Keep it as a draft, or ask the project manager to untick Lock Time and Expenses on the project.`,
        'RECORD_LOCKED',
        409,
      ), { reason: 'project_locked', params: { project: String(project.name ?? 'This project') } });
    }

    // The generated name; a typed one is the person's and stays (hotcrm#2567).
    const stamp = (projectName: unknown, start: string, end: string): string =>
      `${String(projectName ?? '')} · ${start}${end ? ` – ${end}` : ''}`.slice(0, 200);
    if (project && periodStart) {
      const name = pick('name');
      let fill = typeof name !== 'string' || name.trim() === '';
      if (!fill && ctx.event === 'beforeUpdate' && !('name' in input)
        && ('crm_project' in input || 'period_start' in input || 'period_end' in input)) {
        // Still the name generated from the old project and period: follow the change.
        const day = (v: unknown): string => (typeof v === 'string' ? v.slice(0, 10) : '');
        const before = moving
          ? await api.object('crm_project').findOne({ where: { id: refId(previous.crm_project) }, fields: ['id', 'name'] })
          : project;
        fill = before != null && previous.name === stamp(before.name, day(previous.period_start), day(previous.period_end));
      }
      if (fill) input.name = stamp(project.name, periodStart, periodEnd);
    }

    if (ctx.event === 'beforeInsert' && project) {
      const manager = refId(project.project_manager);
      if (manager) input.approver = manager;
    }

    const status = input.status;
    if (person && (status === 'approved' || status === 'rejected') && status !== previous.status) {
      const ADMIN_IDENTITIES = ['platform_admin', 'org_owner', 'org_admin'];
      const positions = (ctx.session?.positions ?? []) as string[];
      if (!positions.some((p) => ADMIN_IDENTITIES.includes(p))) {
        throw refuse(
          'A timesheet is approved or rejected by its approver, from their Inbox, once it is submitted.',
          'FORBIDDEN',
          403,
        );
      }
    }

    const owner = refId(pick('owner_id')) || (ctx.user?.id ?? '');
    if (ctx.user?.id && owner && projectId && periodStart && (ctx.event === 'beforeInsert' || 'period_start' in input || 'crm_project' in input)) {
      const others = await api.object('crm_timesheet').find({
        where: { owner_id: owner, crm_project: projectId, period_start: periodStart },
        fields: ['id', 'name'],
        top: 2,
      });
      const clash = others.find((t) => t.id !== previous.id);
      if (clash) {
        const clashName = typeof clash.name === 'string' && clash.name !== '' ? `: ${clash.name}` : '';
        throw Object.assign(refuse(
          `There is already a timesheet for this project and period${clashName}. Add the hours to that one.`,
          'DUPLICATE_VALUE',
          409,
        ), clashName ? { reason: 'named', params: { timesheet: String(clash.name) } } : {});
      }
    }
  },
};

export default [timesheetStamps];

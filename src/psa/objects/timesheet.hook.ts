// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

/**
 * A timesheet's own stamps and its one-per-period rule, on save:
 *
 *   - `name`, when empty: the project's name and the period, so a list of
 *     timesheets reads without opening each.
 *   - `approver`, when the timesheet is created: the project's Project
 *     Manager at that moment (read-only to people; the approval in phase 1b
 *     routes to it).
 *   - One timesheet per person, project and period start: a second one is
 *     refused, naming the first. Judged only on a person's write
 *     (`ctx.user` present); a seed or an import is its author's to keep
 *     consistent.
 *   - Only the approver decides: a person's write that moves the status to
 *     Approved or Rejected is refused unless the writer is the timesheet's
 *     approver or an administrator, so nobody approves their own hours into
 *     the project's cost. The approver edits the timesheet through the
 *     `timesheet_approver_edit` share.
 *
 * Runs as the caller: the person writing their own timesheet reads the
 * project they are staffed on, and counts only their own timesheets.
 */
const timesheetStamps: Hook = {
  name: 'timesheet_stamps',
  object: 'crm_timesheet',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 100,
  description: 'Fill the name and the approver, keep one timesheet per person, project and period, and let only the approver decide.',
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
    const needsProject = ctx.event === 'beforeInsert' || 'crm_project' in input || 'period_start' in input;
    const project = projectId && needsProject
      ? await api.object('crm_project').findOne({ where: { id: projectId }, fields: ['id', 'name', 'project_manager'] })
      : null;

    const name = pick('name');
    if ((name == null || name === '' || 'period_start' in input || 'crm_project' in input) && project && periodStart) {
      const generated = `${String(project.name ?? '')} · ${periodStart}${periodEnd ? ` – ${periodEnd}` : ''}`;
      if (name == null || name === '' || ctx.event === 'beforeInsert') input.name = generated.slice(0, 200);
    }

    if (ctx.event === 'beforeInsert' && project) {
      const manager = refId(project.project_manager);
      if (manager) input.approver = manager;
    }

    const status = input.status;
    if (ctx.user?.id && (status === 'approved' || status === 'rejected') && status !== previous.status) {
      const ADMIN_IDENTITIES = ['platform_admin', 'org_owner', 'org_admin'];
      const positions = (ctx.session?.positions ?? []) as string[];
      const approver = refId(pick('approver'));
      if (approver !== ctx.user.id && !positions.some((p) => ADMIN_IDENTITIES.includes(p))) {
        throw refuse(
          approver
            ? 'Only the timesheet\'s approver (the project\'s Project Manager when it was created) can approve or reject it.'
            : 'This timesheet has no approver: its project had no Project Manager when it was created. An administrator can approve or reject it.',
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
        throw refuse(
          `There is already a timesheet for this project and period${clashName}. Add the hours to that one.`,
          'DUPLICATE_VALUE',
          409,
        );
      }
    }
  },
};

export default [timesheetStamps];

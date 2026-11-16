// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

/**
 * A budget version's own rules, on save (hotcrm#2547, PSA phase 2c):
 *
 *   - **Numbered and named.** A new version takes the next number on its
 *     project (1, 2, 3…) and, when left empty, the name "<project> · v<n>".
 *   - **One open version per project.** A new version is refused while
 *     another is Draft, In Approval or Rejected, naming it.
 *   - **A person's new version starts as Draft** (an administrator's may
 *     start Approved, to carry over a budget typed before versions:
 *     `scripts/backfill-project-budget-baseline.ts`).
 *   - **The approval decides.** Approved, Rejected and Superseded are written
 *     by the approvals and by `project_budget_baseline`; a person who sets one
 *     is refused (an administrator may, to repair a version whose approval
 *     cannot run).
 *   - **Version 1 goes with the project.** While the project has not been
 *     approved, its version 1 is sent for approval by sending the project
 *     (`project_budget_follow`); setting it In Approval directly is refused.
 *   - **A top-up is ready before it is sent.** Setting a version In Approval
 *     needs lines, a total above zero, every line complete (a labor line its
 *     rate card and hours, any other its quantity) and, from version 2, a
 *     reason. `project_status_guard` asks the same of the version that rides
 *     on the project.
 *   - **Only an open version is deleted.** An approved or superseded version
 *     is the project's history.
 *
 * Judged on a person's write; a seed, an import or the approvals write as
 * the platform. `runAs: 'system'` so the counts read every version of the
 * project whoever writes; every read is keyed to the project (rule 10).
 */
const projectBudgetRules: Hook = {
  name: 'project_budget_rules',
  object: 'crm_project_budget',
  events: ['beforeInsert', 'beforeUpdate', 'beforeDelete'],
  priority: 100,
  runAs: 'system',
  refusals: {
    VALIDATION_FAILED: {
      message: 'This budget change is not allowed.',
      status: 400,
      params: ['project', 'version', 'problem'],
      reasons: {
        open_version: { message: '{{project}} already has an open budget version (version {{version}}). Send it, or delete it, before starting another.' },
        starts_as_draft: { message: 'A new budget version starts as Draft. Save it, add its lines, then send it for approval.' },
        with_project: { message: 'Version 1 is approved with the project: send the project for approval, and its budget goes with it.' },
        reason_required: { message: 'Say why this top-up is needed in Reason before sending it for approval.' },
        not_ready: { message: 'The budget is not ready to approve: {{problem}} Complete it, then send it for approval.' },
      },
    },
    FORBIDDEN: {
      message: 'A budget version is approved or rejected by its approver, from their Inbox, once it is sent.',
      status: 403,
    },
    RECORD_LOCKED: {
      message: 'Only an open budget version (Draft or Rejected) can be deleted. An approved one is the project\'s history.',
      status: 409,
    },
  },
  description: 'Number and name a budget version, keep one open version per project, leave the decision to the approval, send version 1 with the project, and check a top-up is complete before it is sent.',
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
    const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v ?? 0) || 0);
    const api = ctx.api as HookApi | undefined;
    if (!api) return;
    const input = (ctx.input ?? {}) as Record<string, unknown>;
    const previous = (ctx.previous ?? {}) as Record<string, unknown>;
    const pick = (key: string): unknown => (key in input ? input[key] : previous[key]);
    const person = Boolean(ctx.user?.id) && !ctx.session?.isSystem;
    const ADMIN_IDENTITIES = ['platform_admin', 'org_owner', 'org_admin'];
    const admin = ((ctx.session?.positions ?? []) as string[]).some((p) => ADMIN_IDENTITIES.includes(p));
    const OPEN = ['draft', 'in_approval', 'rejected'];

    if (ctx.event === 'beforeDelete') {
      if (person && !admin && !['draft', 'rejected'].includes(String(previous.status ?? 'draft'))) {
        throw refuse(
          'Only an open budget version (Draft or Rejected) can be deleted. An approved one is the project\'s history.',
          'RECORD_LOCKED',
          409,
        );
      }
      return;
    }

    const projectId = refId(pick('crm_project'));
    const project = projectId
      ? await api.object('crm_project').findOne({ where: { id: projectId }, fields: ['id', 'name', 'status'] })
      : null;
    const projectName = String(project?.name ?? 'This project');

    if (ctx.event === 'beforeInsert') {
      if (person && !admin && input.status != null && input.status !== '' && input.status !== 'draft') {
        throw Object.assign(refuse(
          'A new budget version starts as Draft. Save it, add its lines, then send it for approval.',
          'VALIDATION_FAILED',
          400,
        ), { reason: 'starts_as_draft' });
      }
      const versions = projectId
        ? await api.object('crm_project_budget').find({ where: { crm_project: projectId }, fields: ['id', 'version', 'status'], top: 200 })
        : [];
      const open = versions.find((v) => OPEN.includes(String(v.status)));
      if (person && open) {
        const version = String(open.version ?? '');
        throw Object.assign(refuse(
          `${projectName} already has an open budget version (version ${version}). Send it, or delete it, before starting another.`,
          'VALIDATION_FAILED',
          400,
        ), { reason: 'open_version', params: { project: projectName, version } });
      }
      // A seed or an import may carry its own number (the seed loader resolves
      // the project reference after this hook, so the count above reads
      // nothing for it); a person's is always the next one.
      const next = !person && num(input.version) > 0
        ? num(input.version)
        : versions.reduce((max, v) => Math.max(max, num(v.version)), 0) + 1;
      input.version = next;
      if (input.name == null || input.name === '') input.name = `${projectName} · v${next}`.slice(0, 200);
      return;
    }

    if (!person || !('status' in input) || input.status === previous.status) return;
    const status = String(input.status ?? '');
    if (['approved', 'rejected', 'superseded'].includes(status) && !admin) {
      throw refuse(
        'A budget version is approved or rejected by its approver, from their Inbox, once it is sent.',
        'FORBIDDEN',
        403,
      );
    }
    if (status !== 'in_approval') return;

    const version = num(pick('version'));
    if (version <= 1 && project && ['draft', 'in_approval', 'rejected'].includes(String(project.status))) {
      throw Object.assign(refuse(
        'Version 1 is approved with the project: send the project for approval, and its budget goes with it.',
        'VALIDATION_FAILED',
        400,
      ), { reason: 'with_project' });
    }
    const reason = pick('reason');
    if (version > 1 && (typeof reason !== 'string' || reason.trim() === '')) {
      throw Object.assign(refuse(
        'Say why this top-up is needed in Reason before sending it for approval.',
        'VALIDATION_FAILED',
        400,
      ), { reason: 'reason_required' });
    }
    // The same readiness `project_status_guard` asks of version 1; pinned
    // equal by `test/psa-budget-versions.test.ts`.
    const lines = await api.object('crm_project_budget_line').find({
      where: { crm_project_budget: String(previous.id ?? '') },
      fields: ['id', 'category', 'description', 'rate_card', 'hours', 'quantity', 'amount'],
      top: 500,
    });
    let problem = '';
    if (lines.length === 0) problem = 'it has no lines.';
    for (const line of lines) {
      if (problem) break;
      const label = String(line.description ?? 'a line');
      if (line.category === 'labor') {
        if (!line.rate_card) problem = `the labor line "${label}" names no rate card.`;
        else if (num(line.hours) <= 0) problem = `the labor line "${label}" has no hours.`;
      } else if (num(line.quantity) <= 0) {
        problem = `the line "${label}" has no quantity.`;
      }
    }
    if (!problem && lines.reduce((sum, line) => sum + num(line.amount), 0) <= 0) problem = 'its total is zero.';
    if (problem) {
      throw Object.assign(refuse(
        `The budget is not ready to approve: ${problem} Complete it, then send it for approval.`,
        'VALIDATION_FAILED',
        400,
      ), { reason: 'not_ready', params: { problem } });
    }
  },
};

/**
 * The baseline moves to the version just approved (hotcrm#2547).
 *
 * When a version becomes Approved (its own approval, the project's initiation
 * approval, or a seed loading it so), it becomes the baseline, and the version
 * that was the baseline is Superseded. So a project has exactly one baseline,
 * and its Approved Budget (a summary over the baseline) follows.
 *
 * `runAs: 'system'`: Baseline is read-only to people, and Superseded is never
 * a person's to set. Every read is keyed to the project (rule 10).
 */
const projectBudgetBaseline: Hook = {
  name: 'project_budget_baseline',
  object: 'crm_project_budget',
  events: ['afterInsert', 'afterUpdate'],
  priority: 100,
  runAs: 'system',
  description: 'Make the version just approved the project\'s baseline, and supersede the one before.',
  handler: async (ctx: HookContext) => {
    function refId(value: unknown): string {
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object' && typeof (value as Record<string, unknown>).id === 'string') {
        return String((value as Record<string, unknown>).id);
      }
      return '';
    }
    const api = ctx.api as HookApi | undefined;
    if (!api) return;
    const input = (ctx.input ?? {}) as Record<string, unknown>;
    const previous = (ctx.previous ?? {}) as Record<string, unknown>;
    const result = (ctx.result ?? {}) as Record<string, unknown>;
    const status = 'status' in input ? input.status : previous.status;
    if (status !== 'approved' || previous.status === 'approved') return;
    const selfId = refId(result.id) || refId(input.id) || refId(previous.id);
    const projectId = refId(input.crm_project) || refId(previous.crm_project) || refId(result.crm_project);
    if (!selfId || !projectId) return;
    const others = await api.object('crm_project_budget').find({
      where: { crm_project: projectId, is_baseline: true },
      fields: ['id', 'status'],
      top: 50,
    });
    for (const other of others) {
      if (String(other.id) === selfId) continue;
      await api.object('crm_project_budget').update(
        { id: String(other.id), is_baseline: false, status: 'superseded' },
        { where: { id: String(other.id) } },
      );
    }
    await api.object('crm_project_budget').update(
      { id: selfId, is_baseline: true },
      { where: { id: selfId } },
    );
  },
};

/**
 * A budget line's amount, and its lock (hotcrm#2547):
 *
 *   - **The month is its first day.** A date typed into Month is saved as the
 *     first of that month, so lines plan by month.
 *   - **A labor line's unit cost defaults from its rate card.** When a rate
 *     card is named and no unit cost is typed, the card's cost rate per hour
 *     is copied (a day card counts `HOURS_PER_DAY` = 8 hours, as a time entry
 *     does). A typed unit cost is kept.
 *   - **The amount is stored:** hours × unit cost for labor, quantity × unit
 *     cost otherwise, so the version's Total Cost can sum it.
 *   - **Only an open version's lines change.** A line of a version In
 *     Approval, Approved or Superseded is not added, edited or removed on a
 *     person's write. An administrator is exempt, to repair or carry over a
 *     budget, as on the version itself.
 *
 * `runAs: 'system'`: the person planning may not read the cost rate (it is
 * hidden from project members), yet the line is costed at it. Every read is
 * keyed to an id (rule 10).
 */
const projectBudgetLineAmount: Hook = {
  name: 'project_budget_line_amount',
  object: 'crm_project_budget_line',
  events: ['beforeInsert', 'beforeUpdate', 'beforeDelete'],
  priority: 100,
  runAs: 'system',
  refusals: {
    RECORD_LOCKED: { message: 'This budget version has been sent for approval, so its lines cannot change. Start a new version to plan a change.', status: 409 },
  },
  description: 'Save the month as its first day, default a labor line\'s unit cost from its rate card, keep the amount, and lock the lines of a version that has been sent.',
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
    const HOURS_PER_DAY = 8;
    const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v ?? 0) || 0);
    const round2 = (v: number): number => Math.round(v * 100) / 100;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;
    const input = (ctx.input ?? {}) as Record<string, unknown>;
    const previous = (ctx.previous ?? {}) as Record<string, unknown>;
    const pick = (key: string): unknown => (key in input ? input[key] : previous[key]);
    const person = Boolean(ctx.user?.id) && !ctx.session?.isSystem;
    const ADMIN_IDENTITIES = ['platform_admin', 'org_owner', 'org_admin'];
    const admin = ((ctx.session?.positions ?? []) as string[]).some((p) => ADMIN_IDENTITIES.includes(p));

    const budgetIds = [refId(pick('crm_project_budget')), refId(previous.crm_project_budget)]
      .filter((id, i, all) => id !== '' && all.indexOf(id) === i);
    if (person && !admin) {
      for (const id of budgetIds) {
        const budget = await api.object('crm_project_budget').findOne({ where: { id }, fields: ['id', 'status'] });
        if (budget && !['draft', 'rejected'].includes(String(budget.status))) {
          throw refuse(
            'This budget version has been sent for approval, so its lines cannot change. Start a new version to plan a change.',
            'RECORD_LOCKED',
            409,
          );
        }
      }
    }
    if (ctx.event === 'beforeDelete') return;

    const period = pick('period');
    if (typeof period === 'string' && /^\d{4}-\d{2}-\d{2}/.test(period) && period.slice(8, 10) !== '01') {
      input.period = `${period.slice(0, 7)}-01`;
    }

    const labor = pick('category') === 'labor';
    let unitCost = pick('unit_cost');
    const cardId = refId(pick('rate_card'));
    const cardChanged = 'rate_card' in input && cardId !== refId(previous.rate_card);
    if (labor && cardId && (unitCost == null || unitCost === '' || (cardChanged && !('unit_cost' in input)))) {
      const card = await api.object('crm_rate_card').findOne({ where: { id: cardId }, fields: ['id', 'cost_rate', 'unit'] });
      if (card) {
        unitCost = round2(num(card.cost_rate) / (card.unit === 'day' ? HOURS_PER_DAY : 1));
        input.unit_cost = unitCost;
      }
    }
    input.amount = round2((labor ? num(pick('hours')) : num(pick('quantity'))) * num(unitCost));
  },
};

export default [projectBudgetRules, projectBudgetBaseline, projectBudgetLineAmount];

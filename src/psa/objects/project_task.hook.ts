// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

/**
 * A task's own rules, before it is written (hotcrm#2545):
 *
 *   - **Completed is 100 %.** A task saved as Completed has its Percent
 *     Complete set to 100, so the project's progress counts it as done.
 *   - **The 100 leaves with Completed (hotcrm#2768).** That 100 is written by
 *     this hook, not estimated by the task's owner, so a task moved out of
 *     Completed, to any other status, goes back to 0 %. A save that changes the
 *     percentage together with the status keeps the percentage it gives; the
 *     stored figure sent back unchanged (a form posting every field) is not a
 *     percentage given. The estimate from before Completed is not restored
 *     automatically (field history still shows it). A Completed task stored at
 *     a figure other than 100 (a row from before hotcrm#2545) keeps it, and a
 *     predicate update leaves the figure alone (see the stand-down below).
 *   - **The tree stays inside the project, with no loop.** The parent task
 *     must be another task of the same project, and not one of the task's own
 *     subtasks (that would make the tree a loop the Gantt cannot draw).
 *   - **Predecessors are tasks of the same project**, other than the task.
 *
 * `runAs: 'system'` (AGENTS.md rule 9) so the checks read the parent chain
 * and the predecessors whoever writes; every read is keyed to an id (rule 10)
 * and the walk up the tree stops after `MAX_DEPTH` steps.
 */
const projectTaskRules: Hook = {
  name: 'project_task_rules',
  object: 'crm_project_task',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 100,
  runAs: 'system',
  refusals: {
    VALIDATION_FAILED: {
      message: 'The parent task must be another task of the same project.',
      status: 400,
      reasons: {
        loop: { message: 'This parent task is one of this task\'s own subtasks. Pick a task that is not under this one.' },
        predecessor: { message: 'A predecessor must be another task of the same project.' },
      },
    },
  },
  description: 'Set a completed task to 100 % and a task moved out of Completed back to 0 %, and keep its parent and predecessors inside the same project with no loop.',
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
    const MAX_DEPTH = 50;
    const api = ctx.api as HookApi | undefined;
    const input = ctx.input as Record<string, unknown> | undefined;
    if (!api || !input) return;
    const previous = (ctx.previous ?? {}) as Record<string, unknown>;
    const pick = (key: string): unknown => (key in input ? input[key] : previous[key]);

    if ('status' in input && input.status === 'completed') {
      input.percent_complete = 100;
    } else if (
      'status' in input && previous.status === 'completed'
      // D3 stand-down: a predicate update (`multi: true` + `where`) hands every
      // matched row ONE shared payload, so a reset decided on this row's
      // `ctx.previous` would be seen by the next row as a percentage given, and
      // the engine refuses the diverging key set (MULTI_UPDATE_HOOK_KEY_DIVERGENCE).
      // Full account: `src/sales/objects/forecast.hook.ts`. Every writer of a
      // task in this app saves by id, so the reset still happens there. The
      // `ctx.event` half matters: a batch insert also reports `per-row`.
      && !(ctx.event === 'beforeUpdate' && ctx.dispatch?.mode === 'per-row')
    ) {
      const figure = (v: unknown): number | null => (v == null || v === '' ? null : Number(v));
      const stored = figure(previous.percent_complete);
      const given = 'percent_complete' in input && figure(input.percent_complete) !== stored;
      // Only the 100 this hook wrote is taken back. A Completed task stored at
      // another figure (a row from before hotcrm#2545) holds the owner's own
      // number, so it is left as it is, also when a form sends it back.
      if (stored === 100 && !given) input.percent_complete = 0;
    }

    const selfId = refId(previous.id);
    const projectId = refId(pick('crm_project'));
    const moved = 'crm_project' in input && refId(previous.crm_project) !== '' && refId(previous.crm_project) !== projectId;

    const parentId = refId(pick('parent_task'));
    if (parentId && ('parent_task' in input || moved)) {
      const parent = await api.object('crm_project_task').findOne({
        where: { id: parentId },
        fields: ['id', 'crm_project', 'parent_task'],
      });
      if (!parent || parentId === selfId || refId(parent.crm_project) !== projectId) {
        throw refuse('The parent task must be another task of the same project.', 'VALIDATION_FAILED', 400);
      }
      if (selfId) {
        let up = refId(parent.parent_task);
        for (let step = 0; up && step < MAX_DEPTH; step++) {
          if (up === selfId) {
            throw Object.assign(refuse(
              'This parent task is one of this task\'s own subtasks. Pick a task that is not under this one.',
              'VALIDATION_FAILED',
              400,
            ), { reason: 'loop' });
          }
          const next = await api.object('crm_project_task').findOne({ where: { id: up }, fields: ['id', 'parent_task'] });
          up = next ? refId(next.parent_task) : '';
        }
      }
    }

    if ('predecessors' in input || moved) {
      const ids = (Array.isArray(pick('predecessors')) ? (pick('predecessors') as unknown[]) : [])
        .map((v) => refId(v)).filter((v) => v !== '');
      for (const id of ids) {
        const before = id === selfId
          ? null
          : await api.object('crm_project_task').findOne({ where: { id }, fields: ['id', 'crm_project'] });
        if (!before || refId(before.crm_project) !== projectId) {
          throw Object.assign(refuse(
            'A predecessor must be another task of the same project.',
            'VALIDATION_FAILED',
            400,
          ), { reason: 'predecessor' });
        }
      }
    }
  },
};

/**
 * The project's Percent Complete, from its tasks (hotcrm#2545).
 *
 * After any task is added, changed or removed, the project's
 * `percent_complete` is recomputed over the tasks that have no subtasks (a
 * summary task counts through them, so no hour is counted twice), leaving out
 * cancelled ones: each task's percentage (100 when Completed) weighted by its
 * planned hours. When none of those tasks has planned hours, each counts the
 * same. A project with no task to count reads empty.
 *
 * `runAs: 'system'`: the field is read-only to people, and the person editing a
 * task may not edit the project. Every read is keyed to the project's id
 * (rule 10). It writes only when the figure changed.
 */
const projectTaskProgress: Hook = {
  name: 'project_task_progress',
  object: 'crm_project_task',
  events: ['afterInsert', 'afterUpdate', 'afterDelete'],
  priority: 100,
  runAs: 'system',
  description: 'Recompute the project\'s Percent Complete from its tasks, weighted by planned hours.',
  handler: async (ctx: HookContext) => {
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
    // Every write recomputes, not only one naming a counted field: the seed
    // loader writes a row's self-references (parent, predecessors) in a second
    // pass, and the first pass's reads may not see the rows written beside it.
    // A task moved to another project changes both projects' progress.
    const projectIds = [refId(input.crm_project), refId(previous.crm_project)]
      .filter((id, i, all) => id !== '' && all.indexOf(id) === i);

    for (const projectId of projectIds) {
      const tasks = await api.object('crm_project_task').find({
        where: { crm_project: projectId },
        fields: ['id', 'parent_task', 'status', 'percent_complete', 'planned_hours'],
        top: 2000,
      });
      const parents: Record<string, boolean> = {};
      for (const t of tasks) {
        const p = refId(t.parent_task);
        if (p) parents[p] = true;
      }
      let hours = 0;
      let earned = 0;
      let count = 0;
      let sum = 0;
      for (const t of tasks) {
        if (parents[String(t.id)] || t.status === 'cancelled') continue;
        const pct = t.status === 'completed' ? 100 : Math.min(100, Math.max(0, num(t.percent_complete)));
        const h = Math.max(0, num(t.planned_hours));
        hours += h;
        earned += h * pct;
        count += 1;
        sum += pct;
      }
      let figure: number | null = null;
      if (hours > 0) figure = earned / hours;
      else if (count > 0) figure = sum / count;
      if (figure !== null) figure = Math.round(figure * 10) / 10;

      const project = await api.object('crm_project').findOne({
        where: { id: projectId },
        fields: ['id', 'percent_complete'],
      });
      if (!project) continue;
      const held = project.percent_complete == null ? null : num(project.percent_complete);
      if (held === figure) continue;
      await api.object('crm_project').update(
        { id: projectId, percent_complete: figure },
        { where: { id: projectId } },
      );
    }
  },
};

export default [projectTaskRules, projectTaskProgress];

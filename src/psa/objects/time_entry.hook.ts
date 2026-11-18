// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

/**
 * A time entry's cost and amount to bill, and the two rules its timesheet
 * sets (hotcrm#2316, plan *crm_timesheet and crm_time_entry*):
 *
 *   - **The rates are copied once.** When the entry is created (or moved to
 *     another timesheet) the hook finds the timesheet owner's staffing on the
 *     project and copies its rate card's cost rate and bill rate, per hour (a
 *     day rate is counted as `HOURS_PER_DAY` = 8 hours, the number
 *     `../objects/_psa-picklists.ts` publishes). A staffing marked not
 *     billable bills at zero. Later edits recompute the amounts at the STORED
 *     rates, so a rate card changed next quarter never rewrites this cost.
 *   - **The date falls inside the timesheet's period.**
 *   - **The task, when one is named, is the timesheet's project's** (#2545).
 *   - **The line's project is the timesheet's** (#2546): copied onto the
 *     line, and a line naming another project is refused. The line's owner is
 *     the timesheet's person, so My Week lists it for them.
 *   - **A submitted or approved timesheet's entries do not change** — not
 *     added, edited, removed or moved out — on a person's write. Correcting one is
 *     sending the timesheet back to Draft.
 *
 * A person with no staffing on the project cannot book hours to it: the
 * entry is refused, naming the project. A staffing with no rate card books
 * hours at zero cost.
 *
 * `runAs: 'system'` (AGENTS.md rule 9): the person booking hours does not
 * read the cost rate (it is hidden from project members), yet the cost must be
 * counted at it. Every read is keyed to an id (the timesheet, the project and
 * person of its staffing, the rate card), so nothing scans (rule 10).
 */
const timeEntryCosting: Hook = {
  name: 'time_entry_costing',
  object: 'crm_time_entry',
  events: ['beforeInsert', 'beforeUpdate', 'beforeDelete'],
  priority: 100,
  runAs: 'system',
  refusals: {
    RECORD_LOCKED: { message: 'This timesheet has been submitted, so its hours cannot change. Send it back to Draft to correct them.', status: 409 },
    VALIDATION_FAILED: {
      message: 'The date {{day}} is outside this timesheet\'s period ({{from}} – {{to}}).',
      status: 400,
      params: ['day', 'from', 'to'],
      reasons: {
        task: { message: 'The task must be one of this timesheet\'s project tasks.' },
        project: { message: 'The project must be this timesheet\'s project.' },
      },
    },
    FORBIDDEN: {
      message: 'Hours can only be booked by people staffed on the project. Ask its project manager to add you.',
      status: 403,
      params: ['project'],
      reasons: {
        named: { message: 'Hours can only be booked by people staffed on the project "{{project}}". Ask its project manager to add you.' },
      },
    },
  },
  description: 'Copy the rate card\'s rates on creation, keep cost and amount to bill, and keep entries inside an open timesheet.',
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
    const HOURS_PER_DAY = 8;
    function refId(value: unknown): string {
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object' && typeof (value as Record<string, unknown>).id === 'string') {
        return String((value as Record<string, unknown>).id);
      }
      return '';
    }
    const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
    const round2 = (v: number): number => Math.round(v * 100) / 100;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;
    const input = (ctx.input ?? {}) as Record<string, unknown>;
    const previous = (ctx.previous ?? {}) as Record<string, unknown>;
    const pick = (key: string): unknown => (key in input ? input[key] : previous[key]);
    const byPerson = Boolean(ctx.user?.id);

    const sheetId = refId(pick('crm_timesheet'));
    if (!sheetId) return;
    const sheet = await api.object('crm_timesheet').findOne({
      where: { id: sheetId },
      fields: ['id', 'owner_id', 'crm_project', 'period_start', 'period_end', 'status'],
    });
    if (!sheet) return;

    // A line moved out of a submitted timesheet (a new project or date, hotcrm#2546)
    // changes that timesheet's hours as much as an edit inside it.
    const fromId = refId(previous.crm_timesheet);
    const leaving = ctx.event === 'beforeUpdate' && fromId && fromId !== sheetId
      ? await api.object('crm_timesheet').findOne({ where: { id: fromId }, fields: ['id', 'status'] })
      : null;
    if (byPerson && [sheet.status, leaving?.status].some((s) => s === 'submitted' || s === 'approved')) {
      throw refuse(
        'This timesheet has been submitted, so its hours cannot change. Send it back to Draft to correct them.',
        'RECORD_LOCKED',
        409,
      );
    }
    if (ctx.event === 'beforeDelete') return;

    // The line's project is its timesheet's (hotcrm#2546): copied when the
    // line is written into a timesheet, refused when it names another one.
    const sheetProject = refId(sheet.crm_project);
    if ('crm_project' in input && refId(input.crm_project) && refId(input.crm_project) !== sheetProject) {
      throw Object.assign(refuse(
        'The project must be this timesheet\'s project.',
        'VALIDATION_FAILED',
        400,
      ), { reason: 'project' });
    }
    if (sheetProject && refId(pick('crm_project')) !== sheetProject) input.crm_project = sheetProject;
    // The line is the timesheet person's, so My Week lists it for them
    // whoever typed it.
    const sheetOwner = refId(sheet.owner_id);
    if (sheetOwner && refId(pick('owner_id')) !== sheetOwner) input.owner_id = sheetOwner;

    const day = typeof pick('entry_date') === 'string' ? String(pick('entry_date')).slice(0, 10) : '';
    const from = typeof sheet.period_start === 'string' ? sheet.period_start.slice(0, 10) : '';
    const to = typeof sheet.period_end === 'string' ? sheet.period_end.slice(0, 10) : '';
    if (day && from && to && (day < from || day > to)) {
      throw Object.assign(refuse(
        `The date ${day} is outside this timesheet's period (${from} – ${to}).`,
        'VALIDATION_FAILED',
        400,
      ), { params: { day, from, to } });
    }

    // The task the hours went to (hotcrm#2545) is one of the timesheet's
    // project's tasks: its Actual Hours would otherwise count another
    // project's time.
    const taskId = refId(pick('crm_project_task'));
    const sheetMoved = 'crm_timesheet' in input && refId(previous.crm_timesheet) !== sheetId;
    if (taskId && ('crm_project_task' in input || sheetMoved)) {
      const task = await api.object('crm_project_task').findOne({
        where: { id: taskId },
        fields: ['id', 'crm_project'],
      });
      if (!task || refId(task.crm_project) !== refId(sheet.crm_project)) {
        throw Object.assign(refuse(
          'The task must be one of this timesheet\'s project tasks.',
          'VALIDATION_FAILED',
          400,
        ), { reason: 'task' });
      }
    }

    let costRate = num(previous.cost_rate);
    let billRate = num(previous.bill_rate);
    const moved = 'crm_timesheet' in input && refId(previous.crm_timesheet) !== '' && refId(previous.crm_timesheet) !== sheetId;
    if (ctx.event === 'beforeInsert' || moved) {
      const projectId = refId(sheet.crm_project);
      const person = refId(sheet.owner_id) || (ctx.user?.id ?? '');
      const staffing = projectId && person
        ? await api.object('crm_project_member').find({
          where: { crm_project: projectId, person },
          fields: ['id', 'rate_card', 'is_billable'],
          top: 1,
        })
        : [];
      if (staffing.length === 0) {
        if (byPerson) {
          const project = projectId
            ? await api.object('crm_project').findOne({ where: { id: projectId }, fields: ['id', 'name'] })
            : null;
          throw Object.assign(refuse(
            `Hours can only be booked by people staffed on the project${project?.name ? ` "${String(project.name)}"` : ''}. Ask its project manager to add you.`,
            'FORBIDDEN',
            403,
          ), project?.name ? { reason: 'named', params: { project: String(project.name) } } : {});
        }
        costRate = 0;
        billRate = 0;
      } else {
        const cardId = refId(staffing[0].rate_card);
        const card = cardId
          ? await api.object('crm_rate_card').findOne({ where: { id: cardId }, fields: ['id', 'cost_rate', 'bill_rate', 'unit'] })
          : null;
        const perUnit = card?.unit === 'day' ? HOURS_PER_DAY : 1;
        costRate = card ? num(card.cost_rate) / perUnit : 0;
        billRate = card && staffing[0].is_billable !== false ? num(card.bill_rate) / perUnit : 0;
      }
      input.cost_rate = round2(costRate);
      input.bill_rate = round2(billRate);
      costRate = round2(costRate);
      billRate = round2(billRate);
    }

    const hours = num(pick('hours'));
    input.cost_amount = round2(hours * costRate);
    input.bill_amount = round2(hours * billRate);
  },
};

/**
 * A line finds or creates its timesheet (hotcrm#2546, PSA phase 2b).
 *
 * A line entered with its project and date and no timesheet goes to the
 * writer's timesheet on that project whose period holds the date. When there
 * is none, a draft timesheet is created for the week that holds the date,
 * Monday to Sunday, and the line goes into it. A week across three projects
 * is entered line by line, and makes three timesheets, one per project, each
 * approved by its own project manager.
 *
 * Changing a line's project or date (inline, in My Week) moves it the same
 * way, to the line's owner's timesheet for the new project and date.
 *
 * Runs AS THE CALLER, before `time_entry_costing`: the timesheet is created as
 * the person, so it is theirs and `timesheet_stamps` judges it as their own
 * write (the approver stamp, one per period, no new timesheet on a Closed or
 * Cancelled project). Every read is keyed to the person and the project
 * (rule 10).
 *
 * One unit with the line from 18.6.0 (objectstack#34412, a8e09bb): a
 * timesheet created here is rolled back when the line is then refused (a
 * declared validation, say Hours over 24). On 18.5.0 it stayed, an empty
 * draft for that project and week. A person not staffed on the project is
 * refused before anything is created.
 */
const timeEntryTimesheet: Hook = {
  name: 'time_entry_timesheet',
  object: 'crm_time_entry',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 50,
  refusals: {
    VALIDATION_FAILED: {
      message: 'Pick the project the hours are for.',
      status: 400,
    },
    FORBIDDEN: {
      message: 'Hours can only be booked by people staffed on the project. Ask its project manager to add you.',
      status: 403,
      params: ['project'],
      reasons: {
        named: { message: 'Hours can only be booked by people staffed on the project "{{project}}". Ask its project manager to add you.' },
      },
    },
  },
  description: 'Put a line entered with its project and date into the person\'s timesheet for that project and week, creating a draft one when there is none.',
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
    const DAY_MS = 86400000;
    const api = ctx.api as HookApi | undefined;
    const input = ctx.input as Record<string, unknown> | undefined;
    if (!api || !input) return;
    const previous = (ctx.previous ?? {}) as Record<string, unknown>;
    // A line written straight into a timesheet keeps it; `time_entry_costing`
    // copies the timesheet's project onto it.
    if ('crm_timesheet' in input && refId(input.crm_timesheet)) return;

    let owner = ctx.user?.id ?? '';
    let projectId = refId(input.crm_project);
    let day = typeof input.entry_date === 'string' ? input.entry_date.slice(0, 10) : '';
    if (ctx.event === 'beforeUpdate') {
      if (!('crm_project' in input) && !('entry_date' in input)) return;
      const currentId = refId(previous.crm_timesheet);
      const current = currentId
        ? await api.object('crm_timesheet').findOne({
          where: { id: currentId },
          fields: ['id', 'owner_id', 'crm_project', 'period_start', 'period_end', 'status'],
        })
        : null;
      // A line of a submitted or approved timesheet does not move on a
      // person's write: `time_entry_costing` refuses it, so no timesheet is
      // made for it here (on 18.5.0 one would have stayed behind,
      // objectstack#34412; from 18.6.0 the refusal rolls it back).
      if (ctx.user?.id && (current?.status === 'submitted' || current?.status === 'approved')) return;
      if (!('crm_project' in input)) projectId = refId(previous.crm_project) || refId(current?.crm_project);
      if (!('entry_date' in input)) day = typeof previous.entry_date === 'string' ? previous.entry_date.slice(0, 10) : '';
      if (!projectId || !day) return;
      const from = typeof current?.period_start === 'string' ? current.period_start.slice(0, 10) : '';
      const to = typeof current?.period_end === 'string' ? current.period_end.slice(0, 10) : '';
      // Still inside its timesheet: nothing moves.
      if (current && refId(current.crm_project) === projectId && from <= day && day <= to) return;
      owner = refId(current?.owner_id) || owner;
    } else if (!projectId) {
      throw refuse('Pick the project the hours are for.', 'VALIDATION_FAILED', 400);
    }
    if (!owner || !projectId || !day) return;

    const covering = await api.object('crm_timesheet').find({
      where: { owner_id: owner, crm_project: projectId, period_start: { $lte: day }, period_end: { $gte: day } },
      fields: ['id', 'period_start'],
      top: 5,
    });
    if (covering.length > 0) {
      // The latest-starting one, should periods overlap.
      const pick = covering.reduce((a, b) => (String(b.period_start ?? '') > String(a.period_start ?? '') ? b : a));
      input.crm_timesheet = pick.id;
      return;
    }

    // Only for a person staffed on the project. `time_entry_costing` refuses
    // the line anyway; the check comes first so nothing is created for it
    // (on 18.5.0 a write a hook made before the line was refused was not
    // undone, objectstack#34412; from 18.6.0 the refusal rolls it back).
    const staffing = await api.object('crm_project_member').find({
      where: { crm_project: projectId, person: owner },
      fields: ['id'],
      top: 1,
    });
    if (staffing.length === 0) {
      const project = await api.object('crm_project').findOne({ where: { id: projectId }, fields: ['id', 'name'] });
      throw Object.assign(refuse(
        `Hours can only be booked by people staffed on the project${project?.name ? ` "${String(project.name)}"` : ''}. Ask its project manager to add you.`,
        'FORBIDDEN',
        403,
      ), project?.name ? { reason: 'named', params: { project: String(project.name) } } : {});
    }

    // The week that holds the day, Monday to Sunday (the platform's
    // `{current_week_start}` starts weeks on Monday too, so My Week's filter
    // and the timesheet agree).
    const at = Date.parse(`${day}T00:00:00Z`);
    if (!Number.isFinite(at)) return;
    const back = (new Date(at).getUTCDay() + 6) % 7;
    const monday = new Date(at - back * DAY_MS).toISOString().slice(0, 10);
    const sunday = new Date(at + (6 - back) * DAY_MS).toISOString().slice(0, 10);
    const sheet: Record<string, unknown> = { crm_project: projectId, period_start: monday, period_end: sunday, status: 'draft' };
    if (owner !== (ctx.user?.id ?? '')) sheet.owner_id = owner;
    const created = await api.object('crm_timesheet').insert(sheet) as Record<string, unknown> | null;
    if (created && created.id) input.crm_timesheet = created.id;
  },
};

export default [timeEntryTimesheet, timeEntryCosting];

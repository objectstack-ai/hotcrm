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
 *   - **A submitted or approved timesheet's entries do not change** — not
 *     added, edited or removed — on a person's write. Correcting one is
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
    VALIDATION_FAILED: { message: 'The date {{day}} is outside this timesheet\'s period ({{from}} – {{to}}).', status: 400, params: ['day', 'from', 'to'] },
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

    if (byPerson && (sheet.status === 'submitted' || sheet.status === 'approved')) {
      throw refuse(
        'This timesheet has been submitted, so its hours cannot change. Send it back to Draft to correct them.',
        'RECORD_LOCKED',
        409,
      );
    }
    if (ctx.event === 'beforeDelete') return;

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

export default [timeEntryCosting];

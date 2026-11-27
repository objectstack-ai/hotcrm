// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

/**
 * The expense report's rules (REQ-0011, hotcrm#2559).
 *
 *   - **The approval decides.** A person who sets Approved or Rejected is
 *     refused; the report's approval writes them (an administrator may, to
 *     repair a report whose approval cannot run).
 *   - **Finance marks it paid**, and only once it is approved: Mark as Paid
 *     (`../actions/expense.actions.ts`) judges the caller and writes as the
 *     system, so a person setting Paid themselves is refused. The date
 *     defaults to today. Nothing is paid out from here; the mark records that
 *     it was.
 *   - **A report is sent with its expenses.** Submitting one with none is
 *     refused.
 *   - **A decided report stays as decided.** A person changes nothing on an
 *     approved or paid report; Mark as Paid is the one move left.
 *   - **Only a draft report is deleted**, and its expenses go back to being
 *     free, so they can be submitted again. An administrator may delete a
 *     report waiting for approval or rejected, to repair; its expenses go back
 *     to Draft with it (hotcrm#2761): an expense's status follows its report,
 *     and with no report there is nothing left for Submitted to follow.
 *   - **An approved or paid report is never deleted by a person,
 *     administrators included** (maintainer ruling on hotcrm#2761): the
 *     administrator's repair is for a report whose approval cannot run, and
 *     an approved or paid report's approval has already run. Deleting one
 *     would leave its expenses Approved on no report, still in the project's
 *     cost and never to be submitted again.
 *   - It stamps when the report was submitted and approved.
 *
 * Judged on a person's write; the approval, Submit for Reimbursement and an
 * import write as the platform. `runAs: 'system'` so the expense count and
 * the release on delete read and write every expense of the report whoever
 * writes; every read is keyed to this report's id (rule 10).
 */
const expenseReportRules: Hook = {
  name: 'expense_report_rules',
  object: 'crm_expense_report',
  events: ['beforeInsert', 'beforeUpdate', 'beforeDelete'],
  priority: 100,
  runAs: 'system',
  refusals: {
    FORBIDDEN: {
      message: 'An expense report is approved or rejected by its approvers, from their Inbox, once it is submitted.',
      status: 403,
      reasons: {
        decide: { message: 'An expense report is approved or rejected by its approvers, from their Inbox, once it is submitted.' },
        pay: { message: 'An expense report is marked as paid by finance, with Mark as Paid, once it is approved.' },
      },
    },
    VALIDATION_FAILED: {
      message: 'Add an expense to this report before submitting it.',
      status: 400,
      params: ['name'],
      reasons: {
        no_expenses: { message: 'Add an expense to {{name}} before submitting it.' },
      },
    },
    RECORD_LOCKED: {
      message: 'This expense report can no longer be changed.',
      status: 409,
      params: ['name'],
      reasons: {
        approved: { message: 'Expense report {{name}} is approved, so it can no longer be changed. Finance marks it as paid.' },
        paid: { message: 'Expense report {{name}} is paid, so it can no longer be changed.' },
        delete: { message: 'Only a draft expense report can be deleted. Expense report {{name}} has been submitted.' },
        delete_approved: { message: 'Expense report {{name}} is approved, so it cannot be deleted: an approved or paid report stays on record.' },
        delete_paid: { message: 'Expense report {{name}} is paid, so it cannot be deleted: an approved or paid report stays on record.' },
      },
    },
  },
  description: 'Leave the decision on an expense report to its approval and its payment mark to finance, refuse a report sent with no expenses, keep a decided report as decided and on record, and release the expenses of a deleted report, back to Draft when it was waiting for approval or rejected.',
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
    const api = ctx.api as HookApi | undefined;
    const input = (ctx.input ?? {}) as Record<string, unknown>;
    const previous = (ctx.previous ?? {}) as Record<string, unknown>;
    const person = Boolean(ctx.user?.id) && !ctx.session?.isSystem;
    const ADMIN_IDENTITIES = ['platform_admin', 'org_owner', 'org_admin'];
    const admin = ((ctx.session?.positions ?? []) as string[]).some((p) => ADMIN_IDENTITIES.includes(p));
    const id = String(previous.id ?? input.id ?? '');
    const name = String(input.name ?? previous.name ?? 'This report');
    const was = String(previous.status ?? 'draft');

    if (ctx.event === 'beforeDelete') {
      // An approved or paid report stays on record: no person deletes it,
      // administrators included (maintainer ruling on hotcrm#2761). The
      // administrator's exemption below is for a report whose approval cannot
      // run; this one's has run. A write with no person on it (a system job)
      // is not judged here, as before.
      if (person && was === 'approved') {
        throw Object.assign(refuse(
          `Expense report ${name} is approved, so it cannot be deleted: an approved or paid report stays on record.`,
          'RECORD_LOCKED',
          409,
        ), { reason: 'delete_approved', params: { name } });
      }
      if (person && was === 'paid') {
        throw Object.assign(refuse(
          `Expense report ${name} is paid, so it cannot be deleted: an approved or paid report stays on record.`,
          'RECORD_LOCKED',
          409,
        ), { reason: 'delete_paid', params: { name } });
      }
      if (person && !admin && was !== 'draft') {
        throw Object.assign(refuse(
          `Only a draft expense report can be deleted. Expense report ${name} has been submitted.`,
          'RECORD_LOCKED',
          409,
        ), { reason: 'delete', params: { name } });
      }
      if (!api || !id) return;
      // The released expenses go back to Draft when the report was waiting for
      // approval or rejected (hotcrm#2761): `expense_report_lines_follow` would
      // have moved them there had the report gone back to Draft first, and it
      // moves the status alone, so this does too. Only a write with no person
      // on it reaches here for an approved or paid report (a person is refused
      // above); its expenses are left Approved, as they were before the ruling,
      // which did not decide the system's delete.
      const backToDraft = was === 'submitted' || was === 'rejected';
      const lines = await api.object('crm_expense').find({ where: { crm_expense_report: id }, fields: ['id', 'status'], top: 500 });
      for (const line of lines) {
        const patch: Record<string, unknown> = { crm_expense_report: null };
        if (backToDraft && line.status !== 'draft') patch.status = 'draft';
        await api.object('crm_expense').update({ id: String(line.id), ...patch }, { where: { id: String(line.id) } });
      }
      return;
    }

    const status = 'status' in input ? String(input.status ?? '') : was;
    const moving = ctx.event === 'beforeInsert' ? status !== 'draft' : status !== was;

    if (person && !admin) {
      // Fields the platform or this hook writes are not a person's change.
      const DERIVED = ['id', 'created_at', 'created_by', 'updated_at', 'updated_by', 'report_number',
        'total_amount', 'reimbursable_amount', 'approver', 'submitted_date', 'approved_date',
        'request_estimated_amount', 'request_reported_amount', 'request_over_estimate'];
      const same = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
      const changed = Object.keys(input).filter((k) => !DERIVED.includes(k) && !same(input[k], previous[k]));
      if (moving && (status === 'approved' || status === 'rejected')) {
        throw Object.assign(refuse(
          'An expense report is approved or rejected by its approvers, from their Inbox, once it is submitted.',
          'FORBIDDEN',
          403,
        ), { reason: 'decide' });
      }
      if (moving && status === 'paid') {
        throw Object.assign(refuse(
          'An expense report is marked as paid by finance, with Mark as Paid, once it is approved.',
          'FORBIDDEN',
          403,
        ), { reason: 'pay' });
      }
      if (ctx.event === 'beforeUpdate' && was === 'approved' && changed.length) {
        throw Object.assign(refuse(
          `Expense report ${name} is approved, so it can no longer be changed. Finance marks it as paid.`,
          'RECORD_LOCKED',
          409,
        ), { reason: 'approved', params: { name } });
      }
      if (ctx.event === 'beforeUpdate' && was === 'paid' && changed.length) {
        throw Object.assign(refuse(
          `Expense report ${name} is paid, so it can no longer be changed.`,
          'RECORD_LOCKED',
          409,
        ), { reason: 'paid', params: { name } });
      }
    }

    if (moving && status === 'submitted') {
      const lines = api && id
        ? await api.object('crm_expense').find({ where: { crm_expense_report: id }, fields: ['id'], top: 1 })
        : [];
      if (!lines.length) {
        throw Object.assign(refuse(
          `Add an expense to ${name} before submitting it.`,
          'VALIDATION_FAILED',
          400,
        ), { reason: 'no_expenses', params: { name } });
      }
      input.submitted_date = new Date().toISOString();
    }
    if (moving && status === 'approved') input.approved_date = new Date().toISOString();
    if (moving && status === 'paid' && !input.payment_date && !previous.payment_date) {
      input.payment_date = new Date().toISOString().slice(0, 10);
    }
  },
};

/**
 * Each expense on a report follows it (hotcrm#2559): Submitted, Approved or
 * Rejected with the report, and back to Draft when the report is recalled,
 * turned back or reopened to be corrected. A paid report leaves its expenses
 * Approved, which is what a project's cost counts. The approver the report's
 * approval names is copied onto each expense, so the approver can open the
 * expenses they decide (`expense_approver_edit`).
 *
 * `runAs: 'system'`: an expense's status and approver are read-only to
 * people, and the approval writes the report as the platform. Every read is
 * keyed to this report's id (rule 10). It writes only what differs.
 */
const expenseReportLinesFollow: Hook = {
  name: 'expense_report_lines_follow',
  object: 'crm_expense_report',
  events: ['afterUpdate'],
  priority: 100,
  runAs: 'system',
  description: 'Move each expense on the report to the report\'s status, and give it the report\'s approver.',
  handler: async (ctx: HookContext) => {
    const api = ctx.api as HookApi | undefined;
    const input = (ctx.input ?? {}) as Record<string, unknown>;
    const previous = (ctx.previous ?? {}) as Record<string, unknown>;
    if (!api) return;
    const id = String(previous.id ?? input.id ?? '');
    if (!id) return;
    const statusMoved = 'status' in input && input.status !== previous.status;
    const approverMoved = 'approver' in input && input.approver !== previous.approver;
    if (!statusMoved && !approverMoved) return;
    const FOLLOW: Record<string, string> = { draft: 'draft', submitted: 'submitted', approved: 'approved', rejected: 'rejected' };
    const target = statusMoved ? FOLLOW[String(input.status)] : undefined;
    const approver = approverMoved ? (input.approver ?? null) : undefined;
    const lines = await api.object('crm_expense').find({
      where: { crm_expense_report: id },
      fields: ['id', 'status', 'approver'],
      top: 500,
    });
    for (const line of lines) {
      const patch: Record<string, unknown> = {};
      if (target && line.status !== target) patch.status = target;
      if (approver !== undefined && line.approver !== approver) patch.approver = approver;
      if (!Object.keys(patch).length) continue;
      await api.object('crm_expense').update({ id: String(line.id), ...patch }, { where: { id: String(line.id) } });
    }
  },
};

/**
 * A report read against its travel request (F3c, hotcrm#2580).
 *
 *   - **The amounts on the report.** Every report of a request carries the
 *     request's estimate and the totals of its reports in review, approved or
 *     paid (`request_estimated_amount`, `request_reported_amount`), so a
 *     report's approver sees them whether or not they may open the request.
 *     Refreshed on every report of the request whenever one of them is
 *     created, changes status, or changes request: a report's total cannot
 *     change while it counts, because its expenses are held from Submitted on
 *     (`expense_line_lock`), and an approved request's estimate is locked.
 *     The request's own Reported Amount is a platform summary of the same
 *     reports.
 *   - **The last paid report closes the trip.** When a report is marked paid
 *     and no other report of its request is still Draft, Submitted or
 *     Approved, an Approved request becomes Closed. A Rejected report does
 *     not hold it open (the card names the three).
 *
 * Nothing here refuses: an approver can approve a report over the estimate
 * (AGENTS.md rule 8). That a cancelled or closed request takes no new report
 * is judged where reports are made, in Submit for a Trip.
 *
 * `runAs: 'system'`: the report's amounts are read-only to people, a request
 * is private to its traveler, and Paid is written by Mark as Paid as the
 * system. Every read is keyed to one request's id (rule 10). It writes only
 * what differs, so the writes it makes on sibling reports (no status or
 * request change) return here at once.
 */
const expenseReportRequestTotals: Hook = {
  name: 'expense_report_request_totals',
  object: 'crm_expense_report',
  events: ['afterInsert', 'afterUpdate'],
  priority: 110,
  runAs: 'system',
  description: 'Give every report of a travel request the request\'s estimate and reported amount, and close an approved request when its last open report is paid.',
  handler: async (ctx: HookContext) => {
    const api = ctx.api as HookApi | undefined;
    if (!api) return;
    const input = (ctx.input ?? {}) as Record<string, unknown>;
    const previous = (ctx.previous ?? {}) as Record<string, unknown>;
    const result = (ctx.result ?? {}) as Record<string, unknown>;
    const refOf = (v: unknown): string => (v && typeof v === 'object' ? String((v as { id?: unknown }).id ?? '') : String(v ?? ''));
    const inserted = ctx.event === 'afterInsert';
    const id = String(previous.id ?? input.id ?? result.id ?? '');
    const requestWas = inserted ? '' : refOf(previous.crm_expense_request);
    const requestNow = 'crm_expense_request' in input ? refOf(input.crm_expense_request) : requestWas;
    const statusWas = inserted ? '' : String(previous.status ?? '');
    const statusNow = 'status' in input ? String(input.status ?? '') : statusWas;
    const statusMoved = inserted || statusNow !== statusWas;
    if (!statusMoved && requestNow === requestWas) return;

    const COUNTED = ['submitted', 'approved', 'paid'];
    const OPEN = ['draft', 'submitted', 'approved'];
    for (const requestId of [...new Set([requestNow, requestWas])].filter(Boolean)) {
      const request = await api.object('crm_expense_request').findOne({
        where: { id: requestId },
        fields: ['id', 'status', 'estimated_amount'],
      });
      if (!request) continue;
      const reports = await api.object('crm_expense_report').find({
        where: { crm_expense_request: requestId },
        fields: ['id', 'status', 'total_amount', 'request_estimated_amount', 'request_reported_amount'],
        top: 500,
      });
      const money = (v: unknown): number => Math.round(Number(v ?? 0) * 100) / 100;
      const estimate = request.estimated_amount == null ? null : money(request.estimated_amount);
      const reported = money(reports
        .filter((r) => COUNTED.includes(String(r.status)))
        .reduce((sum, r) => sum + Number(r.total_amount ?? 0), 0));
      for (const r of reports) {
        const patch: Record<string, unknown> = {};
        if ((r.request_estimated_amount == null ? null : money(r.request_estimated_amount)) !== estimate) patch.request_estimated_amount = estimate;
        if ((r.request_reported_amount == null ? null : money(r.request_reported_amount)) !== reported) patch.request_reported_amount = reported;
        if (!Object.keys(patch).length) continue;
        await api.object('crm_expense_report').update({ id: String(r.id), ...patch }, { where: { id: String(r.id) } });
      }
      // A report that leaves a request no longer reads it.
      if (requestId === requestWas && requestId !== requestNow && id) {
        await api.object('crm_expense_report').update(
          { id, request_estimated_amount: null, request_reported_amount: null },
          { where: { id } },
        );
      }
      if (requestId === requestNow && statusMoved && statusNow === 'paid' && request.status === 'approved'
        && !reports.some((r) => String(r.id) !== id && OPEN.includes(String(r.status)))) {
        await api.object('crm_expense_request').update({ id: requestId, status: 'closed' }, { where: { id: requestId } });
      }
    }
  },
};

export default [expenseReportRules, expenseReportLinesFollow, expenseReportRequestTotals];

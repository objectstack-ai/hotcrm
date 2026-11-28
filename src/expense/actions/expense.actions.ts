// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * The body both submit actions run (hotcrm#2559, #2580): Submit for
 * Reimbursement sends no travel request, Submit for a Trip sends the one the
 * person picked as `input.crm_expense_request`.
 */
const SUBMIT_FOR_REIMBURSEMENT_SOURCE = `
      const userId = ctx.session && ctx.session.userId ? String(ctx.session.userId) : '';
      if (!userId) throw new Error('submit_for_reimbursement needs a signed-in person');
      const selected = Array.isArray(input._selectedIds) ? input._selectedIds : [];
      const ids = selected.length ? selected : (ctx.recordId ? [ctx.recordId] : []);
      const fail = (lines, code, status) => {
        const err = new Error(lines.join(' '));
        err.code = code;
        err.status = status;
        err.userMessage = lines.join('\\n');
        return err;
      };
      if (!ids.length) throw fail(['Select the expenses to submit for reimbursement.'], 'VALIDATION_FAILED', 400);
      const refOf = (v) => (v && typeof v === 'object' ? String(v.id || '') : String(v || ''));
      const E = ctx.api.object('crm_expense');
      const R = ctx.api.object('crm_expense_report');
      const taken = [];
      const problems = [];
      let unseen = 0;
      for (const id of ids) {
        let row = null;
        try { row = await E.findOne({ where: { id: id } }); } catch (e) { row = null; }
        if (!row || refOf(row.owner_id) !== userId) { unseen++; continue; }
        const name = String(row.name || '');
        if (refOf(row.crm_expense_report)) {
          problems.push('Expense ' + name + ' is already on an expense report.');
        } else if (row.status === 'approved') {
          problems.push('Expense ' + name + ' is already approved.');
        } else {
          taken.push(row);
        }
      }
      // The travel request these expenses were spent on (F3c, hotcrm#2580):
      // only Submit for a Trip sends one. It must be the caller's own and
      // Approved: a cancelled or closed request takes no new report. Judged
      // here because the bulk bar's picker is the only filter in front of it.
      const requestId = refOf(input.crm_expense_request);
      let request = null;
      if (requestId) {
        try {
          request = await ctx.api.object('crm_expense_request').findOne({
            where: { id: requestId },
            fields: ['id', 'name', 'request_number', 'owner_id', 'status'],
          });
        } catch (e) { request = null; }
        const label = request ? 'Travel request ' + String(request.request_number || request.name || '') : '';
        if (!request || refOf(request.owner_id) !== userId) {
          problems.push('The travel request chosen is not yours, or no longer exists.');
        } else if (request.status === 'cancelled' || request.status === 'closed') {
          problems.push(label + ' is ' + request.status + ', so it takes no new expense report.');
        } else if (request.status !== 'approved') {
          problems.push(label + ' is not approved yet. Only an approved travel request can be reported against.');
        }
      }
      if (unseen) {
        problems.push(unseen === 1
          ? '1 selected expense is not yours, or no longer exists.'
          : unseen + ' selected expenses are not yours, or no longer exist.');
      }
      if (problems.length) {
        problems.push('Nothing was submitted.');
        throw fail(problems, 'VALIDATION_FAILED', 400);
      }
      // One group per project, and one for the expenses with none.
      const groups = new Map();
      for (const row of taken) {
        const key = refOf(row.crm_project);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
      }
      const reports = [];
      for (const [project, rows] of groups) {
        const days = rows.map((r) => String(r.expense_date || '').slice(0, 10)).filter(Boolean).sort();
        const title = days.length
          ? (days[0] === days[days.length - 1] ? days[0] : days[0] + ' – ' + days[days.length - 1])
          : new Date().toISOString().slice(0, 10);
        const doc = { name: title, owner_id: userId, status: 'draft' };
        if (project) doc.crm_project = project;
        if (request) doc.crm_expense_request = String(request.id);
        const report = await R.insert(doc);
        for (const row of rows) {
          const patch = { id: String(row.id), crm_expense_report: String(report.id) };
          if (row.status !== 'draft') patch.status = 'draft';
          // A row written before Paid By existed reads empty: it was the
          // employee's, as every expense was then, and is paid back.
          if (!row.paid_by) patch.paid_by = 'employee';
          await E.update(patch, { where: { id: String(row.id) } });
        }
        await R.update({ id: String(report.id), status: 'submitted' }, { where: { id: String(report.id) } });
        reports.push(String(report.id));
      }
      return { id: reports[0], reports: reports, count: reports.length };
`;

/**
 * Submit for Reimbursement (REQ-0011, hotcrm#2559): the person's selected
 * expenses go on an expense report, which is submitted in the same click.
 * Reporting a single expense is the same click from its record page.
 *
 * **One report per project.** The expenses of each project go on a report of
 * their own, which names the project, and the rest on one report with no
 * project, so nobody splits a trip by hand and each project manager decides
 * only their project's spend (`src/psa/flows/expense-report-project-approval.flow.ts`).
 * This package knows nothing of projects: the action groups by the
 * expense's `crm_project` value when the record carries one, which it does
 * only while Project Delivery contributes the field
 * (`src/psa/extensions/expense-project.extension.ts`, which contributes the
 * same field on the report). With Project Delivery disabled no record
 * carries it, and every selection makes one report (measured,
 * `test/expense-module.test.ts`).
 *
 * **What it takes.** Each selected expense must be the caller's own, on no
 * report yet, and not approved. A Draft one is the usual case. A Submitted or
 * Rejected one with no report can only be left from the per-expense approval
 * this card retired: it is set back to Draft and reported like the rest, so
 * an expense stranded by the upgrade reaches a report without a hand edit
 * (the upgrade note in the changeset). Any problem refuses the whole
 * selection before anything is written, naming each expense.
 *
 * **Why a script.** It creates records and links them, so it runs as the
 * system (`body` docs on `Action`), and judges the caller itself: the
 * caller's id comes from `ctx.session.userId`, and only the caller's own
 * expenses are taken. The report is created as a draft, the expenses are put
 * on it, and then it is submitted, so the report's own rules
 * (`expense_report_rules`) and its approval run as for a report submitted by
 * hand.
 *
 * Both dispatch shapes: the selection bar of My Expenses dispatches once for
 * the selection (`params._selectedIds`, `../views/expense.view.ts`), the
 * record page once for its record (`recordId`). ⛔ Never declare a
 * `selectedIds` param (`src/sales/actions/lead.actions.ts` says why).
 *
 * The title is the expenses' date range, which reads the same in every
 * language (a script body is given no locale on 18.5.0).
 */
export const SubmitForReimbursementAction: Action = {
  name: 'submit_for_reimbursement',
  label: 'Submit for Reimbursement',
  objectName: 'crm_expense',
  icon: 'send',
  type: 'script',
  body: {
    language: 'js',
    source: SUBMIT_FOR_REIMBURSEMENT_SOURCE,
    capabilities: ['api.read', 'api.write'],
    timeoutMs: 20000,
  },
  // The record page of one expense; the selection bar of My Expenses names
  // it in its own `bulkActionDefs`.
  locations: ['record_page'],
  variant: 'primary',
  visible: P`has(record.owner_id) && record.owner_id == current_user.id
    && (!has(record.crm_expense_report) || record.crm_expense_report == null || record.crm_expense_report == "")
    && has(record.status) && record.status != "approved"`,
  successMessage: 'Submitted for reimbursement. Follow it in My Reports.',
  refreshAfter: true,
  // F4b (hotcrm#2617): opened to an assistant acting as the spender. It sends
  // expenses to an approver, so the client is told to ask first.
  ai: {
    exposed: true,
    requiresConfirmation: true,
    description: 'Submits the selected expenses (params._selectedIds, or the recordId of one) for reimbursement: puts them on one expense report per project and sends each report for approval. Only the caller\'s own expenses that are on no report and not approved. Ask the person before running it.',
  },
};

/**
 * Submit for a Trip (F3c, hotcrm#2580): Submit for Reimbursement for the
 * expenses of one approved travel request. The same body
 * (`SUBMIT_FOR_REIMBURSEMENT_SOURCE`), the same grouping and checks; the
 * person also picks the request, and every report it makes cites it.
 *
 * **Why a second action and not an optional param.** On 18.5.0 an action
 * with any param, even an optional one, opens its param dialog every time
 * (measured: the record header shows the picker and Confirm, the selection
 * bar the picker and Next). A request param on Submit for Reimbursement would
 * add that dialog to every expense with no trip, which REQ-0011 F3c forbids.
 * So Submit for Reimbursement keeps its one click, and a trip costs the
 * dialog it needs anyway.
 *
 * **The picker** is the report's own `crm_expense_request` field, so it
 * offers the caller's own Approved requests (its `lookupFilters`; both the
 * record header's and the selection bar's dialogs apply them, measured). The
 * body checks the request again, because a REST caller passes no picker.
 */
export const SubmitTripForReimbursementAction: Action = {
  name: 'submit_trip_for_reimbursement',
  label: 'Submit for a Trip',
  objectName: 'crm_expense',
  icon: 'plane',
  type: 'script',
  description: 'Report these expenses against one of your approved travel requests.',
  submitText: 'Submit',
  body: {
    language: 'js',
    source: SUBMIT_FOR_REIMBURSEMENT_SOURCE,
    capabilities: ['api.read', 'api.write'],
    timeoutMs: 20000,
  },
  params: [
    {
      field: 'crm_expense_request',
      objectOverride: 'crm_expense_report',
      required: true,
      helpText: 'Your approved travel request these expenses were spent on.',
    },
  ],
  locations: ['record_page'],
  visible: SubmitForReimbursementAction.visible,
  successMessage: 'Submitted for reimbursement against the travel request. Follow it in My Reports.',
  refreshAfter: true,
  // F4b (hotcrm#2617): as Submit for Reimbursement, against one approved
  // travel request (params.crm_expense_request).
  ai: {
    exposed: true,
    requiresConfirmation: true,
    description: 'Submits the selected expenses for reimbursement against one of the caller\'s approved travel requests (params.crm_expense_request), the same way as Submit for Reimbursement; every report it makes cites the request. Ask the person before running it.',
  },
};

/**
 * Submit an expense report again (hotcrm#2559): one recalled, turned back or
 * reopened after a rejection. A declarative update, so it writes AS THE
 * CALLER, as setting the status in the form would: `expense_report_rules`
 * judges it (a report with no expenses is refused) and the status change
 * starts the report's approval.
 */
export const SubmitExpenseReportAction: Action = {
  name: 'submit_expense_report',
  label: 'Submit',
  objectName: 'crm_expense_report',
  icon: 'send',
  operation: 'update',
  patch: { status: 'submitted' },
  locations: ['record'],
  variant: 'primary',
  visible: P`has(record.status) && record.status == "draft" && has(record.owner_id) && record.owner_id == current_user.id`,
  successMessage: 'Expense report {{ record.name }} submitted for approval.',
  refreshAfter: true,
  // F4b (hotcrm#2617): sends a Draft report to its approver again.
  ai: {
    exposed: true,
    requiresConfirmation: true,
    description: 'Sends one of the caller\'s Draft expense reports (recalled, or reopened after a rejection) for approval again. Ask the person before running it.',
  },
};

/**
 * Reopen a rejected report to correct it (hotcrm#2559): back to Draft, its
 * expenses with it, so they can be changed and the report sent again.
 */
export const ReopenExpenseReportAction: Action = {
  name: 'reopen_expense_report',
  label: 'Back to Draft',
  objectName: 'crm_expense_report',
  icon: 'undo-2',
  operation: 'update',
  patch: { status: 'draft' },
  locations: ['record'],
  visible: P`has(record.status) && record.status == "rejected" && has(record.owner_id) && record.owner_id == current_user.id`,
  successMessage: 'Expense report {{ record.name }} is back in Draft.',
  refreshAfter: true,
  // F4b (hotcrm#2617): additive and reversible (the report is sent again with
  // Submit), so no confirmation flag.
  ai: {
    exposed: true,
    description: 'Moves one of the caller\'s Rejected expense reports back to Draft, with its expenses, so they can be corrected and the report submitted again.',
  },
};

/**
 * Mark as Paid (hotcrm#2559): finance records that the employee was paid back
 * for an approved report, with the date and the payment's reference. It
 * records only: no money moves and nothing is posted from here.
 *
 * A script, so finance needs no edit right on other people's reports: the
 * grants on the report follow the expense's (finance reads every one). The
 * body judges the caller itself — a Finance Controller or AR Accountant (or
 * an administrator), on an approved report — and writes as the system;
 * `expense_report_rules` refuses Paid from anyone else.
 *
 * Each refusal is a code declared under `refusals` (hotcrm#2763), so the
 * person reads it in their own language: the catalogue holds the sentence and
 * the status, the packs under `translations/` hold the other languages, and
 * the body throws the code (with the report's name where the sentence names
 * it). The message given to `new Error` is for the server log only. A throw
 * whose code is not declared here answers 500, so a new refusal is added to
 * the catalogue and to every pack first. `RECORD_NOT_FOUND` is the race
 * guard: the platform loads the report under the caller's access before the
 * body runs and answers a missing one itself, so the body's own sentence is
 * read only when the report is deleted in between.
 */
export const MarkExpenseReportPaidAction: Action = {
  name: 'mark_expense_report_paid',
  label: 'Mark as Paid',
  objectName: 'crm_expense_report',
  icon: 'banknote',
  type: 'script',
  body: {
    language: 'js',
    source: `
      const positions = (ctx.session && Array.isArray(ctx.session.positions)) ? ctx.session.positions : [];
      const ALLOWED = ['crm_finance_controller', 'crm_ar_accountant', 'platform_admin', 'org_owner', 'org_admin'];
      if (!positions.some((p) => ALLOWED.includes(p))) {
        throw Object.assign(new Error('mark_expense_report_paid: the caller is not finance'), { code: 'FORBIDDEN' });
      }
      const id = ctx.recordId ? String(ctx.recordId) : '';
      if (!id) throw Object.assign(new Error('mark_expense_report_paid: no report was given'), { code: 'VALIDATION_FAILED' });
      const R = ctx.api.object('crm_expense_report');
      const report = await R.findOne({ where: { id: id }, fields: ['id', 'name', 'status'] });
      if (!report) throw Object.assign(new Error('mark_expense_report_paid: the report is gone'), { code: 'RECORD_NOT_FOUND' });
      if (report.status !== 'approved') {
        throw Object.assign(new Error('mark_expense_report_paid: the report is not approved'), { code: 'CONFLICT', params: { name: String(report.name || '') } });
      }
      const day = input.payment_date ? String(input.payment_date).slice(0, 10) : new Date().toISOString().slice(0, 10);
      const reference = input.payment_reference ? String(input.payment_reference) : null;
      await R.update({ id: id, status: 'paid', payment_date: day, payment_reference: reference }, { where: { id: id } });
      return { id: id, payment_date: day };
    `,
    capabilities: ['api.read', 'api.write'],
    timeoutMs: 10000,
  },
  refusals: {
    FORBIDDEN: {
      message: 'Only finance marks an expense report as paid, once it is approved.',
      status: 403,
    },
    VALIDATION_FAILED: {
      message: 'Open the expense report to mark it as paid.',
      status: 400,
    },
    RECORD_NOT_FOUND: {
      message: 'This expense report no longer exists.',
      status: 404,
    },
    CONFLICT: {
      message: 'Only an approved expense report is marked as paid. Expense report {{name}} is not approved.',
      status: 409,
      params: ['name'],
    },
  },
  params: [
    { name: 'payment_date', label: 'Paid On', type: 'date', required: true },
    { name: 'payment_reference', label: 'Payment Reference', type: 'text', required: false },
  ],
  locations: ['record'],
  variant: 'primary',
  visible: P`has(record.status) && record.status == "approved"
    && ("crm_finance_controller" in current_user.positions || "crm_ar_accountant" in current_user.positions)`,
  successMessage: 'Expense report {{ record.name }} marked as paid.',
  refreshAfter: true,
};

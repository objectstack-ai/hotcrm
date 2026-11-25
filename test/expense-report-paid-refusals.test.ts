// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import stack, { packFor } from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, systemUpdate, type Person } from './helpers/verify-stack';

/**
 * Mark as Paid refuses in the caller's language (hotcrm#2763).
 *
 * Measured on 18.6.0 at `48082b7d` before this change, at
 * `POST /api/v1/actions/crm_expense_report/mark_expense_report_paid`: the three
 * refusals a person can meet answered a zh-CN caller in English — 403 "Only
 * finance marks an expense report as paid, once it is approved.", 400 "Open the
 * expense report to mark it as paid." and 409 "Only an approved expense report
 * is marked as paid. Expense report 2026-11-02 is not approved." The action
 * threw the sentences as literals, so no pack could reach them.
 *
 * Now each refusal is a code in the action's `refusals` catalogue, with a row
 * in every pack. Same status, same code and same English as before; a zh-CN,
 * ja-JP or es-ES caller reads their own language.
 *
 * The fourth sentence, "This expense report no longer exists.", is a race
 * guard. The platform loads the report under the caller's access before the
 * body runs and answers a missing one itself (its own 404, already in the
 * caller's language), so the body's sentence is read only when the report is
 * deleted between that load and the body's read. The case below stages exactly
 * that on the real engine. On the shipped app booted by `@objectstack/verify`.
 */

type Rec = Record<string, any>;
let verify: VerifyStack;
let manager: Person;
let spender: Person;
let finance: Person;
let k = 0;

const ACTION = 'mark_expense_report_paid';
const CODES = ['FORBIDDEN', 'VALIDATION_FAILED', 'RECORD_NOT_FOUND', 'CONFLICT'] as const;
const PACKS = ['zh-CN', 'ja-JP', 'es-ES'] as const;

beforeAll(async () => {
  verify = await hotcrmStack();
  manager = await signUpPerson(verify, 'manager@expense-report-paid-refusals.test', {
    name: 'Paid Manager', positions: ['crm_sales_manager'], permissionSets: ['sales_manager'],
  });
  spender = await signUpPerson(verify, 'spender@expense-report-paid-refusals.test', {
    name: 'Paid Spender', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
  finance = await signUpPerson(verify, 'finance@expense-report-paid-refusals.test', {
    name: 'Paid Finance', positions: ['crm_finance_controller'], permissionSets: ['finance_controller'],
  });
  await systemUpdate(verify, 'sys_user', { id: spender.id, manager_id: manager.id });
}, 180_000);

/** The button on the report, and REST: this one request, in the caller's language. */
const markPaid = async (as: Person, locale: string, recordId?: string) => {
  const params = { payment_date: '2026-11-20', payment_reference: 'TRF-2763' };
  const res = await verify.raw(`/api/v1/actions/crm_expense_report/${ACTION}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${as.token}`, 'accept-language': locale },
    body: JSON.stringify(recordId ? { recordId, params } : { params }),
  });
  const body = (await res.json()) as Rec;
  const error = (body.error ?? {}) as Rec;
  return { status: res.status, code: error.code as string | undefined, message: error.message as string | undefined, userMessage: error.userMessage as string | undefined, body };
};
const report = async (id: string): Promise<Rec> => (await verify.rows('crm_expense_report', { id }))[0]!;
const decide = async (reportId: string, as: Person, action: 'approve' | 'recall'): Promise<void> => {
  const [request] = await verify.rows('sys_approval_request', { record_id: reportId, status: 'pending' });
  expect(request, `no open approval request on ${reportId}`).toBeTruthy();
  const res = await verify.apiAs(as.token, 'POST', `/approvals/requests/${request!.id}/${action}`, { comment: `${action} in test.` });
  expect(res.status, await res.clone().text()).toBe(200);
};
/** The spender's report of one taxi fare, waiting for the manager. */
const submitted = async (): Promise<Rec> => {
  const expense = (await verify.hooks.run('crm_expense', 'insert', {
    name: `Taxi ${++k}`, expense_date: '2026-11-02', category: 'travel', amount: 40,
  }, { as: spender.token })) as Rec;
  const result = (await verify.actions.run('crm_expense', 'submit_for_reimbursement', { as: spender.token, recordId: expense.id })) as Rec;
  return report((result.reports as string[])[0]!);
};
const approved = async (): Promise<Rec> => {
  const made = await submitted();
  await decide(made.id, manager, 'approve');
  return report(made.id);
};
const packRow = (locale: string, code: string): string =>
  (packFor(locale) as Rec).objects.crm_expense_report._actions[ACTION].refusals[code].message as string;

describe('each refusal, in English and in Chinese (hotcrm#2763)', () => {
  it('someone who is not finance: 403, and the approved report stays unpaid', async () => {
    const made = await approved();
    const english = await markPaid(spender, 'en', made.id);
    expect([english.status, english.code], JSON.stringify(english.body)).toEqual([403, 'FORBIDDEN']);
    expect(english.message).toBe('Only finance marks an expense report as paid, once it is approved.');
    const chinese = await markPaid(spender, 'zh-CN', made.id);
    expect([chinese.status, chinese.code], JSON.stringify(chinese.body)).toEqual([403, 'FORBIDDEN']);
    expect(chinese.message).toBe('报销单获批准后，只有财务可以把它标记为已付款。');
    expect(chinese.userMessage, 'the sentence the console shows').toBe(chinese.message);
    expect(await report(made.id)).toMatchObject({ status: 'approved', payment_date: null, payment_reference: null });
  });

  it('no report given: 400', async () => {
    const english = await markPaid(finance, 'en');
    expect([english.status, english.code], JSON.stringify(english.body)).toEqual([400, 'VALIDATION_FAILED']);
    expect(english.message).toBe('Open the expense report to mark it as paid.');
    const chinese = await markPaid(finance, 'zh-CN');
    expect([chinese.status, chinese.code], JSON.stringify(chinese.body)).toEqual([400, 'VALIDATION_FAILED']);
    expect(chinese.message).toBe('请打开报销单，再标记为已付款。');
    expect(chinese.userMessage).toBe(chinese.message);
  });

  it('a report still waiting for its approver: 409 naming the report, and it stays submitted', async () => {
    const made = await submitted();
    expect(made.name, 'the report has a name to put in the sentence').toBeTruthy();
    const english = await markPaid(finance, 'en', made.id);
    expect([english.status, english.code], JSON.stringify(english.body)).toEqual([409, 'CONFLICT']);
    expect(english.message).toBe(`Only an approved expense report is marked as paid. Expense report ${made.name} is not approved.`);
    const chinese = await markPaid(finance, 'zh-CN', made.id);
    expect([chinese.status, chinese.code], JSON.stringify(chinese.body)).toEqual([409, 'CONFLICT']);
    expect(chinese.message).toBe(`只有已批准的报销单可以标记为已付款。报销单${made.name}不是已批准状态。`);
    expect(chinese.userMessage).toBe(chinese.message);
    expect(await report(made.id)).toMatchObject({ status: 'submitted', payment_date: null });
  });

  it('finance marks an approved report paid; a second mark is the same 409 and changes nothing', async () => {
    const made = await approved();
    const first = await markPaid(finance, 'zh-CN', made.id);
    expect(first.status, JSON.stringify(first.body)).toBe(200);
    expect(first.body.data).toEqual({ id: made.id, payment_date: '2026-11-20' });
    const paid = await report(made.id);
    expect(paid).toMatchObject({ status: 'paid', payment_date: '2026-11-20', payment_reference: 'TRF-2763' });
    const again = await markPaid(finance, 'zh-CN', made.id);
    expect([again.status, again.code], JSON.stringify(again.body)).toEqual([409, 'CONFLICT']);
    expect(again.message).toBe(`只有已批准的报销单可以标记为已付款。报销单${made.name}不是已批准状态。`);
    expect((await report(made.id)).updated_at, 'the refused second mark wrote nothing').toBe(paid.updated_at);
  });

  it('ja-JP and es-ES callers read their own pack, with the report named', async () => {
    const made = await submitted();
    for (const locale of ['ja-JP', 'es-ES']) {
      const forbidden = await markPaid(spender, locale, made.id);
      expect([forbidden.status, forbidden.message], locale).toEqual([403, packRow(locale, 'FORBIDDEN')]);
      const unopened = await markPaid(finance, locale);
      expect([unopened.status, unopened.message], locale).toEqual([400, packRow(locale, 'VALIDATION_FAILED')]);
      const conflict = await markPaid(finance, locale, made.id);
      expect([conflict.status, conflict.message], locale).toEqual([409, packRow(locale, 'CONFLICT').replace('{{name}}', made.name)]);
      expect(conflict.message, locale).toContain(made.name);
    }
  });
});

describe('a report that is gone', () => {
  it('an id that names no report is answered by the platform before the action runs: its own 404', async () => {
    const missing = await markPaid(finance, 'zh-CN', 'no-such-expense-report');
    expect([missing.status, missing.code], JSON.stringify(missing.body)).toEqual([404, 'RECORD_NOT_FOUND']);
    expect(missing.userMessage, 'the platform\'s sentence, not the action\'s').not.toBe('这张报销单已不存在。');
  });

  /**
   * Finance opens a draft report and presses the button; the report is deleted
   * after the platform has loaded it and before the action reads it. Staged on
   * the real engine: the action's own read (the one asking for id, name and
   * status) is held until a real delete of the row has finished.
   */
  const goneMidway = async (locale: string) => {
    const made = await submitted();
    await decide(made.id, spender, 'recall');
    expect((await report(made.id)).status).toBe('draft');
    const ql = verify.kernel.getService<Rec>('objectql');
    let loadedFirst = 0;
    let deleted = false;
    const spies = (['find', 'findOne'] as const).map((op) => {
      const real = ql[op].bind(ql);
      return vi.spyOn(ql, op).mockImplementation((async (object: string, query: Rec = {}, ...rest: unknown[]) => {
        if (object === 'crm_expense_report' && !deleted) {
          if (Array.isArray(query.fields) && query.fields.join() === 'id,name,status') {
            deleted = true;
            await ql.delete('crm_expense_report', { where: { id: made.id }, context: { isSystem: true } });
          } else {
            loadedFirst += 1;
          }
        }
        return real(object, query, ...rest);
      }) as never);
    });
    try {
      return { answer: await markPaid(finance, locale, made.id), loadedFirst, deleted: () => deleted, id: made.id };
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  };

  it('deleted between the platform\'s load and the action\'s read: 404 in English', async () => {
    const { answer, loadedFirst, deleted, id } = await goneMidway('en');
    expect(deleted(), 'the action never read the report — the race was not staged').toBe(true);
    expect(loadedFirst, 'the platform did not load the report before the action ran').toBeGreaterThan(0);
    expect([answer.status, answer.code], JSON.stringify(answer.body)).toEqual([404, 'RECORD_NOT_FOUND']);
    expect(answer.message).toBe('This expense report no longer exists.');
    expect(await verify.rows('crm_expense_report', { id })).toHaveLength(0);
  });

  it('and in Chinese', async () => {
    const { answer, deleted } = await goneMidway('zh-CN');
    expect(deleted(), 'the action never read the report — the race was not staged').toBe(true);
    expect([answer.status, answer.code], JSON.stringify(answer.body)).toEqual([404, 'RECORD_NOT_FOUND']);
    expect(answer.message).toBe('这张报销单已不存在。');
    expect(answer.userMessage).toBe(answer.message);
  });
});

describe('the catalogue and the packs', () => {
  const action = ((stack as Rec).actions as Rec[]).find((a) => a.name === ACTION)!;

  it('declares the four refusals with the status each answered before, and the report name as the one param', () => {
    const refusals = action.refusals as Rec;
    expect(Object.keys(refusals)).toEqual([...CODES]);
    expect(CODES.map((code) => refusals[code].status)).toEqual([403, 400, 404, 409]);
    expect(CODES.map((code) => refusals[code].params ?? [])).toEqual([[], [], [], ['name']]);
    expect(refusals.CONFLICT.message).toBe('Only an approved expense report is marked as paid. Expense report {{name}} is not approved.');
  });

  it('throws nothing the catalogue does not declare', () => {
    const source = String(action.body.source);
    const thrown = [...source.matchAll(/code:\s*'([A-Z_]+)'/g)].map((m) => m[1]);
    expect(thrown).toEqual([...CODES]);
    expect(source.match(/\bthrow\b/g), 'every throw carries a declared code — a bare one answers 500').toHaveLength(CODES.length);
  });

  it('carries every refusal in every locale the app ships, the report name where the sentence names it', () => {
    for (const locale of PACKS) {
      const rows = (packFor(locale) as Rec).objects.crm_expense_report._actions[ACTION].refusals as Rec;
      expect(Object.keys(rows), locale).toEqual([...CODES]);
      for (const code of CODES) {
        const holes = [...String(rows[code].message).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]);
        expect(holes, `${locale} ${code}`).toEqual(code === 'CONFLICT' ? ['name'] : []);
      }
    }
  });
});

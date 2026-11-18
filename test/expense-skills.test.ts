// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from './helpers/composed-stack';

/**
 * The expense skills and the actions opened to an assistant (REQ-0011,
 * hotcrm#2617, F4b). What the card and its ruling fix, read from the compiled
 * stack:
 *
 *  - Expense Check reads only. A report under approval is locked, the
 *    approver included (RECORD_LOCKED, measured on 18.5.0), so it tells the
 *    reader; it binds no write tool, and its instructions forbid the
 *    platform's approval actions and marking paid.
 *  - Exactly seven expense actions are opened, and every one that sends to an
 *    approver or cannot be undone asks first. Mark as Paid is not opened.
 *  - The storage tools are named in the instructions but not bound, until
 *    strict lint resolves them (objectstack#34948). When that ships, bind them
 *    and change this pin.
 */

type AnyRec = Record<string, any>;
const S = stack as AnyRec;
const skill = (name: string) => ((S.skills ?? []) as AnyRec[]).find((s) => s.name === name);
const action = (name: string) => ((S.actions ?? []) as AnyRec[]).find((a) => a.name === name);

const OPENED = {
  submit_for_reimbursement: true,
  submit_trip_for_reimbursement: true,
  submit_expense_report: true,
  reopen_expense_report: false,
  submit_expense_request: true,
  cancel_expense_request: true,
  close_expense_request: true,
} as const;

const EXPENSE_OBJECTS = ['crm_expense', 'crm_expense_report', 'crm_expense_request', 'crm_expense_request_line', 'crm_expense_standard'];

describe('expense actions opened to an assistant (#2617)', () => {
  for (const [name, confirm] of Object.entries(OPENED)) {
    it(`${name} is opened${confirm ? ', and asks first' : ''}`, () => {
      const a = action(name);
      expect(a, `${name} is registered`).toBeDefined();
      expect(a!.ai?.exposed).toBe(true);
      expect(Boolean(a!.ai?.requiresConfirmation)).toBe(confirm);
    });
  }

  it('Mark as Paid is not opened', () => {
    const a = action('mark_expense_report_paid');
    expect(a, 'mark_expense_report_paid is registered').toBeDefined();
    expect(a!.ai?.exposed ?? false).toBe(false);
  });

  it('no other expense action is opened', () => {
    const opened = ((S.actions ?? []) as AnyRec[])
      .filter((a) => EXPENSE_OBJECTS.includes(a.objectName) && a.ai?.exposed)
      .map((a) => a.name)
      .sort();
    expect(opened).toEqual(Object.keys(OPENED).sort());
  });
});

describe('the expense skills (#2617)', () => {
  const filing = skill('expense_filing');
  const check = skill('expense_check');

  it('both are registered', () => {
    expect(filing).toBeDefined();
    expect(check).toBeDefined();
  });

  it('Expense Filing binds every opened expense action, and no other', () => {
    const bound = ((filing!.tools ?? []) as string[]).filter((t) => t.startsWith('action_')).map((t) => t.slice(7)).sort();
    expect(bound).toEqual(Object.keys(OPENED).sort());
  });

  it('Expense Check binds read tools only', () => {
    expect([...(check!.tools as string[])].sort()).toEqual(['describe_object', 'get_record', 'query_records']);
  });

  it('Expense Check forbids the approval actions and marking paid', () => {
    const text = String(check!.instructions);
    expect(text).toContain('approval_*');
    expect(text).toMatch(/Never approve, reject/);
    expect(text).toMatch(/Never mark a report paid/);
  });

  it('Expense Filing writes findings on the expense before it is sent, and submits only after a yes', () => {
    const text = String(filing!.instructions);
    expect(text).toContain('review_notes');
    expect(text).toMatch(/Draft on no report/);
    expect(text).toContain('confirm: true');
    expect(text).toContain('approval_*');
  });

  it('the storage tools are named but not bound (objectstack#34948)', () => {
    for (const s of [filing!, check!]) {
      expect(s.tools).not.toContain('read_file');
      expect(s.tools).not.toContain('create_upload_link');
      expect(String(s.instructions)).toContain('read_file');
    }
    expect(String(filing!.instructions)).toContain('create_upload_link');
  });
});

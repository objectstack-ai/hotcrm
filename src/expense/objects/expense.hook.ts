// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

/**
 * An expense on a sent report is the report's (hotcrm#2559). Once its report
 * is submitted, approved, paid or rejected, a person cannot change or delete
 * the expense: what the approver decided is what is paid back. A rejected
 * report goes back to Draft to be corrected, and its expenses with it.
 *
 * What this hook no longer does. It used to refuse a person who set an
 * expense Approved or Rejected (#2316 phase 1b). Since per-expense approval
 * retired (hotcrm#2559) an expense's status is read-only to people and
 * follows its report (`./expense_report.hook.ts`), so there is nothing left
 * to refuse there. It stopped stamping the approver and judging the project
 * at hotcrm#2556: this package knows nothing of projects.
 *
 * Judged on a person's write; the report's approval and Submit for
 * Reimbursement write as the platform. An administrator may, to repair.
 */
const expenseLineLock: Hook = {
  name: 'expense_line_lock',
  object: 'crm_expense',
  events: ['beforeUpdate', 'beforeDelete'],
  priority: 100,
  refusals: {
    RECORD_LOCKED: {
      message: 'This expense is on a report that has been sent, so it can no longer be changed.',
      status: 409,
      params: ['name', 'report'],
      reasons: {
        in_review: { message: 'Expense {{name}} is on report {{report}}, which is waiting for approval. Recall the report to change it.' },
        rejected: { message: 'Expense {{name}} is on report {{report}}, which was rejected. Move the report back to Draft to correct it.' },
        decided: { message: 'Expense {{name}} is on report {{report}}, which has been approved, so it can no longer be changed.' },
      },
    },
  },
  description: 'Keep an expense on a sent report as the report sent it: a person cannot change or delete it until the report is back to Draft.',
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
    const person = Boolean(ctx.user?.id) && !ctx.session?.isSystem;
    if (!person) return;
    const ADMIN_IDENTITIES = ['platform_admin', 'org_owner', 'org_admin'];
    if (((ctx.session?.positions ?? []) as string[]).some((p) => ADMIN_IDENTITIES.includes(p))) return;
    const previous = (ctx.previous ?? {}) as Record<string, unknown>;
    const reportId = refId(previous.crm_expense_report);
    const status = String(previous.status ?? 'draft');
    if (!reportId || status === 'draft') return;
    const api = ctx.api as HookApi | undefined;
    const report = api
      ? await api.object('crm_expense_report').findOne({ where: { id: reportId }, fields: ['name', 'status'] })
      : null;
    const reportStatus = String(report?.status ?? status);
    if (reportStatus === 'draft') return;
    const name = String(previous.name ?? '');
    const reportName = String(report?.name ?? '');
    if (reportStatus === 'submitted') {
      throw Object.assign(refuse(
        `Expense ${name} is on report ${reportName}, which is waiting for approval. Recall the report to change it.`,
        'RECORD_LOCKED',
        409,
      ), { reason: 'in_review', params: { name, report: reportName } });
    }
    if (reportStatus === 'rejected') {
      throw Object.assign(refuse(
        `Expense ${name} is on report ${reportName}, which was rejected. Move the report back to Draft to correct it.`,
        'RECORD_LOCKED',
        409,
      ), { reason: 'rejected', params: { name, report: reportName } });
    }
    throw Object.assign(refuse(
      `Expense ${name} is on report ${reportName}, which has been approved, so it can no longer be changed.`,
      'RECORD_LOCKED',
      409,
    ), { reason: 'decided', params: { name, report: reportName } });
  },
};

export default [expenseLineLock];

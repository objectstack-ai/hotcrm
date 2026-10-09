// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

/**
 * Contract lifecycle hook.
 *
 * - Validates `end_date` ≈ `start_date + contract_term_months`.
 * - Rejects shrinking `end_date` after activation.
 * - On `activated`: stamps `signed_date` (if missing) and promotes the account
 *   to `customer`. Renewal reminders are owned by the `contract_renewal` flow.
 */

// NB: helpers used by handlers are declared INSIDE each handler — L2 hook
// bodies run body-only in the QuickJS sandbox, so module scope is not
// available at runtime (cf. opportunity.hook.ts). Module-level copies were
// dead code that invited silent divergence.

const contractValidation: Hook = {
  name: 'contract_validation',
  object: 'crm_contract',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 200,
  description: 'Enforce contract term math and prevent shrinking end_date once activated.',
  handler: async (ctx: HookContext) => {
    // The refusal envelope (#1075). Mirrored from `./_refusal.ts` because a
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
    const { event, input, previous } = ctx;

    // Both operands are stored `YYYY-MM-DD` values, which the date-only parse
    // anchors at UTC MIDNIGHT — so they are read here on the calendar they were
    // written on. The local accessors are one day earlier west of Greenwich
    // (`new Date('2026-01-01').getDate()` answers 31 in `America/New_York`, 1 in
    // `Europe/Berlin`), and this count feeds a hard refusal that the +/-1 month
    // tolerance does not absorb at the boundary: a legal contract spanning
    // `term + 1` months measured `term + 2` and the save was rejected, quoting a
    // month count its own dates do not have.
    function monthsBetween(startISO: string, endISO: string): number {
      const s = new Date(startISO);
      const e = new Date(endISO);
      return (
        (e.getUTCFullYear() - s.getUTCFullYear()) * 12 +
        (e.getUTCMonth() - s.getUTCMonth()) +
        // Unchanged intent: has the end day-of-month reached the start's yet?
        // If not, the last month is not complete and does not count.
        (e.getUTCDate() >= s.getUTCDate() ? 0 : -1)
      );
    }

    // The patch's value, else the stored one; an empty string or a 0 / NaN
    // term counts as absent, so the check below stands down.
    const startDate = [input.start_date, previous?.start_date].find((v): v is string => typeof v === 'string' && v !== '');
    const endDate = [input.end_date, previous?.end_date].find((v): v is string => typeof v === 'string' && v !== '');
    const term = [input.contract_term_months, previous?.contract_term_months].find((v): v is number => typeof v === 'number' && !!v);

    if (startDate && endDate && term) {
      const calc = monthsBetween(startDate, endDate);
      if (Math.abs(calc - term) > 1) {
        throw refuse(
          `Contract term (${term} months) does not match date range (${calc} months from ${startDate} to ${endDate}).`,
          'VALIDATION_FAILED',
          400,
        );
      }
    }

    if (event === 'beforeUpdate' && previous?.status === 'activated') {
      if (
        typeof input.end_date === 'string' &&
        typeof previous.end_date === 'string' &&
        input.end_date < previous.end_date
      ) {
        throw refuse(
          `Cannot shrink end_date (${previous.end_date as string} → ${input.end_date}) after activation. Use a termination/amendment workflow instead.`,
          'RECORD_LOCKED',
          409,
        );
      }
    }
  },
};

const contractActivation: Hook = {
  name: 'contract_on_activation',
  object: 'crm_contract',
  events: ['afterUpdate'],
  priority: 800,
  async: true,
  onError: 'log',
  description: 'On activation: stamp signed_date, promote account.',
  handler: async (ctx: HookContext) => {
    const { input, previous } = ctx;
    if (input.status !== 'activated' || previous?.status === 'activated') return;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;

    const id = [input.id, previous?.id].find((v): v is string => typeof v === 'string' && v !== '');
    const accountId = [input.crm_account, previous?.crm_account].find((v): v is string => typeof v === 'string' && v !== '');

    if (id && !input.signed_date && !previous?.signed_date) {
      await api.object('crm_contract').update(
        { id, signed_date: new Date().toISOString().slice(0, 10) },
        { where: { id } },
      );
    }

    if (accountId) {
      const account = await api.object('crm_account').findOne({ where: { id: accountId } });
      if (account && account.type !== 'customer') {
        await api.object('crm_account').update(
          { id: accountId, type: 'customer' },
          { where: { id: accountId } },
        );
      }
    }

    // No renewal task here: renewal reminders are owned by the
    // `contract_renewal` scheduled flow, which honours the per-contract
    // `renewal_notice_days`. The activation-time task this hook used to
    // create hardcoded a 60-day notice and duplicated the flow's task.
  },
};

export default [contractValidation, contractActivation];

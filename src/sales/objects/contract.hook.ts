// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * Contract lifecycle hook.
 *
 * - The contract's form, its order contract's value and Change
 *   (`contract_form_and_change`, hotcrm#2804).
 * - Validates `end_date` ≈ `start_date + contract_term_months`.
 * - On a write that files the signed copy (`signed_copy`): fills
 *   `signed_date` when it is empty (#2317).
 * - On `activated`: stamps `signed_date` (if missing) on the activating write
 *   itself, then promotes the account to `customer`. Renewal reminders are
 *   owned by the `contract_renewal` flow.
 */

// NB: helpers used by handlers are declared INSIDE each handler — L2 hook
// bodies run body-only in the QuickJS sandbox, so module scope is not
// available at runtime (cf. opportunity.hook.ts). Module-level copies were
// dead code that invited silent divergence.

/**
 * The contract's form, an order contract's value, and Change (hotcrm#2804,
 * maintainer ruling 2026-11-26). Runs before `contract_validation`, so the
 * term check judges the dates a Change leaves behind.
 *
 * **Form.** A person picks Framework or Other while the contract is a draft;
 * Order is made by Draft Contract alone, whose insert is elevated. So a
 * person who writes Order, or moves an order contract to another form, or
 * changes the form of a contract that is no longer a draft, is refused.
 * `readonlyWhen` on `contract_form` keeps the form read-only in those states
 * and would drop the write in silence; the refusal says why.
 *
 * **Backfill (ruling item 7).** A contract saved before the form existed
 * takes it on its next write, by the rule as written: drafted by the draft
 * action (it carries the drafted mark, `automation_key`, and an order names
 * it) ⇒ Order, with that order as its source; no amount ⇒ Other; the rest ⇒
 * Framework. Its value is left alone: an order contract whose value already
 * differs from its order shows Differs from the Order Amount, and
 * `scripts/backfill-contract-form.ts` lists them, but nothing corrects them.
 *
 * **An order contract's value.** While the contract is a draft it follows its
 * order: when the platform rewrites `linked_order_amount` (the order's total,
 * summed; a system write after any order under the contract changes), the
 * value takes it. A person never types it; their direct write is refused.
 * Once activated it stays as signed: a later order change shows Differs from
 * the Order Amount, and Change with Update from Order takes the new amount.
 *
 * **Change.** On an activated contract the value, the end date and the
 * payment terms are locked (`readonlyWhen`, every caller). A person's direct
 * write to one is refused here, by name. Change (`../actions/contract.actions.ts`)
 * writes, as the person, a reason, the signed amendment and the
 * `change_new_*` inputs; this hook requires the reason and a NEW amendment,
 * moves each input given onto its field, takes the order's amount on Update
 * from Order (an order contract is offered no amount), re-counts the term's
 * months when the new end date leaves them out of step, and clears the
 * inputs. The fields' history records each value before and after, who and
 * when. A value written here is derived, not the caller's, so the lock keeps
 * it. The status stays Activated.
 */
const contractFormAndChange: Hook = {
  name: 'contract_form_and_change',
  object: 'crm_contract',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 150,
  description: "Hold the contract's form, keep a draft order contract's value on its order, and apply a Change to an activated contract.",
  refusals: {
    FORBIDDEN: {
      message: 'An order contract is drafted from its order with Draft Contract. Choose Framework Contract or Other.',
      status: 403,
    },
    RECORD_LOCKED: {
      message: "An order contract's value is its order's amount: change the order, and a draft contract follows it.",
      status: 409,
      reasons: {
        form: { message: "A contract's form is chosen while it is a draft, and an order contract stays an order contract." },
        contract_value: { message: "An activated contract's Contract Value changes only through Change, with a reason and the signed amendment." },
        end_date: { message: "An activated contract's End Date changes only through Change, with a reason and the signed amendment." },
        payment_terms: { message: "An activated contract's Payment Terms change only through Change, with a reason and the signed amendment." },
      },
    },
    VALIDATION_FAILED: {
      message: 'A change needs a reason and the newly signed amendment.',
      status: 400,
      reasons: {
        not_activated: { message: 'Change applies to an activated contract. A draft contract is edited directly.' },
        order_value: { message: "An order contract's value is not typed in a change: choose Update from Order to take the order's amount." },
      },
    },
  },
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
    // Empty: absent, null, or a blank string. A file value is an id or an
    // object; either is a value.
    function blank(v: unknown): boolean {
      return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
    }
    // Two stored values are the same value: blanks are one value, numbers by
    // number (a currency may arrive as a string), dates by their day, files
    // by their serialized form.
    function same(a: unknown, b: unknown): boolean {
      if (blank(a) && blank(b)) return true;
      if (blank(a) || blank(b)) return false;
      if (typeof a === 'number' || typeof b === 'number') return Number(a) === Number(b);
      if (typeof a === 'string' && typeof b === 'string') return a.slice(0, 10) === b.slice(0, 10) || a === b;
      return JSON.stringify(a) === JSON.stringify(b);
    }
    // As `contract_validation` counts them: whole months on the UTC calendar.
    function monthsBetween(startISO: string, endISO: string): number {
      const s = new Date(startISO);
      const e = new Date(endISO);
      return (
        (e.getUTCFullYear() - s.getUTCFullYear()) * 12 +
        (e.getUTCMonth() - s.getUTCMonth()) +
        (e.getUTCDate() >= s.getUTCDate() ? 0 : -1)
      );
    }

    const { event, input, previous } = ctx;
    // A person, not an automation: the drafting flows and the platform's own
    // roll-up write as the system.
    const person = Boolean(ctx.user?.id) && !ctx.session?.isSystem;

    if (event === 'beforeInsert') {
      if (person && input.contract_form === 'order') {
        throw refuse(
          'An order contract is drafted from its order with Draft Contract. Choose Framework Contract or Other.',
          'FORBIDDEN',
          403,
        );
      }
      return;
    }

    const prev = previous ?? {};
    let form = typeof prev.contract_form === 'string' ? prev.contract_form : '';
    let backfilled = false;

    // ── Backfill: a contract saved before the form existed (ruling item 7).
    // The rule decides, whatever form the write carries.
    if (form === '') {
      let derived = 'framework';
      let sourceOrder = '';
      const api = ctx.api as HookApi | undefined;
      const id = typeof input.id === 'string' ? input.id : (typeof prev.id === 'string' ? prev.id : '');
      if (api && id && !blank(prev.automation_key)) {
        const orders = await api.object('crm_sales_order').find({
          where: { crm_contract: id }, fields: ['id', 'created_at'], top: 50,
        });
        // The earliest order naming it: the one whose Draft Contract drafted it.
        const first = orders
          .filter((o) => typeof o.id === 'string')
          .sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')))[0];
        if (first) {
          derived = 'order';
          sourceOrder = String(first.id);
        }
      }
      if (derived !== 'order') {
        const value = 'contract_value' in input ? input.contract_value : prev.contract_value;
        if (blank(value) || Number(value) === 0) derived = 'other';
      }
      input.contract_form = derived;
      if (sourceOrder) input.crm_sales_order = sourceOrder;
      form = derived;
      backfilled = true;
    }

    const status = typeof prev.status === 'string' ? prev.status : '';

    // ── The form.
    if (person && !backfilled && 'contract_form' in input && !same(input.contract_form, form)) {
      if (input.contract_form === 'order') {
        throw refuse(
          'An order contract is drafted from its order with Draft Contract. Choose Framework Contract or Other.',
          'FORBIDDEN',
          403,
        );
      }
      if (form === 'order' || status !== 'draft') {
        throw Object.assign(refuse(
          "A contract's form is chosen while it is a draft, and an order contract stays an order contract.",
          'RECORD_LOCKED',
          409,
        ), { reason: 'form' });
      }
    }

    // ── A person's direct write to a locked field. Each by its label (#2338
    // item 12; `test/refusal-labels.test.ts`).
    if (person && status === 'activated') {
      const LOCKED: Array<[string, string]> = [
        ['contract_value', "An activated contract's Contract Value changes only through Change, with a reason and the signed amendment."],
        ['end_date', "An activated contract's End Date changes only through Change, with a reason and the signed amendment."],
        ['payment_terms', "An activated contract's Payment Terms change only through Change, with a reason and the signed amendment."],
      ];
      for (const [field, sentence] of LOCKED) {
        if (field in input && !same(input[field], prev[field])) {
          throw Object.assign(refuse(sentence, 'RECORD_LOCKED', 409), { reason: field });
        }
      }
    }
    if (person && form === 'order' && 'contract_value' in input && !same(input.contract_value, prev.contract_value)) {
      throw refuse(
        "An order contract's value is its order's amount: change the order, and a draft contract follows it.",
        'RECORD_LOCKED',
        409,
      );
    }

    // ── A draft order contract follows its order. Only the platform's own
    // roll-up write carries `linked_order_amount` this far: a person's copy of a
    // summary field is held back from hooks and dropped. A CHANGE of the
    // amount, from one the contract already held: not the write that
    // backfills the form, and not the first value the platform materialises
    // on a contract that predates the field (`os migrate summary-nulls`,
    // NULL → the order's total). Neither may correct an old value (ruling
    // item 7); the next change of the order does. A new contract is born
    // holding 0 (its orders are named after it), so its first order counts.
    if (ctx.session?.isSystem && !backfilled && form === 'order' && status === 'draft' && 'linked_order_amount' in input
      && typeof prev.linked_order_amount === 'number' && !same(input.linked_order_amount, prev.linked_order_amount)) {
      input.contract_value = blank(input.linked_order_amount) ? 0 : Number(input.linked_order_amount);
    }

    // ── Change.
    const staged = !blank(input.change_new_value) || !blank(input.change_new_end_date)
      || !blank(input.change_new_payment_terms) || input.change_from_order === true;
    const recorded = ('change_reason' in input && !same(input.change_reason, prev.change_reason))
      || ('change_amendment' in input && !same(input.change_amendment, prev.change_amendment));
    if (!staged && !recorded) return;

    if (status !== 'activated' || ('status' in input && input.status !== 'activated')) {
      throw Object.assign(refuse(
        'Change applies to an activated contract. A draft contract is edited directly.',
        'VALIDATION_FAILED',
        400,
      ), { reason: 'not_activated' });
    }
    if (blank(input.change_reason) || blank(input.change_amendment) || same(input.change_amendment, prev.change_amendment)) {
      throw refuse('A change needs a reason and the newly signed amendment.', 'VALIDATION_FAILED', 400);
    }
    if (form === 'order' && !blank(input.change_new_value)) {
      throw Object.assign(refuse(
        "An order contract's value is not typed in a change: choose Update from Order to take the order's amount.",
        'VALIDATION_FAILED',
        400,
      ), { reason: 'order_value' });
    }

    if (form === 'order') {
      if (input.change_from_order === true) {
        input.contract_value = blank(prev.linked_order_amount) ? 0 : Number(prev.linked_order_amount);
      }
    } else if (!blank(input.change_new_value)) {
      input.contract_value = Number(input.change_new_value);
    }
    if (!blank(input.change_new_end_date)) {
      const end = String(input.change_new_end_date).slice(0, 10);
      input.end_date = end;
      const start = typeof prev.start_date === 'string' ? prev.start_date : '';
      const term = typeof prev.contract_term_months === 'number' ? prev.contract_term_months : 0;
      if (start && end > start) {
        const calc = monthsBetween(start, end);
        if (!term || Math.abs(calc - term) > 1) input.contract_term_months = Math.max(1, calc);
      }
    }
    if (!blank(input.change_new_payment_terms)) {
      input.payment_terms = input.change_new_payment_terms;
    }
    input.change_new_value = null;
    input.change_new_end_date = null;
    input.change_new_payment_terms = null;
    input.change_from_order = false;
  },
};

const contractValidation: Hook = {
  name: 'contract_validation',
  object: 'crm_contract',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 200,
  description: 'Enforce contract term math.',
  refusals: {
    VALIDATION_FAILED: {
      message: 'Contract term ({{term}} months) does not match date range ({{calc}} months from {{start}} to {{end}}).',
      status: 400,
      params: ['term', 'calc', 'start', 'end'],
    },
  },
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
    const { input, previous } = ctx;

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
        throw Object.assign(refuse(
          `Contract term (${term} months) does not match date range (${calc} months from ${startDate} to ${endDate}).`,
          'VALIDATION_FAILED',
          400,
        ), { params: { term, calc, start: startDate, end: endDate } });
      }
    }

    // An activated contract's End Date no longer has a rule of its own here:
    // it changes only through Change, which may move it either way
    // (`contract_form_and_change`, which runs first, hotcrm#2804).
  },
};

// The stamp rides on the activating write (`beforeUpdate`), not on a second
// write after it: `billing_handoff_contract_activated` is bound to that write's
// after-update and reads `signed_date` off the record it saved, so a date
// written later reached the database but never the billing system (#2325).
// The value the write will leave behind decides — the patch's, else the stored
// one — so a date typed in the activating edit, or already on the contract, is
// kept.
const contractSignedDateStamp: Hook = {
  name: 'contract_signed_date_stamp',
  object: 'crm_contract',
  events: ['beforeUpdate'],
  priority: 300,
  description: 'On the transition into activated: stamp signed_date on the activating write when none is present.',
  handler: async (ctx: HookContext) => {
    const { input, previous } = ctx;
    if (input.status !== 'activated' || previous?.status === 'activated') return;
    const signed = 'signed_date' in input ? input.signed_date : previous?.signed_date;
    if (typeof signed === 'string' && signed !== '') return;
    input.signed_date = new Date().toISOString().slice(0, 10);
  },
};

// The signed copy dates the signature (REQ-0008 phase 3, #2317). A write that
// carries a file in `signed_copy` fills `signed_date` with today when the
// value the write leaves behind — the patch's, else the stored one — is empty,
// so a date typed on the same save, or already on the contract, is kept. It
// rides on the filing write itself (before-hooks), as the activation stamp
// below does, so the billing hand-off that reads `signed_date` off the
// activating write sees it. A write that clears the file leaves the date
// alone: when the contract was signed did not change.
const contractSignedCopyDate: Hook = {
  name: 'contract_signed_copy_date',
  object: 'crm_contract',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 290,
  description: 'When the signed copy is filed: fill signed_date with today when it is empty; a set date is left alone.',
  handler: async (ctx: HookContext) => {
    const { input, previous } = ctx;
    if (!('signed_copy' in input)) return;
    const file = input.signed_copy;
    if (file === null || file === undefined || file === '') return;
    const signed = 'signed_date' in input ? input.signed_date : previous?.signed_date;
    if (typeof signed === 'string' && signed !== '') return;
    input.signed_date = new Date().toISOString().slice(0, 10);
  },
};

const contractActivation: Hook = {
  name: 'contract_on_activation',
  object: 'crm_contract',
  events: ['afterUpdate'],
  priority: 800,
  async: true,
  onError: 'log',
  description: 'On activation: promote account.',
  handler: async (ctx: HookContext) => {
    const { input, previous } = ctx;
    if (input.status !== 'activated' || previous?.status === 'activated') return;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;

    const accountId = [input.crm_account, previous?.crm_account].find((v): v is string => typeof v === 'string' && v !== '');

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

export default [contractFormAndChange, contractValidation, contractSignedCopyDate, contractSignedDateStamp, contractActivation];

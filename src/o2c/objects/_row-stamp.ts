// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

/**
 * The stamps every Order to Cash row takes on save — one implementation,
 * registered on each of the module's three objects (the factory shape of
 * `src/revenue/objects/_line-item-price-fill.ts`). All three are module
 * objects, so nothing here attaches to the order, the contract or the account
 * (ADR-0130 R4).
 *
 * The rows belong to the account (REQ-0010, hotcrm#2557); the order (since
 * hotcrm#2560), the contract, the plan step and the invoice are optional
 * sources. On save:
 *
 *   - `crm_sales_order` and `crm_contract` — each, when the row names none, is
 *     copied from the source the write names: a payment's invoice, else its
 *     plan step; an invoice's plan step. So the order's and the contract's
 *     pages count the same rows the step and the invoice count. A row whose
 *     source carries neither stays without them; if it names no account
 *     either, it takes the source's.
 *   - from the order, whenever a write sets the order, the contract or the
 *     account: the order's contract, when the order has one and the row names
 *     none (the card's stated default: a framework contract's page then
 *     totals everything under its orders, and nothing counts twice because
 *     each row is one row). A row naming a different contract is refused: it
 *     would count toward one contract while its order sits under another.
 *     Then the order's account, refusing a different one the write names.
 *   - `crm_account` — copied from the row's contract whenever a write sets the
 *     contract or the account, so a row entered from a contract (on the form,
 *     where the pick fills the account too, or by an import or API write that
 *     names only the contract) lands under the contract's account. An account
 *     the write names that is not the contract's is refused: the row would
 *     count toward one account's figures and another account's contract. An
 *     order and a contract of two different accounts are refused the same
 *     way, naming both: the row has one account, and the two cannot both give
 *     it.
 *   - `synced_at` — now, whenever a write sets `source` to `import` (every
 *     row the import mappings write does), so a reader knows how old an
 *     imported figure is. Plan steps carry no source and skip this.
 *
 * ⚠️ The handler runs body-only in the QuickJS sandbox (AGENTS.md, Tech Stack
 * rule 3): it reads the object from `ctx.object`, never from a closure.
 */
export function createO2cRowStamp(objectName: string, hookName: string): Hook {
  return {
    name: hookName,
    object: objectName,
    events: ['beforeInsert', 'beforeUpdate'],
    priority: 50,
    refusals: {
      VALIDATION_FAILED: {
        message: 'This contract belongs to another account. Choose a contract of this account, or leave the account for the contract to fill.',
        status: 400,
        params: ['contract', 'order'],
        reasons: {
          named: { message: '{{contract}} belongs to another account. Choose a contract of this account, or leave the account for the contract to fill.' },
          order_named: { message: '{{order}} belongs to another account. Choose an order of this account, or leave the account for the order to fill.' },
          order_contract: { message: '{{order}} is placed under another contract. Leave the contract empty for the order to fill it, or choose the order\'s own contract.' },
          apart: { message: '{{order}} and {{contract}} belong to different accounts. Choose an order and a contract of the same account.' },
        },
      },
    },
    description: 'Fill the order and the contract from the step or invoice, take the order\'s contract, stamp the account from the order and the contract (refusing another account or contract), and Synced At on an import write.',
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
      // A reference arrives as an id, or expanded as `{ id }`.
      function refId(value: unknown): string {
        if (typeof value === 'string') return value;
        if (value && typeof value === 'object' && typeof (value as Record<string, unknown>).id === 'string') {
          return String((value as Record<string, unknown>).id);
        }
        return '';
      }
      const { input } = ctx;
      const api = ctx.api as HookApi | undefined;
      if (!input) return;
      const previous = (ctx.previous ?? {}) as Record<string, unknown>;
      const held = (key: string): string => refId(key in input ? input[key] : previous[key]);

      // The order and the contract, each from the source the write names when
      // the row has none; and the account too, when the row ends up with
      // neither source and no account (an invoice entered against the account
      // alone). The invoice is asked first, then the plan step.
      if (api && (!held('crm_contract') || !held('crm_sales_order'))) {
        const sources: Array<Record<string, unknown>> = [];
        const sourceFields = ['id', 'crm_contract', 'crm_sales_order', 'crm_account'];
        // A payment or an invoice takes nothing from an invoice or a step of
        // another account: `payment_plan_step_stamp` and
        // `invoice_plan_step_guard` (after this hook) then refuse the invoice
        // or the step by its own name, where the order it carries would be
        // refused here under a name the user never chose (hotcrm#2755: the
        // forms' pickers list every account's). The account is the one the
        // write names; else the one its contract or order gives (stamped
        // below); else the row's own.
        let payer = '';
        const judged = (ctx.object === 'crm_payment' && (refId(input.crm_invoice) || refId(input.crm_billing_milestone)))
          || (ctx.object === 'crm_invoice' && refId(input.crm_billing_milestone));
        if (judged) {
          payer = 'crm_account' in input ? refId(input.crm_account) : '';
          for (const key of ['crm_contract', 'crm_sales_order']) {
            if (payer || !held(key)) continue;
            const named = await api.object(key).findOne({ where: { id: held(key) }, fields: ['id', 'crm_account'] });
            payer = refId(named?.crm_account);
          }
          if (!payer && !('crm_account' in input)) payer = refId(previous.crm_account);
        }
        const ofPayer = (source: Record<string, unknown>): boolean => {
          const owner = refId(source.crm_account);
          return !payer || !owner || owner === payer;
        };
        const invoiceId = ctx.object === 'crm_payment' ? refId(input.crm_invoice) : '';
        if (invoiceId) {
          const invoice = await api.object('crm_invoice').findOne({ where: { id: invoiceId }, fields: sourceFields });
          if (invoice && ofPayer(invoice)) sources.push(invoice);
        }
        const first = (key: string): string => {
          for (const source of sources) {
            const id = refId(source[key]);
            if (id) return id;
          }
          return '';
        };
        const stepId = ctx.object !== 'crm_billing_milestone' ? refId(input.crm_billing_milestone) : '';
        const missing = (key: string): boolean => !held(key) && !first(key);
        if (stepId && (missing('crm_contract') || missing('crm_sales_order'))) {
          const step = await api.object('crm_billing_milestone').findOne({ where: { id: stepId }, fields: sourceFields });
          if (step && ofPayer(step)) sources.push(step);
        }
        if (!held('crm_contract') && first('crm_contract')) input.crm_contract = first('crm_contract');
        if (!held('crm_sales_order') && first('crm_sales_order')) input.crm_sales_order = first('crm_sales_order');
        if (!held('crm_contract') && !held('crm_sales_order') && !held('crm_account') && first('crm_account')) {
          input.crm_account = first('crm_account');
        }
      }

      // From the order, whenever the write touches the order, the contract or
      // the account: its contract (refusing another), then its account
      // (refusing another).
      let orderNumber = '';
      let accountFromOrder = '';
      const orderId = held('crm_sales_order');
      if (api && orderId && ('crm_sales_order' in input || 'crm_contract' in input || 'crm_account' in input)) {
        const order = await api.object('crm_sales_order').findOne({
          where: { id: orderId }, fields: ['id', 'order_number', 'crm_account', 'crm_contract'],
        });
        orderNumber = typeof order?.order_number === 'string' && order.order_number !== '' ? order.order_number : 'This order';
        const orderContract = refId(order?.crm_contract);
        const contractNow = held('crm_contract');
        if (orderContract && contractNow && contractNow !== orderContract && ('crm_sales_order' in input || 'crm_contract' in input)) {
          throw Object.assign(refuse(
            `${orderNumber} is placed under another contract. Leave the contract empty for the order to fill it, or choose the order's own contract.`,
            'VALIDATION_FAILED',
            400,
          ), { reason: 'order_contract', params: { order: orderNumber } });
        }
        if (orderContract && !contractNow) input.crm_contract = orderContract;
        const orderAccount = refId(order?.crm_account);
        const named = 'crm_account' in input ? refId(input.crm_account) : '';
        if (orderAccount && named && named !== orderAccount) {
          throw Object.assign(refuse(
            `${orderNumber} belongs to another account. Choose an order of this account, or leave the account for the order to fill.`,
            'VALIDATION_FAILED',
            400,
          ), { reason: 'order_named', params: { order: orderNumber } });
        }
        if (orderAccount) {
          input.crm_account = orderAccount;
          accountFromOrder = orderAccount;
        }
      }

      // The account, from the contract, whenever the write touches either.
      const contractId = held('crm_contract');
      if (api && contractId && ('crm_contract' in input || 'crm_account' in input)) {
        const contract = await api.object('crm_contract').findOne({
          where: { id: contractId }, fields: ['id', 'contract_number', 'crm_account'],
        });
        const accountId = refId(contract?.crm_account);
        const named = 'crm_account' in input ? refId(input.crm_account) : '';
        if (accountId && named && named !== accountId) {
          const number = typeof contract?.contract_number === 'string' ? contract.contract_number : '';
          if (accountFromOrder && named === accountFromOrder) {
            const contractName = number || 'this contract';
            throw Object.assign(refuse(
              `${orderNumber} and ${contractName} belong to different accounts. Choose an order and a contract of the same account.`,
              'VALIDATION_FAILED',
              400,
            ), { reason: 'apart', params: { order: orderNumber, contract: contractName } });
          }
          throw Object.assign(refuse(
            `${number || 'This contract'} belongs to another account. Choose a contract of this account, or leave the account for the contract to fill.`,
            'VALIDATION_FAILED',
            400,
          ), number ? { reason: 'named', params: { contract: number } } : {});
        }
        if (accountId) input.crm_account = accountId;
      }

      if (ctx.object !== 'crm_billing_milestone' && input.source === 'import') {
        input.synced_at = new Date().toISOString();
      }
    },
  };
}

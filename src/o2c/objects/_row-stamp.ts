// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

/**
 * The stamps every Order to Cash row takes on save — one implementation,
 * registered on each of the module's three objects (the factory shape of
 * `src/revenue/objects/_line-item-price-fill.ts`). All three are module
 * objects, so nothing here attaches to the contract or the account
 * (ADR-0130 R4).
 *
 * The rows belong to the account (REQ-0010, hotcrm#2557); the contract, the
 * plan step and the invoice are optional sources. On save:
 *
 *   - `crm_contract` — when the row names none, it is copied from the source
 *     the write names: a payment's invoice, else its plan step; an invoice's
 *     plan step. So the contract page counts the same rows the step and the
 *     invoice count. A row whose source carries no contract stays without one;
 *     if it names no account either, it takes the source's.
 *   - `crm_account` — copied from the row's contract whenever a write sets the
 *     contract or the account, so a row entered from a contract (on the form,
 *     where the pick fills the account too, or by an import or API write that
 *     names only the contract) lands under the contract's account. An account
 *     the write names that is not the contract's is refused: the row would
 *     count toward one account's figures and another account's contract.
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
        params: ['contract'],
        reasons: {
          named: { message: '{{contract}} belongs to another account. Choose a contract of this account, or leave the account for the contract to fill.' },
        },
      },
    },
    description: 'Fill the contract from the step or invoice, stamp the account from the contract (refusing another account), and Synced At on an import write.',
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

      // The contract, from the source the write names, when the row has none;
      // and the account too, when the row has neither and the source carries
      // no contract (an invoice entered against the account alone).
      if (api && !held('crm_contract')) {
        let source: Record<string, unknown> | null = null;
        const invoiceId = ctx.object === 'crm_payment' ? refId(input.crm_invoice) : '';
        if (invoiceId) {
          source = await api.object('crm_invoice').findOne({ where: { id: invoiceId }, fields: ['id', 'crm_contract', 'crm_account'] });
        }
        const stepId = ctx.object !== 'crm_billing_milestone' ? refId(input.crm_billing_milestone) : '';
        if (!refId(source?.crm_contract) && stepId) {
          source = await api.object('crm_billing_milestone').findOne({ where: { id: stepId }, fields: ['id', 'crm_contract', 'crm_account'] });
        }
        if (refId(source?.crm_contract)) input.crm_contract = refId(source?.crm_contract);
        else if (refId(source?.crm_account) && !held('crm_account')) input.crm_account = refId(source?.crm_account);
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

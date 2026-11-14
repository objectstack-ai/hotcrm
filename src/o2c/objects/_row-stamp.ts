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
 *   - `crm_account` — copied from the row's contract whenever a write sets the
 *     contract, so the account page lists the account's plan steps, invoices
 *     and payments without a second hop. The field is read-only to people.
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
    description: 'Stamp the account from the contract, and Synced At on an import write.',
    handler: async (ctx: HookContext) => {
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

      const contractId = refId(input.crm_contract);
      if (contractId && api) {
        const contract = await api.object('crm_contract').findOne({
          where: { id: contractId }, fields: ['id', 'crm_account'],
        });
        const accountId = refId(contract?.crm_account);
        if (accountId) input.crm_account = accountId;
      }

      if (ctx.object !== 'crm_billing_milestone' && input.source === 'import') {
        input.synced_at = new Date().toISOString();
      }
    },
  };
}

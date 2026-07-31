// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * Account protection hook.
 *
 * - Validates `website` format and `annual_revenue` non-negative.
 * - Refuses to delete a `customer` account that still has open opportunities.
 */
const accountHook: Hook = {
  name: 'account_protection',
  object: 'crm_account',
  events: ['beforeInsert', 'beforeUpdate', 'beforeDelete'],
  priority: 200,
  description:
    'Validate account fields and protect customer accounts with open opportunities from deletion.',
  handler: async (ctx: HookContext) => {
    const { event, input } = ctx;

    if (event === 'beforeInsert' || event === 'beforeUpdate') {
      if (typeof input.website === 'string' && input.website.length > 0) {
        if (!/^https?:\/\//i.test(input.website)) {
          throw new Error('Website must start with http:// or https://');
        }
      }
      if (typeof input.annual_revenue === 'number' && input.annual_revenue < 0) {
        throw new Error('Annual Revenue must be greater than or equal to 0');
      }
    }

    // Stamp last_activity_date when ownership or type changes (migrated from the
    // removed `update_last_activity` object workflow — 7.7 dropped workflows[]).
    // USER writes only (`ctx.user?.id` — this repo's system-write signal, cf.
    // opportunity/quote hooks): the demo_bootstrap flow claims ownerless seeded
    // accounts as a system write every 10 minutes, and stamping those flattened
    // every seeded activity date to "today", emptying the churn report buckets.
    if (event === 'beforeUpdate' && ctx.user?.id) {
      const prev = ctx.previous ?? {};
      const ownerChanged = typeof input.owner !== 'undefined' && input.owner !== prev.owner;
      const typeChanged = typeof input.type !== 'undefined' && input.type !== prev.type;
      if (ownerChanged || typeChanged) {
        input.last_activity_date = new Date().toISOString().slice(0, 10);
      }
    }

    if (event === 'beforeDelete') {
      const previous = ctx.previous;
      if (!previous || previous.type !== 'customer') return;
      const api = ctx.api as HookApi | undefined;
      if (!api) return;
      const openOpps = await api.object('crm_opportunity').count({
        where: {
          crm_account: previous.id,
          stage: { $nin: ['closed_won', 'closed_lost'] },
        },
      });
      if (openOpps > 0) {
        throw new Error(
          `Cannot delete customer account: ${openOpps} open opportunit${openOpps === 1 ? 'y' : 'ies'} still reference it. Close or reassign them first.`,
        );
      }
    }
  },
};

export default accountHook;

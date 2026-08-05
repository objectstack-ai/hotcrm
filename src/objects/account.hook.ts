// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * Account protection hook.
 *
 * - Validates `website` format and `annual_revenue` non-negative.
 * - Projects `billing_address.country` onto the flat `billing_country` column
 *   the territory sharing rules filter on (#621).
 * - Folds `name` into the `name_normalized` column lead conversion matches
 *   accounts on (#626).
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

      // ─── Territory projection (#621) ───────────────────────────────────
      //
      // `billing_country` is the flat column the two territory sharing rules
      // filter on, and this block is its only writer. It exists because a
      // sharing rule's CEL condition is compiled into a pushdown-able query
      // filter, and that compiler rejects any path reaching INSIDE a composite
      // `address` value — `record.billing_address.country in [...]` is not
      // translatable, so plugin-sharing dropped both rules on every boot and
      // `na_sales_team` / `eu_sales_team` got nothing at all.
      //
      // Recompute ONLY when the write carries the address: a partial update
      // that never mentions `billing_address` must leave `billing_country`
      // alone, or every unrelated edit would blank the column and silently
      // evict the account from its territory. A write that CLEARS the address
      // (`billing_address: null`) does clear the projection — the key is
      // present, the value is empty.
      //
      // Only `country` is read. `countryCode` is the ISO 3166-1 alpha-2 slot,
      // where the United Kingdom is `GB`, while the Europe rule is authored
      // against `UK`; preferring the ISO slot would silently drop UK accounts
      // out of their own territory. Mirroring the one slot the rules have
      // always named keeps this a change of STORAGE LOCATION, not of rule
      // semantics.
      //
      // Written inline rather than as a module-scope helper on purpose: hook
      // bodies must lower to metadata-only (no free identifiers), which
      // `test/action-sandbox.test.ts` enforces for every registered hook.
      if ('billing_address' in input) {
        const address = input.billing_address;
        const country =
          address !== null && typeof address === 'object' && !Array.isArray(address)
            ? (address as { country?: unknown }).country
            : undefined;
        const normalized = typeof country === 'string' ? country.trim().toUpperCase() : '';
        input.billing_country = normalized === '' ? null : normalized;
      }

      // ─── Account-name match key (#626) ─────────────────────────────────
      //
      // `name_normalized` is the column `lead_conversion` matches accounts on,
      // and this block is its only writer. It exists because the flow that
      // reads it cannot compute it: `service-automation`'s template resolver
      // knows one function form (`NOW()` / `TODAY()`), so `{LOWER(x)}`,
      // `{TRIM(x)}` and `{x.toLowerCase()}` all resolve to `undefined` — and a
      // formula field has no physical column to filter on
      // (`fieldHasColumn(formula) === false`). The canonical form therefore has
      // to be established HERE, by the producer, exactly as `crm_lead.email`
      // and `crm_contact.email` are.
      //
      // lower + trim + collapse internal whitespace, so "Acme Corp",
      // "ACME  Corp" and " acme corp " all land on `acme corp`. That is the
      // whole transform: normalize-then-EXACT. Fuzzy matching is out of scope
      // (see the field's doc comment on `crm_account`).
      //
      // Recompute ONLY when the write carries the name — a partial update that
      // never mentions `name` must leave the key alone, or every unrelated edit
      // would blank it and make the account invisible to conversion. `name` is
      // required + notNull, so on insert it is always present; the null branch
      // is for a whitespace-only value the validator would reject anyway.
      //
      // Written inline, not as a module-scope helper, for the same reason as
      // the block above: hook bodies lower to metadata-only (no free
      // identifiers), which `test/action-sandbox.test.ts` enforces.
      if ('name' in input) {
        const rawName = input.name;
        const normalizedName =
          typeof rawName === 'string'
            ? rawName.trim().toLowerCase().replace(/\s+/g, ' ')
            : '';
        input.name_normalized = normalizedName === '' ? null : normalizedName;
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
      const ownerChanged = typeof input.owner_id !== 'undefined' && input.owner_id !== prev.owner_id;
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
        // Whole sentence per branch, not a stitched-together noun (#721). The
        // count switched the NOUN only (`opportunit{y,ies}`) while the verb and
        // the closing pronoun stayed plural, so the singular case read
        // "1 open opportunity still reference it. Close or reassign them
        // first." Agreement runs across three words here — noun, verb and
        // pronoun — and the two readable sentences are cheaper to keep correct
        // (and to grep for) than three interlocking conditionals.
        throw new Error(
          openOpps === 1
            ? 'Cannot delete customer account: 1 open opportunity still references it. Close or reassign it first.'
            : `Cannot delete customer account: ${openOpps} open opportunities still reference it. Close or reassign them first.`,
        );
      }
    }
  },
};

export default accountHook;

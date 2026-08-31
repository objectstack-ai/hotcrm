// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * Account protection hook.
 *
 * - Validates `website` format and `annual_revenue` non-negative.
 * - Projects `billing_address.country` onto the flat `billing_country` column
 *   (#621) and classifies it into the `territory` select the territory sharing
 *   rules filter on (#639).
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
    // The refusal envelope (#1075). Mirrored from `./_refusal.ts` because a
    // lowered body has no module scope and `extractHookBody` THROWS on an
    // import; `test/refusal-envelope.test.ts` pins every copy against it.
    function refuse(message: string, code: string, status: number): Error {
      const err = new Error(message) as Error & { code: string; status: number };
      err.code = code;
      err.status = status;
      return err;
    }
    const { event, input } = ctx;

    if (event === 'beforeInsert' || event === 'beforeUpdate') {
      if (typeof input.website === 'string' && input.website.length > 0) {
        if (!/^https?:\/\//i.test(input.website)) {
          throw refuse('Website must start with http:// or https://', 'VALIDATION_FAILED', 400);
        }
      }
      if (typeof input.annual_revenue === 'number' && input.annual_revenue < 0) {
        throw refuse('Annual Revenue must be greater than or equal to 0', 'VALIDATION_FAILED', 400);
      }

      // ─── Territory (#621 storage location, #639 classification) ────────
      //
      // Two derived columns, one input. `billing_country` is the flat
      // projection of `billing_address.country`; `territory` is the CLASSIFIED
      // value the two territory sharing rules now filter on. This block is the
      // only writer of both.
      //
      // `billing_country` became a flat column because a sharing rule's CEL
      // condition is compiled into a pushdown-able query filter, and that
      // compiler rejects any path reaching INSIDE a composite `address` value
      // — `record.billing_address.country in [...]` is not translatable, so
      // plugin-sharing dropped both rules on every boot and `na_sales_team` /
      // `eu_sales_team` got nothing at all (#621).
      //
      // That fixed WHERE the country is read from and left WHAT the rules
      // match on unfixed: a free-text country. `United States` matched no
      // territory, silently, and the same country lists were restated in two
      // CEL strings and six documentation files. #639 replaced the matching
      // with `territory`, a declared select — see `./_territory.ts` for the
      // whole argument and for the authored tables this table is derived from.
      //
      // ── Two different recompute rules, on purpose ──
      //
      // `billing_country` MIRRORS the address, so it is rewritten only when
      // the write carries one: a partial update that never mentions
      // `billing_address` must leave it alone, or every unrelated edit would
      // blank the column. A write that CLEARS the address
      // (`billing_address: null`) does clear it — the key is present, the
      // value is empty.
      //
      // `territory` is a CLASSIFICATION, and #639 decided it is always a
      // stated fact rather than a blank ("belongs to no territory" and "nobody
      // filled it in" must not look alike). So it is also stated on an insert
      // that carries no address at all, where it is `other`. On an update that
      // does not mention the address it is left alone, exactly like the
      // projection — an unrelated edit must not re-derive it.
      //
      // Only `country` is read. `countryCode` is the ISO 3166-1 alpha-2 slot
      // and would be the better input, but it is optional and mostly empty in
      // this app's data; reading it in preference would move which slot decides
      // an account's territory, which #639 did not ask for. `UK` vs `GB` is
      // handled in the mapping instead (both are `emea`), which is why nothing
      // had to migrate.
      //
      // ── Why the map is INLINE rather than imported ──
      //
      // A hook handler is lowered to a metadata-only `body.source` and
      // evaluated inside QuickJS with no module scope, so an import is a
      // `ReferenceError` at runtime, not a closure; `extractHookBody` rejects
      // such a handler and `test/action-sandbox.test.ts` runs that same
      // lowering pass over every registered hook. The table therefore cannot be
      // read from `./_territory.ts` here. It is not trusted to stay in step
      // either: `test/territory-single-source.test.ts` parses this literal out
      // of the LOWERED body and asserts deep equality with the module's derived
      // map, so a country added to either side alone fails.
      if ('billing_address' in input || event === 'beforeInsert') {
        const address = input.billing_address;
        const country =
          address !== null && typeof address === 'object' && !Array.isArray(address)
            ? (address as { country?: unknown }).country
            : undefined;
        // The one normalisation rule, mirrored from `normalizeCountry`: trim,
        // collapse internal whitespace, upper-case. Every key below is written
        // in that form, so the lookup is a plain property read rather than a
        // pile of tolerant comparisons.
        const normalized =
          typeof country === 'string' ? country.trim().replace(/\s+/g, ' ').toUpperCase() : '';

        if ('billing_address' in input) {
          input.billing_country = normalized === '' ? null : normalized;
        }

        // A COPY of the map derived in `./_territory.ts`, kept here because a
        // sandboxed body cannot import it (see above). Edit `_territory.ts`
        // and mirror the result here — `test/territory-single-source.test.ts`
        // reads this literal back out of the lowered body and fails if the two
        // disagree, so the mirroring is enforced rather than remembered.
        const TERRITORY_BY_COUNTRY: Record<string, string> = {
          "US": "na", "CA": "na", "MX": "na",
          "GB": "emea", "DE": "emea", "FR": "emea", "IT": "emea", "ES": "emea",
          "UNITED STATES": "na", "UNITED STATES OF AMERICA": "na", "USA": "na",
          "CANADA": "na", "MEXICO": "na",
          "UK": "emea", "UNITED KINGDOM": "emea", "GREAT BRITAIN": "emea",
          "GERMANY": "emea", "FRANCE": "emea", "ITALY": "emea", "SPAIN": "emea"
        };
        input.territory = TERRITORY_BY_COUNTRY[normalized] || 'other';
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

    // Stamp last_activity_date when ownership or type changes.
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
        throw refuse(
          openOpps === 1
            ? 'Cannot delete customer account: 1 open opportunity still references it. Close or reassign it first.'
            : `Cannot delete customer account: ${openOpps} open opportunities still reference it. Close or reassign them first.`,
          'DELETE_RESTRICTED',
          409,
        );
      }
    }
  },
};

export default accountHook;

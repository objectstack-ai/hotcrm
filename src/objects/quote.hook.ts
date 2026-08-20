// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * Quote workflow hook.
 *
 * - Defaults `expiration_date` to `quote_date + 30 days` when missing.
 * - Freezes quotes once `accepted` or `expired` — against USER edits only: a
 *   write that is purely the engine clearing a link is let through (#720).
 * - On `accepted`, drafts a contract — carrying the quote's negotiated
 *   `payment_terms` onto it (#873) — and pushes the linked opportunity to
 *   `closed_won`.
 */

// NB: helpers used by handlers are declared INSIDE each handler — L2 hook
// bodies run body-only in the QuickJS sandbox, so module scope is not
// available at runtime (cf. opportunity.hook.ts).

const quoteValidation: Hook = {
  name: 'quote_workflow',
  object: 'crm_quote',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 200,
  description: 'Default expiration date and freeze accepted/expired quotes.',
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
    const previous = ctx.previous;

    function addDays(iso: string, days: number): string {
      const d = new Date(iso);
      d.setDate(d.getDate() + days);
      return d.toISOString().slice(0, 10);
    }

    if (event === 'beforeInsert' && !input.expiration_date) {
      const base =
        typeof input.quote_date === 'string'
          ? input.quote_date
          : new Date().toISOString().slice(0, 10);
      input.expiration_date = addDays(base, 30);
    }

    // Guard ONLY genuine USER edits (`ctx.user?.id` present). System / seed /
    // backfill writes carry no user and legitimately re-apply business fields
    // (the seed's quote_date/expiration_date re-evaluate on every reboot), so
    // guarding them threw boot-time BodyRunner errors (#459). Matches the
    // system-write convention used across the case/lead/opportunity hooks.
    if (event === 'beforeUpdate' && previous && ctx.user?.id) {
      const frozen = previous.status === 'accepted' || previous.status === 'expired';
      if (frozen) {
        const allowed = new Set(['internal_notes']);
        // Framework-managed columns (ownership, audit timestamps) are re-stamped
        // by the 9.x runtime — never treat those system writes as edits to a
        // frozen quote, only user changes to business fields.
        const SYSTEM_FIELDS = new Set([
          'id', 'owner_id', 'created_at', 'updated_at',
          'created_by', 'updated_by', 'space_id', 'organization_id', 'org_id', 'version',
        ]);
        // `violating` rather than `changed` (#720): the three freeze guards now
        // share one reference-cleanup predicate verbatim, and a shared block can
        // only be shared if it reads the same variable in all three.
        const violating = Object.keys(input).filter(
          (k) => !allowed.has(k) && !SYSTEM_FIELDS.has(k) && input[k] !== previous[k],
        );
        if (violating.length > 0) {
          // Every lookup on `crm_quote` a referential clear can attack.
          const REFERENCE_FIELDS = new Set(['crm_account', 'crm_contact', 'crm_opportunity']);
          // ───────────────────────────────────── the reference-cleanup yield ──
          // #720. The engine implements `deleteBehavior: 'set_null'` by UPDATING
          // the row that HOLDS the lookup, so deleting the opportunity (or the
          // contact) an ACCEPTED quote references arrives here as an ordinary
          // user `beforeUpdate` — and this freeze refused it, which made a
          // settled quote able to keep a deal, a person and (through the
          // master-detail cascade) that person's account undeletable forever.
          //
          // Measured on 17.0.0-rc.6, not assumed: the payload is exactly
          // `{ id, <link>: null, updated_at, updated_by }`; `ctx.user` is the
          // CALLER; `ctx.session` is the caller's own `{ userId, isSystem }`.
          // The engine DOES stamp a `__referentialFieldClear: true` marker, but
          // on its internal operation context — `ObjectQL.buildSession` copies a
          // fixed allow-list of keys into `ctx.session`, and `__`-prefixed
          // operation-private keys are deliberately not among them (see the
          // `__` convention note in `@objectstack/core`). So no marker reaches a
          // hook, and the WRITE SHAPE is the only evidence there is.
          //
          // ⛔ Keep this narrow (maintainer's ruling on #720, Option A): a write
          // yields ONLY when every one of its non-system changes is a DECLARED
          // link going from a value to `null`. One business field alongside it,
          // or a link repointed to a NEW value, and the refusal below still
          // fires. The three freeze guards share this block verbatim — sharing
          // it as an imported helper is not possible (hook bodies run body-only
          // in the sandbox and cannot reach module scope), so
          // `test/freeze-guard-reference-cleanup.test.ts` pins the three copies
          // as identical text and pins both directions of the narrowness.
          const isReferenceCleanup = violating.every(
            (k) => REFERENCE_FIELDS.has(k) && input[k] === null && previous?.[k] != null,
          );
          if (isReferenceCleanup) return;

          const name = typeof previous.name === 'string' ? previous.name : '';
          const quoteId =
            (typeof previous.id === 'string' && previous.id) ||
            (typeof input.id === 'string' && input.id) ||
            '';
          const label = [name, quoteId ? `(${quoteId})` : ''].filter(Boolean).join(' ');
          const subject = label ? `Quote ${label}` : 'Quote';
          throw refuse(
            `${subject} is ${previous.status as string}; only internal_notes may be edited. Attempted: ${violating.join(', ')}.`,
            'RECORD_LOCKED',
            409,
          );
        }
      }
    }
  },
};

const quoteAccepted: Hook = {
  name: 'quote_on_accepted',
  object: 'crm_quote',
  events: ['afterUpdate'],
  priority: 800,
  async: true,
  onError: 'log',
  description: 'When quote is accepted: draft a contract and close-won the linked opportunity.',
  handler: async (ctx: HookContext) => {
    const { input } = ctx;
    const previous = ctx.previous;
    if (input.status !== 'accepted' || previous?.status === 'accepted') return;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;

    // Real calendar months — `days * 30` shorted a 12-month term by ~5 days
    // and only slipped past contract_validation's ±1-month tolerance by luck.
    function addMonths(iso: string, months: number): string {
      const d = new Date(iso);
      d.setMonth(d.getMonth() + months);
      return d.toISOString().slice(0, 10);
    }

    /**
     * First candidate that is a non-empty record id, or `undefined` (#714).
     *
     * The id chains here used to be written `(typeof a === 'string' && a) || (typeof
     * b === 'string' && b)`, whose value when NEITHER operand holds is boolean
     * `false` — not `undefined`. `false` is a VALUE: it went into the contract
     * document as the content of a lookup, and a lookup column takes a record id
     * or nothing at all. What the engine did with it depends on the deployment's
     * ADR-0104 value-shape posture, and both outcomes are wrong:
     *
     *   - warn-first (a deployment that has not run `os migrate value-shapes
     *     --apply`): the write is ADMITTED with a `[value-shape] … accepted for
     *     now` warning, and `crm_contact = false` is persisted into a reference
     *     column — a row the value-shape scan will later refuse to convert;
     *   - strict (after that gate, or `OS_DATA_VALUE_SHAPE_STRICT_ENABLED=1`):
     *     `ValidationError: Primary Contact has an invalid lookup value: Invalid
     *     input: expected string, received boolean`, which aborted this whole
     *     handler — so no contract, and the close-won leg below never ran.
     *
     * `undefined` is the only correct "there is no id here": it does not survive
     * the JSON hop into the engine, and the writes below drop the key outright,
     * so an absent optional link is an ABSENT COLUMN rather than a junk value.
     */
    function pickId(...candidates: unknown[]): string | undefined {
      for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate) return candidate;
      }
      return undefined;
    }

    const quoteId = pickId(input.id, previous?.id);
    const accountId = pickId(input.crm_account, previous?.crm_account);
    const contactId = pickId(input.crm_contact, previous?.crm_contact);
    const opportunityId = pickId(input.crm_opportunity, previous?.crm_opportunity);
    const ownerId = pickId(input.owner_id, previous?.owner_id, ctx.user?.id);
    const totalPrice =
      typeof input.total_price === 'number'
        ? input.total_price
        : typeof previous?.total_price === 'number'
          ? (previous.total_price as number)
          : 0;

    /**
     * The payment terms the customer actually negotiated (#873).
     *
     * `_picklists.ts` justifies Quote and Contract sharing one `payment_terms`
     * vocabulary with "an accepted quote's terms carry over to the contract",
     * and `contract.object.ts` repeats it — but nothing carried them: the
     * drafted contract took `crm_contract.payment_terms`'s own option default
     * `net_30` on every accepted quote, including one negotiated at
     * `due_on_receipt`. The value is not cosmetic downstream either — the
     * contract's `payment_terms` is one of the fields
     * `src/flows/billing-handoff.flow.ts` POSTs to billing when the contract
     * activates, so a defaulted term becomes an invoicing term.
     *
     * Read like `totalPrice` above: the patch's value when the accepting write
     * carried one, else the value already on the quote. A quote that never
     * chose a term yields `undefined`, which drops the key (see `pickId`) and
     * lets the contract's own default apply — exactly today's behaviour for
     * that case, so this copy is strictly additive.
     */
    const paymentTerms =
      typeof input.payment_terms === 'string' && input.payment_terms
        ? input.payment_terms
        : typeof previous?.payment_terms === 'string' && previous.payment_terms
          ? (previous.payment_terms as string)
          : undefined;

    const today = new Date().toISOString().slice(0, 10);
    const months = 12;

    // Only lookups we actually HAVE are written. A missing optional link is an
    // absent key — never `false` (see `pickId`), and never `null` either: `null`
    // is a legal shape for the optional `crm_opportunity` but not for the
    // required `crm_contact`, and one idiom for both is what keeps this honest.
    const contract: Record<string, unknown> = {
      status: 'draft',
      contract_term_months: months,
      start_date: today,
      end_date: addMonths(today, months),
      contract_value: totalPrice,
      contract_type: 'subscription',
      description: `Auto-drafted from accepted quote ${quoteId ?? ''}`.trim(),
    };
    if (accountId) contract.crm_account = accountId;
    if (contactId) contract.crm_contact = contactId;
    if (opportunityId) contract.crm_opportunity = opportunityId;
    if (ownerId) contract.owner_id = ownerId;
    // Same idiom for the same reason: written only when the quote HAS a term,
    // so "the quote chose nothing" stays an absent key rather than becoming a
    // value the contract's default would otherwise have supplied.
    if (paymentTerms) contract.payment_terms = paymentTerms;

    // The two legs are INDEPENDENT, and this is the other half of #714: they
    // used to be one straight-line sequence, so anything that made the contract
    // insert throw also swallowed the close-won below it — an accepted quote on
    // a live opportunity left the deal open, with the hook's `onError: 'log'`
    // making the whole thing invisible to the user. Winning the deal is keyed on
    // the quote being ACCEPTED, not on the contract being draftable, so a
    // refusal from `crm_contract` must not decide the opportunity's stage.
    // Failures are collected and re-thrown together at the end, so the log the
    // runtime writes still names everything that went wrong.
    const failures: string[] = [];

    try {
      await api.object('crm_contract').insert(contract);
    } catch (err) {
      // `crm_quote.crm_contact` is deliberately optional while
      // `crm_contract.crm_contact` is `required + notNull`, so a quote accepted
      // without a recipient legitimately lands here with "Primary Contact is
      // required". That refusal is the documented behaviour, not a defect —
      // `content/docs/sales/quotes.mdx` already tells reps to put the contact on
      // the quote first, because "what the quote does not carry, acceptance
      // cannot pass on". What this catch changes is that the refusal is now
      // truthful (a named missing field, not "received boolean") and that it no
      // longer takes the close-won leg with it.
      failures.push(
        `could not draft the contract for quote ${quoteId ?? '(unknown)'}: ${(err as Error).message}`,
      );
    }

    if (opportunityId) {
      try {
        const opp = await api.object('crm_opportunity').findOne({ where: { id: opportunityId } });
        if (opp && opp.stage !== 'closed_won' && opp.stage !== 'closed_lost') {
          await api.object('crm_opportunity').update(
            {
              id: opportunityId,
              stage: 'closed_won',
              close_date: today,
              // `crm_opportunity.win_reason` is `requiredWhen` stage is
              // closed_won (#593), and this write is the ONE close path with no
              // human in it to attribute the win — so without a value here the
              // CPQ leg would be rejected by the engine on every accepted quote.
              // `quote_accepted` names the automated path rather than guessing a
              // rep's answer; keep the reason the rep already recorded if there
              // is one.
              ...(opp.win_reason ? {} : { win_reason: 'quote_accepted' }),
            },
            { where: { id: opportunityId } },
          );
        }
      } catch (err) {
        failures.push(
          `could not close-won opportunity ${opportunityId}: ${(err as Error).message}`,
        );
      }
    }

    if (failures.length > 0) {
      // DELIBERATELY BARE — the one throw in this file the #1075 sweep left
      // alone. Every other throw here is a business refusal: the user asked for
      // something the rules forbid, and an envelope tells their client which
      // rule. This one is the opposite. It fires from an `afterUpdate` cascade
      // when close-won bookkeeping FAILED for reasons the user did not cause
      // and cannot act on, so it is a server fault and belongs in the 5xx band.
      // A bare Error is already mapped to `500 / INTERNAL_ERROR` by
      // `resolveThrownHttpError`, which is the correct answer — dressing it in
      // a 4xx refusal code would file a broken cascade as user error.
      throw new Error(`quote_on_accepted: ${failures.join('; ')}`);
    }
  },
};

export default [quoteValidation, quoteAccepted];

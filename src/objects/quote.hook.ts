// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * Quote workflow hook.
 *
 * - Defaults `expiration_date` to `quote_date + 30 days` when missing.
 * - Freezes quotes once `accepted` or `expired` — against USER edits only: a
 *   write that is purely the engine clearing a link is let through.
 * - On `accepted`, drafts a contract — carrying the quote's negotiated
 *   `payment_terms` onto it, and filling what the quote cannot express from
 *   `DRAFT_CONTRACT_DEFAULTS`, declared placeholders rather than decisions
 *   (#1129) — and pushes the linked opportunity to `closed_won`.
 */

// ⚠️ Helpers used by handlers are declared INSIDE each handler — L2 hook bodies
// run body-only in the QuickJS sandbox, so module scope is not available at
// runtime (cf. opportunity.hook.ts).

const quoteValidation: Hook = {
  name: 'quote_workflow',
  object: 'crm_quote',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 200,
  description: 'Default expiration date and freeze accepted/expired quotes.',
  handler: async (ctx: HookContext) => {
    // The refusal envelope. ⚠️ Mirrored from `./_refusal.ts` because a lowered
    // body has no module scope and `extractHookBody` THROWS on an import;
    // `test/refusal-envelope.test.ts` pins every copy against it.
    function refuse(message: string, code: string, status: number): Error {
      const err = new Error(message) as Error & { code: string; status: number };
      err.code = code;
      err.status = status;
      return err;
    }
    const { event, input } = ctx;
    const previous = ctx.previous;

    /**
     * `iso` + `days`, on ONE calendar — UTC, end to end.
     *
     * The base is not an instant here, it is a stored DATE: a bare
     * `YYYY-MM-DD` is parsed by the date-only form of the spec, which anchors
     * it at UTC midnight (measured: `new Date('2026-01-01')` is
     * `2026-01-01T00:00:00.000Z` in every zone). So the anchor was already
     * UTC and only the arithmetic was not — and reading a UTC-midnight anchor
     * on the LOCAL calendar is off by a whole day west of Greenwich, where
     * that instant is the previous evening (`getDate()` on the value above
     * answers 31, not 1).
     *
     * That is why this site's exposure is not the one-hour window the
     * "advance now by N days" hooks have: the anchor does not move with the
     * clock, so every quote whose [quote_date, quote_date + days] span crosses
     * a DST transition took a 23 h day and rendered a day short — measured at
     * 60 of 730 consecutive base dates in `America/New_York`, `Europe/Berlin`,
     * `America/Santiago`, `Australia/Sydney` and `Pacific/Auckland` alike.
     */
    function addDays(iso: string, days: number): string {
      const d = new Date(iso);
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    }

    if (event === 'beforeInsert' && !input.expiration_date) {
      const base =
        typeof input.quote_date === 'string'
          ? input.quote_date
          : new Date().toISOString().slice(0, 10);
      input.expiration_date = addDays(base, 30);
    }

    // ⚠️ Guard ONLY genuine USER edits (`ctx.user?.id` present). System / seed /
    // backfill writes carry no user and legitimately re-apply business fields
    // (the seed's quote_date/expiration_date re-evaluate on every reboot), so
    // guarding them throws boot-time BodyRunner errors. Matches the system-write
    // convention used across the case/lead/opportunity hooks.
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
        // ⚠️ `violating` rather than `changed`: the three freeze guards share
        // one reference-cleanup predicate verbatim, and a shared block can only
        // be shared if it reads the same variable in all three.
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
          // Measured on 17.1.0 — the version this repo pinned AT THE TIME of
          // the measurement, not the current pin (#1676: this repo has pinned
          // 17.3.0 since PR #1577, and the cascade shape below has NOT been
          // re-measured on it) — with a probe hook at priority 199 immediately
          // ahead of each guard, not assumed.
          // The engine builds its cleanup write on the CALLER's own context
          // plus two engine keys, so on the path a REST `DELETE` takes, the
          // cascade and a user's hand-clear of the same lookup are identical
          // everywhere a guard can look: payload
          // `{ id, <link>: null, updated_at, updated_by }`, `ctx.user` the
          // CALLER, `ctx.session` the caller's own `{ userId, isSystem }`.
          // (Both `updated_by` and the identity drop out together when the
          // DELETE itself carried no `userId` — a rig artefact, not this app's
          // path.) So the WRITE SHAPE is not a discriminator, and the yield
          // below is not one either: it lets ANY caller clear a declared link
          // on a settled record. That is the trade #720 accepted, not a side
          // effect of it.
          //
          // ⚠️ A marker DOES reach a hook — and is deliberately not read. An
          // earlier version of this note concluded "no marker reaches a hook,
          // and the WRITE SHAPE is the only evidence there is"; it reasoned
          // only about `ctx.session`, whose allow-list really does omit
          // `__`-prefixed operation-private keys, and missed the other route
          // into the context. `ObjectQL.cascadeDeleteRelations` builds
          // `{ ...context, __referentialFieldClear: true }`, readable at
          // `ctx.api.executionContext.__referentialFieldClear`: measured `true`
          // on every cascade into `crm_opportunity`, `crm_quote` and
          // `crm_lead`, `undefined` on every hand-clear (#1165, #1412).
          //
          // ⛔ The #1165 ruling (2026-08-25) reviewed that and upheld NOT
          // reading it, on two grounds. It is an operation-private key — an
          // undeclared dependency that can vanish in a patch release. And
          // reachability through the SHIPPED path is unproven: a hook body runs
          // body-only in QuickJS, where `buildSandboxApi` passes `engineCtx.api`
          // only when that exposes `object()`, and otherwise a shim with no
          // `executionContext` at all. Green in a kernel rig and silently false
          // in production is the worst outcome a guard can have. The declared
          // replacement `ctx.referentialFieldClear` is asked for upstream as
          // objectstack-ai/objectstack#13644.
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

          // `crm_quote.display_title` is `quote_number - name`; compose the same
          // pair from the two stored columns rather than appending the record
          // id. A lowered hook body cannot read the formula field itself, and
          // both of its sources are already on the pre-image — the number is an
          // engine-issued autonumber, so it is read from `previous` only.
          const quoteNumber =
            typeof previous.quote_number === 'string' ? previous.quote_number.trim() : '';
          const name = typeof previous.name === 'string' ? previous.name.trim() : '';
          const label = [quoteNumber, name].filter(Boolean).join(' - ');
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
    //
    // On the UTC calendar throughout, for the reason `addDays` documents in
    // the sibling hook above: the base is a UTC-midnight-anchored date string,
    // so a local `getMonth`/`setMonth` step reads that anchor as the previous
    // evening and renders a day short whenever the offset at the end of the
    // term differs from the offset at its start. A 12-month term makes that
    // rare but not absent — measured on 9 of 730 consecutive start dates in
    // `America/New_York` (e.g. `2026-11-02` + 12 months answered
    // `2027-11-01`), and it is `crm_contract.end_date`, a date the customer is
    // invoiced against.
    function addMonths(iso: string, months: number): string {
      const d = new Date(iso);
      d.setUTCMonth(d.getUTCMonth() + months);
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
     * The payment terms the customer actually negotiated.
     *
     * Quote and Contract share one `payment_terms` vocabulary because an
     * accepted quote's terms carry over to the contract — but only if something
     * carries them. Without this the drafted contract takes
     * `crm_contract.payment_terms`'s own option default `net_30` on every
     * accepted quote, including one negotiated at `due_on_receipt`; and the
     * contract's `payment_terms` is one of the fields
     * `src/flows/billing-handoff.flow.ts` POSTs to billing when the contract
     * activates, so a defaulted term becomes an invoicing term.
     *
     * Read like `totalPrice` above: the patch's value when the accepting write
     * carried one, else the value already on the quote. A quote that never chose
     * a term yields `undefined`, which drops the key (see `pickId`) and lets the
     * contract's own default apply.
     */
    const paymentTerms =
      typeof input.payment_terms === 'string' && input.payment_terms
        ? input.payment_terms
        : typeof previous?.payment_terms === 'string' && previous.payment_terms
          ? (previous.payment_terms as string)
          : undefined;

    const today = new Date().toISOString().slice(0, 10);

    /**
     * PLACEHOLDER DEFAULTS — declared as defaults, NOT decided as business
     * facts (#1129 ruling, 2026-08-31). An auto-drafted contract is a STARTING
     * DRAFT an admin completes, not a faithful transcription of what was sold.
     * `crm_contract` requires all three, a quote can express none of them, so
     * the hook has to supply something; none of it is evidence about the deal:
     *
     *   - `contract_term_months` — `required + notNull + min: 1` on the
     *     contract, and the quote has nowhere to record a term. 12 is a guess
     *     with nothing behind it;
     *   - `contract_type` — the contract declares six values (subscription /
     *     service / license / partnership / nda / msa) and NO option default,
     *     so this line is the only thing that ever picks one: every
     *     auto-drafted contract in the app is a subscription and the other
     *     five types are unreachable on this path. It does not stay here
     *     either — `src/flows/billing-handoff.flow.ts` POSTs `contract_type`
     *     to billing when the contract activates;
     *   - `start_date` — the one member that is not a literal: the date the
     *     quote happened to be ACCEPTED, which is not necessarily the date the
     *     customer's term begins. A placeholder RULE rather than a placeholder
     *     value. It sits in the block because the block is itself per-draft:
     *     an L2 body has no module scope at runtime (see the file header), so
     *     these are handler-local by construction, not module constants.
     *
     * `end_date` is not a fourth default — it is DERIVED from the two above
     * (`addMonths`, real calendar months), so it inherits their guesses rather
     * than adding one of its own.
     *
     * ⛔ Do not read these as decisions and do not quietly re-tune them. The
     * alternative — the quote carrying a real term and type so the draft
     * transcribes what was sold — is option A of #1129: recorded, not
     * undertaken, unfrozen only by measured evidence that real sales processes
     * fix the term and type at acceptance time. This block is then the list of
     * values that move onto `crm_quote`. Leaving them unmarked was excluded by
     * the same ruling: an unmarked hardcode is exactly how the `payment_terms`
     * drift of #873 happened.
     */
    const DRAFT_CONTRACT_DEFAULTS = {
      contract_term_months: 12,
      contract_type: 'subscription',
      start_date: today,
    } as const;

    // The contract's ONE field explaining where it came from. ⛔ Never a record
    // id: `Auto-drafted from accepted quote MvNopWgEDZwm2T5L` names a string no
    // surface in this app ever shows, on a quote every screen calls `QTE-0006`.
    // Name it the way `crm_quote.display_title` does. Unlike the task sites in
    // this class there is no relationship field to hold the id afterwards —
    // `crm_contract` links account, contact and opportunity but not the quote —
    // so this sentence is the whole provenance record and had better be
    // readable. `quote_number` is an engine-issued autonumber and never appears
    // on an update payload, so it is read from the pre-image alone; `name` can
    // be changing in this very write.
    const quoteNumber =
      typeof previous?.quote_number === 'string' ? previous.quote_number.trim() : '';
    const quoteName =
      (typeof input.name === 'string' && input.name.trim()) ||
      (typeof previous?.name === 'string' && previous.name.trim()) ||
      '';
    const quoteLabel = [quoteNumber, quoteName].filter(Boolean).join(' - ');

    // Only lookups we actually HAVE are written. A missing optional link is an
    // absent key — never `false` (see `pickId`), and never `null` either: `null`
    // is a legal shape for the optional `crm_opportunity` but not for the
    // required `crm_contact`, and one idiom for both is what keeps this honest.
    const contract: Record<string, unknown> = {
      status: 'draft',
      contract_term_months: DRAFT_CONTRACT_DEFAULTS.contract_term_months,
      start_date: DRAFT_CONTRACT_DEFAULTS.start_date,
      end_date: addMonths(
        DRAFT_CONTRACT_DEFAULTS.start_date,
        DRAFT_CONTRACT_DEFAULTS.contract_term_months,
      ),
      contract_value: totalPrice,
      contract_type: DRAFT_CONTRACT_DEFAULTS.contract_type,
      description: quoteLabel
        ? `Auto-drafted from accepted quote ${quoteLabel}`
        : 'Auto-drafted from an accepted quote',
    };
    if (accountId) contract.crm_account = accountId;
    if (contactId) contract.crm_contact = contactId;
    if (opportunityId) contract.crm_opportunity = opportunityId;
    if (ownerId) contract.owner_id = ownerId;
    // Same idiom for the same reason: written only when the quote HAS a term,
    // so "the quote chose nothing" stays an absent key rather than becoming a
    // value the contract's default would otherwise have supplied.
    if (paymentTerms) contract.payment_terms = paymentTerms;

    // What the draft deliberately does NOT carry (#1129 ruling, 2026-08-31) —
    // DECIDED, not overlooked. `crm_quote.shipping_terms` and
    // `crm_quote.shipping_address` have no counterpart column on
    // `crm_contract` at all; `crm_quote.billing_address` has one and is left
    // for the admin completing the draft; and the quote's `description` would
    // displace the provenance sentence written above, which is this contract's
    // only record of where it came from. Copying any of them is part of option
    // A (faithful transcription) and unfreezes with it, not before.

    // ⚠️ The two legs are INDEPENDENT and must stay so. As one straight-line
    // sequence, anything that made the contract insert throw also swallowed the
    // close-won below it — an accepted quote on a live opportunity left the deal
    // open, with the hook's `onError: 'log'` making the whole thing invisible to
    // the user. Winning the deal is keyed on the quote being ACCEPTED, not on
    // the contract being draftable, so a refusal from `crm_contract` must not
    // decide the opportunity's stage. Failures are collected and re-thrown
    // together at the end, so the log the runtime writes still names everything
    // that went wrong.
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

// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

/**
 * Quote workflow hook.
 *
 * - Defaults `expiration_date` to `quote_date + 30 days` when missing.
 * - Freezes quotes once `accepted` or `expired` — against USER edits only: a
 *   write that is purely the engine clearing a link is let through.
 * - Refuses a user's acceptance while the linked opportunity is held by an
 *   approval, because acceptance closes that deal as won (#2014).
 * - On `accepted`, drafts a contract — carrying the quote's negotiated
 *   `payment_terms` onto it, and filling what the quote cannot express from
 *   `DRAFT_CONTRACT_DEFAULTS`, declared placeholders rather than decisions
 *   (#1129) — and pushes the linked opportunity to `closed_won`. Two hooks,
 *   `quote_accepted_contract_draft` and `quote_on_accepted`, because only the
 *   draft is elevated (#2014; see its note).
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

    // The quote as every quote surface titles it. `crm_quote.display_title` is
    // `quote_number - name`; compose the same pair from the two stored columns
    // rather than appending the record id. A lowered hook body cannot read the
    // formula field itself, and both of its sources are already on the
    // pre-image — the number is an engine-issued autonumber, so it is read from
    // `previous` only. Both refusals below name the quote with it.
    function subject(): string {
      const label = [previous?.quote_number, previous?.name].map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean).join(' - ');
      return label ? `Quote ${label}` : 'Quote';
    }

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
      const base = typeof input.quote_date === 'string' ? input.quote_date : new Date().toISOString().slice(0, 10);
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
          'id', 'owner_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'space_id', 'organization_id', 'org_id', 'version',
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
          // the measurement, not the current pin (the cascade shape below has
          // NOT been re-measured on any later pin — not 17.3.0, #1676, not
          // 17.4.0, PR #1814, and not 17.5.0) — with a probe hook at priority 199 immediately
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

          const what = `${subject()} is ${previous.status as string}`;
          throw refuse(`${what}; only internal_notes may be edited. Attempted: ${violating.join(', ')}.`, 'RECORD_LOCKED', 409);
        }
      }

      // ─── An acceptance the linked deal's approval holds (#2014) ─────────
      //
      // Accepting a quote closes its opportunity as won (`quote_on_accepted`,
      // as the CALLER). While an approval holds that deal, that close is
      // refused — and it used to be refused one write too late: the acceptance
      // was admitted, the close-won met the refusal inside an `async` hook,
      // `onError: 'log'` swallowed it, and an accepted (therefore frozen) quote
      // sat on an open deal it could never close again (measured on 17.7.0: a
      // sales rep, a deal pending its Large Deal Approval). Maintainer ruling
      // on #2014 (option C): refuse the ACCEPTANCE, at the moment it is made,
      // so an approval stays an approval and the rep learns why.
      //
      // "Held" is exactly what makes that close-won fail, measured per state
      // on 17.7.0 with a rep's direct close — no wider:
      //   • `approval_status` `pending`: the Large Deal Approval's request is
      //     open, and its approval node locks the record (`lockRecord: true`)
      //     → the platform's RECORD_LOCKED. The column is the node's own
      //     mirror of the live request (`approvalStatusField`); a recalled or
      //     decided request leaves it `rejected` / `approved`, and neither
      //     holds the deal (the close goes through on both);
      //   • `status_change_approval_status` `pending` or `rejected` (REQ-0006,
      //     once an install arms it) → `opportunity_lifecycle`'s refusal of a
      //     direct close; with a request open the platform lock holds too;
      //   • `qualification_approval_status` `pending` or `rejected` (the 立项
      //     gate, once armed) → `opportunity_lifecycle`'s refusal of any stage
      //     move. Its approval node does NOT lock the record (`lockRecord:
      //     false`); the refusal is the app's gate, and it is mirrored for that.
      // A closed deal is never close-won again, so it holds nothing here.
      //
      // ⚠️ BOUNDARIES, recorded rather than hidden. Read as the CALLER: a deal
      // the caller cannot read cannot be closed by them either, for a reason
      // that is not an approval, and that is not this gate's to name — so an
      // unreadable deal, or a read that fails, stands down. USER writes only,
      // the boundary the freeze above draws: a system write's close-won is not
      // held by the lock or by either app gate (both judge users), so refusing
      // its acceptance would be wider than the condition it mirrors.
      if (input.status === 'accepted' && previous.status !== 'accepted') {
        const dealId = [input.crm_opportunity, previous.crm_opportunity].find((v) => typeof v === 'string' && v);
        const deal = dealId
          ? await (ctx.api as HookApi | undefined)?.object('crm_opportunity').findOne({
            where: { id: dealId },
            fields: ['stage', 'approval_status', 'status_change_approval_status', 'qualification_approval_status'],
          }).catch(() => null)
          : null;
        // Each hold is named by the field label and value the rep sees on the
        // deal itself, so the sentence points at where to look. A `rejected`
        // Large Deal Approval holds nothing (measured: the close goes through).
        const held = deal && !String(deal.stage).startsWith('closed_')
          ? [['approval_status', 'Approval Status'], ['status_change_approval_status', 'Status Change Approval'], ['qualification_approval_status', 'Qualification Approval']]
            .filter(([f]) => deal[f] === 'pending' || (deal[f] === 'rejected' && f !== 'approval_status'))
            .map(([f, label]) => `${label} is ${deal[f] === 'pending' ? 'Pending' : 'Rejected'}`)
          : [];
        // The quote has exactly one opportunity, so "its opportunity" names the
        // deal unambiguously — and ⛔ never by its record id.
        if (held.length > 0) {
          const what = `${subject()} cannot be accepted while its opportunity is held by an approval`;
          throw refuse(`${what} (${held.join('; ')}): accepting it would close that deal as won. Accept it once the approval is granted.`, 'RECORD_LOCKED', 409);
        }
      }
    }
  },
};

/**
 * On acceptance: draft the contract.
 *
 * ## `runAs: 'system'`, and why the close-won is a separate hook (#2014)
 *
 * A sales rep holds `crm_contract.allowCreate: false`, and a rep accepting the
 * quote on their own deal is the ordinary CPQ path — so as the caller the
 * draft was refused ("You do not have permission"), `onError: 'log'` swallowed
 * it, and the deal went `closed_won` with no contract (measured on 17.7.0).
 * The draft is the business's paperwork for a sale the rep is entitled to
 * record, not the rep authoring a contract, so this hook elevates (AGENTS.md
 * rule 9); the rep still cannot create a contract by hand. Elevation is not
 * anonymity: the contract's `created_by` names the person who accepted.
 *
 * Elevating as little as possible is why the close-won is NOT here. `runAs` is
 * per hook, and a system write is not held by an approval's record lock:
 * elevated, an accepted quote would close a deal its manager has not approved.
 * `quote_on_accepted` keeps that write the caller's. The two were already
 * independent legs (#714) — a contract that will not draft must not decide
 * whether the deal is won — and two hooks make that structural.
 *
 * Organization (AGENTS.md rule 10): it issues no read, so there is no scan to
 * pin; its one write is an insert built from the triggering quote's own links,
 * and the engine stamps its `organization_id` from the trigger's context, which
 * elevation carries through unchanged (`withRunAs('system')` is the triggering
 * context plus `isSystem`) — pinned on a walled deployment by
 * `test/hook-org-inheritance.test.ts`.
 */
const quoteAcceptedContractDraft: Hook = {
  name: 'quote_accepted_contract_draft',
  object: 'crm_quote',
  events: ['afterUpdate'],
  priority: 800,
  async: true,
  onError: 'log',
  runAs: 'system',
  description: 'Draft the accepted quote’s contract.',
  handler: async (ctx: HookContext) => {
    const { input, previous } = ctx;
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
    const pickId = (...candidates: unknown[]): string | undefined =>
      candidates.find((c): c is string => typeof c === 'string' && c !== '');

    const accountId = pickId(input.crm_account, previous?.crm_account);
    const contactId = pickId(input.crm_contact, previous?.crm_contact);
    const opportunityId = pickId(input.crm_opportunity, previous?.crm_opportunity);
    const ownerId = pickId(input.owner_id, previous?.owner_id, ctx.user?.id);
    const totalPrice = [input.total_price, previous?.total_price].find((v) => typeof v === 'number') ?? 0;

    /**
     * The payment terms the customer actually negotiated.
     *
     * Quote and Contract share one `payment_terms` vocabulary because an
     * accepted quote's terms carry over to the contract — but only if something
     * carries them. Without this the drafted contract takes
     * `crm_contract.payment_terms`'s own option default `net_30` on every
     * accepted quote, including one negotiated at `due_on_receipt`; and the
     * contract's `payment_terms` is one of the fields
     * `src/revenue/flows/billing-handoff-contract-activated.flow.ts` POSTs to
     * billing when the contract activates, so a defaulted term becomes an
     * invoicing term.
     *
     * Read like `totalPrice` above: the patch's value when the accepting write
     * carried one, else the value already on the quote — `pickId`'s rule
     * exactly (the first non-empty string), so it is read with `pickId`. A
     * quote that never chose a term yields `undefined`, which drops the key and
     * lets the contract's own default apply.
     */
    const paymentTerms = pickId(input.payment_terms, previous?.payment_terms);

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
     *     either —
     *     `src/revenue/flows/billing-handoff-contract-activated.flow.ts`
     *     POSTs `contract_type` to billing when the contract activates;
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
    const trimmed = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
    const quoteLabel = [trimmed(previous?.quote_number), [input.name, previous?.name].map(trimmed).find(Boolean)].filter(Boolean).join(' - ');

    // Only lookups we actually HAVE are written. A missing optional link is an
    // absent key — never `false` (see `pickId`), and never `null` either: `null`
    // is a legal shape for the optional `crm_opportunity` but not for the
    // required `crm_contact`, and one idiom for both is what keeps this honest.
    const contract: Record<string, unknown> = {
      ...DRAFT_CONTRACT_DEFAULTS,
      status: 'draft',
      end_date: addMonths(DRAFT_CONTRACT_DEFAULTS.start_date, DRAFT_CONTRACT_DEFAULTS.contract_term_months),
      contract_value: totalPrice,
      description: quoteLabel ? `Auto-drafted from accepted quote ${quoteLabel}` : 'Auto-drafted from an accepted quote',
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

    try {
      await api.object('crm_contract').insert(contract);
    } catch (err) {
      // `crm_quote.crm_contact` is deliberately optional while
      // `crm_contract.crm_contact` is `required + notNull`, so a quote accepted
      // without a recipient legitimately lands here with "Primary Contact is
      // required". That refusal is the documented behaviour, not a defect —
      // `content/docs/sales/quotes.mdx` already tells reps to put the contact on
      // the quote first, because "what the quote does not carry, acceptance
      // cannot pass on". The refusal is truthful (a named missing field, not
      // "received boolean"), and since the close-won lives in its own hook it
      // can no longer take that leg with it.
      //
      // DELIBERATELY BARE, like the close-won one in `quote_on_accepted`: a
      // cascade fault the accepting user neither caused nor can act on, so a
      // 500, never a 4xx refusal envelope (#1075). It names the quote the way
      // every screen does — the label composed above — never by its id (#1243).
      throw new Error(`could not draft the contract for quote ${quoteLabel}: ${(err as Error).message}`);
    }
  },
};

/**
 * On acceptance: push the linked opportunity to `closed_won`.
 *
 * Deliberately NOT elevated — the reason is on `quote_accepted_contract_draft`
 * above: this write stays the accepting caller's, so the opportunity's own
 * guards and an approval's record lock judge it as they always have. A deal an
 * approval holds is refused at the acceptance itself (`quote_workflow`), so this
 * write no longer meets that lock on a user's acceptance.
 */
const quoteAccepted: Hook = {
  name: 'quote_on_accepted',
  object: 'crm_quote',
  events: ['afterUpdate'],
  priority: 800,
  async: true,
  onError: 'log',
  description: 'Close-win the accepted quote’s opportunity.',
  handler: async (ctx: HookContext) => {
    const { input, previous } = ctx;
    if (input.status !== 'accepted' || previous?.status === 'accepted') return;
    const api = ctx.api as HookApi | undefined;
    // A record id or nothing — never boolean `false` (#714; the full note is on
    // `pickId` in `quote_accepted_contract_draft`).
    const id = [input.crm_opportunity, previous?.crm_opportunity].find((v): v is string => typeof v === 'string' && v !== '');
    if (!api || !id) return;

    try {
      const opp = await api.object('crm_opportunity').findOne({ where: { id } });
      // A deal already closed, won or lost, is left where it is.
      if (opp && !String(opp.stage).startsWith('closed_')) {
        // `crm_opportunity.win_reason` is `requiredWhen` stage is closed_won
        // (#593), and this write is the ONE close path with no human in it to
        // attribute the win — so without a value here the CPQ leg would be
        // rejected by the engine on every accepted quote. `quote_accepted`
        // names the automated path rather than guessing a rep's answer; keep
        // the reason the rep already recorded if there is one.
        const won = { id, stage: 'closed_won', close_date: new Date().toISOString().slice(0, 10) };
        await api.object('crm_opportunity').update({ ...won, ...(opp.win_reason ? {} : { win_reason: 'quote_accepted' }) }, { where: { id } });
      }
    } catch (err) {
      // DELIBERATELY BARE — one of the two throws in this file the #1075 sweep
      // left alone (the other is the contract draft's, above). Every other
      // throw here is a business refusal: the user asked for something the
      // rules forbid, and an envelope tells their client which rule. This one
      // is the opposite. It fires from an `afterUpdate` cascade when close-won
      // bookkeeping FAILED for reasons the user did not cause and cannot act
      // on, so it is a server fault and belongs in the 5xx band. A bare Error is
      // already mapped to `500 / INTERNAL_ERROR` by `resolveThrownHttpError`,
      // which is the correct answer — dressing it in a 4xx refusal code would
      // file a broken cascade as user error. It names the quote by its number,
      // the engine's autonumber every screen shows — never a record id (#1243).
      throw new Error(`could not close-won the opportunity of quote ${String(previous?.quote_number)}: ${(err as Error).message}`);
    }
  },
};

export default [quoteValidation, quoteAcceptedContractDraft, quoteAccepted];

// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

/**
 * Quote workflow hook.
 *
 * - Freezes quotes once `accepted`, `rejected` or `expired` — against USER
 *   edits only: a write that is purely the engine clearing a link is let
 *   through. The freeze covers the quote's LINE ITEMS too (#2060, #2088): a
 *   user may not add a line to a settled quote, change one of its lines or
 *   remove one, while deleting the quote itself still takes its lines with it.
 *   A rejected quote still takes its status (#2366 row 2): the rep moves it
 *   back to Draft (`revise_quote`) and revises it there.
 * - Refuses a user's create at a settled status (#2366 row 3): a quote starts
 *   as Draft, In Review or Presented.
 * - Refuses a user's acceptance while the linked opportunity is held by an
 *   approval, because acceptance closes that deal as won (#2014).
 * - Derives `discount_amount` / `total_price` on a create carrying a
 *   `subtotal`, and on an unsettled quote's update that carries a pricing
 *   input — the quote header's one formula (#2083), and the only writer of
 *   those two `readonly` fields (#2110).
 * - On `accepted`, pushes the linked opportunity to `closed_won`
 *   (`quote_on_accepted`). What else an acceptance sets in motion is two
 *   packaged flows an administrator switches (hotcrm#2558): the order
 *   (`quote_accepted_order`, on) and the contract draft
 *   (`quote_accepted_contract_draft`, off), both in `../flows/`. The draft
 *   was a hook of this file until then, elevated on its own for #2014.
 * - `quote_price_book` (#2318): a new quote prices from the standard price
 *   book unless it names another; an inactive book is refused, and so is a
 *   book change on a quote that already has line items.
 */

// ⚠️ Helpers used by handlers are declared INSIDE each handler — L2 hook bodies
// run body-only in the QuickJS sandbox, so module scope is not available at
// runtime (cf. opportunity.hook.ts).

const quoteValidation: Hook = {
  name: 'quote_workflow',
  // ⚠️ Two objects, deliberately (#2060): the freeze below is ONE freeze — the
  // quote's and its lines' — so it lives in one place, judged by one user/system
  // boundary and carried by one envelope, rather than a second copy of both on
  // the line. `test/package-ownership.test.ts` reads every name in the list.
  object: ['crm_quote', 'crm_quote_line_item'],
  // `beforeDelete` is the line freeze's delete leg (#2088); a quote's own
  // delete fires it too and is let through below, unjudged.
  events: ['beforeInsert', 'beforeUpdate', 'beforeDelete'],
  priority: 200,
  description: 'Freeze settled quotes and their lines; refuse a settled create; derive the header totals.',
  // `subject` and `holds` are the English the handler composes (the quote's
  // label, the deal's held fields by label and value); the other languages
  // name the quote from `quote` and leave the held fields to the English.
  refusals: {
    RECORD_LOCKED: {
      message: '{{subject}} cannot be accepted while its opportunity is held by an approval ({{holds}}): accepting it would close that deal as won. Accept it once the approval is granted.',
      status: 409,
      params: ['subject', 'quote', 'holds'],
      reasons: {
        held_unsent: { message: '{{subject}} cannot be accepted while its opportunity is held by an approval ({{holds}}): accepting it would close that deal as won. Save the opportunity to send it for approval, then accept the quote once it is approved.' },
        line_accepted: { message: 'Quote {{quote}} is Accepted, so its line items can no longer be added, changed or removed.' },
        line_rejected: { message: 'Quote {{quote}} is Rejected, so its line items can no longer be added, changed or removed. Revise it back to Draft to change them.' },
        line_expired: { message: 'Quote {{quote}} is Expired, so its line items can no longer be added, changed or removed.' },
        frozen_accepted: { message: '{{subject}} is Accepted; only its Internal Notes can still be edited.' },
        frozen_rejected: { message: '{{subject}} is Rejected; revise it back to Draft to change it. Until then only its Internal Notes can be edited.' },
        frozen_expired: { message: '{{subject}} is Expired; only its Internal Notes can still be edited.' },
      },
    },
    VALIDATION_FAILED: {
      message: '{{subject}} cannot be created as Accepted. A quote starts as Draft, In Review or Presented, and is accepted, rejected or expired from there.',
      status: 400,
      params: ['subject', 'quote'],
      reasons: {
        created_rejected: { message: '{{subject}} cannot be created as Rejected. A quote starts as Draft, In Review or Presented, and is accepted, rejected or expired from there.' },
        created_expired: { message: '{{subject}} cannot be created as Expired. A quote starts as Draft, In Review or Presented, and is accepted, rejected or expired from there.' },
      },
    },
  },
  handler: async (ctx: HookContext) => {
    // The refusal envelope. ⚠️ Mirrored from `src/sales/objects/_refusal.ts` because a lowered
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
    // The settled statuses by the labels the user sees, for the freeze
    // refusals below (#2338 items 12 and 16): each keeps the status's API value
    // in its diagnostic and names it by its label in the `userMessage` the
    // console shows. The labels are written out because a lowered body cannot
    // read the object's metadata; `test/refusal-labels.test.ts` reads them off
    // `crm_quote`. `rejected` joined the settled set with #2366 row 2.
    const STATUS_LABELS: Record<string, string> = { accepted: 'Accepted', rejected: 'Rejected', expired: 'Expired' };
    const { event, input, previous } = ctx;

    // ─── A settled quote's LINES are frozen with it (#2060 item 1, B-09) ──
    //
    // Measured on 17.7.0 before this branch: a rep added a line to an accepted
    // quote (200), `quote_total_rollup` rightly left the settled totals alone,
    // and the quote's lines stopped summing to them. The doc promises the
    // opposite (`content/docs/(product)/sales/quotes.mdx`, "the quote is frozen").
    //
    // The freeze's own boundary, not a second one: USER writes only (a seed or
    // import carries no user and is let through, as below), and an update is
    // judged by what it CHANGES, like `violating` below — `id` addresses the
    // row, `updated_at` / `updated_by` are the engine's stamps (measured on every
    // user update), and `line_number` is the read-only platform ordinal, which
    // the 4.0.0 one-time back-fill touches with `{ line_number: null }` on every
    // unnumbered line, settled quotes included. Both parents are judged, so a
    // line moves neither onto a settled quote nor off one.
    //
    // A user's DELETE of one line is refused too (#2088, ruling C of #2078),
    // and only a hand delete. Deleting the quote, or the account it cascades
    // from, deletes its lines AS THE DELETING USER (measured: each line's
    // `beforeDelete` sees that user), so refusing every line delete would make
    // every settled quote with lines undeletable, against #720. The engine's
    // cascade child delete carries the platform's declared marker
    // `referentialCascadeDelete` (objectstack#23221, 18.0.0-next.2), at any
    // depth, and a hand delete never does: that delete is let through. ⛔ Read
    // nothing else to tell them apart (#1165). Measured on 18.0.0-next.3 before
    // this leg: a rep's REST `DELETE` of an accepted quote's line answered 200.
    if (ctx.object === 'crm_quote_line_item') {
      // `product_title` (#2086) is a name, not a figure, and hooks are its only
      // writers: the engine holds a caller's readonly value back from this hook.
      // A delete removes the line, so it is a change unless the cascade issued
      // it; its quote is the pre-image's `crm_quote`.
      const changed = event === 'beforeDelete'
        ? ctx.referentialCascadeDelete !== true
        : Object.keys(input).some((k) => !['id', 'updated_at', 'updated_by', 'line_number', 'product_title'].includes(k) && input[k] !== previous?.[k]);
      for (const id of new Set([input.crm_quote, previous?.crm_quote])) {
        const q = changed && ctx.user?.id && typeof id === 'string' && id
          ? await (ctx.api as HookApi | undefined)?.object('crm_quote').findOne({ where: { id }, fields: ['name', 'status'] })
          : null;
        if (q?.status === 'accepted' || q?.status === 'rejected' || q?.status === 'expired') {
          // Two sentences, one per reader (#2338 item 16), as the quote's own
          // freeze below and the closed deal's line freeze (item 15) do. A
          // rejected quote's lines are revised once it is back at Draft. The
          // quote is named as its title names it, by its name (#2369 row 10).
          const what = `Quote ${String(q.name)} is`;
          const rest = 'so its line items can no longer be added, changed or removed.';
          const revise = q.status === 'rejected' ? ' Revise it back to Draft to change them.' : '';
          throw Object.assign(refuse(
            `${what} ${q.status}, ${rest}${revise}`,
            'RECORD_LOCKED',
            409,
            `${what} ${STATUS_LABELS[q.status]}, ${rest}${revise}`,
          ), { reason: q.status === 'rejected' ? 'line_rejected' : q.status === 'expired' ? 'line_expired' : 'line_accepted', params: { quote: String(q.name) } });
        }
      }
      return;
    }

    // A quote's own delete is not frozen, settled or not: #720 keeps the
    // records a settled quote references deletable, and #2078 excluded
    // forbidding it. Its lines go with it, through the leg above.
    if (event === 'beforeDelete') return;

    // ─── A quote starts unsettled (#2366 row 3) ─────────────────────────
    //
    // Measured on 18.2.0 before this: a rep's New Quote form offered
    // Accepted, Rejected and Expired, and a REST create at any of them
    // answered 201 — an accepted quote nobody reviewed, presented or got an
    // answer to. The form now withholds the three (`quote.object.ts`, the
    // options' `visibleWhen`), and this is the guard behind it: a USER's create
    // at a settled status is refused. A system write is let through, like the
    // freeze below — the seed and a system import carry settled history.
    // The `userMessage` names the statuses by label.
    if (event === 'beforeInsert' && ctx.user?.id && typeof input.status === 'string' && STATUS_LABELS[input.status]) {
      const named = typeof input.name === 'string' && input.name.trim() ? `Quote ${input.name.trim()}` : 'A new quote';
      const tail = 'A quote starts as Draft, In Review or Presented, and is accepted, rejected or expired from there.';
      throw Object.assign(refuse(
        `${named} cannot be created as ${input.status}. ${tail}`,
        'VALIDATION_FAILED',
        400,
        `${named} cannot be created as ${STATUS_LABELS[input.status]}. ${tail}`,
      ), {
        reason: input.status === 'rejected' ? 'created_rejected' : input.status === 'expired' ? 'created_expired' : undefined,
        params: { subject: named, quote: typeof input.name === 'string' ? input.name.trim() : '' },
      });
    }

    // The quote as every quote surface titles it: its name alone
    // (`crm_quote.nameField`, #2369 row 10), never the record id. Both
    // refusals below name the quote with it.
    function subject(): string {
      const label = typeof previous?.name === 'string' ? previous.name.trim() : '';
      return label ? `Quote ${label}` : 'Quote';
    }

    // `expiration_date`'s 30-day default is the field's own `defaultValue`
    // (`quote.object.ts`, #2060 item 7), which the engine applies before this
    // hook runs, so this hook no longer stamps it.

    // ⚠️ Guard ONLY genuine USER edits (`ctx.user?.id` present). System / seed /
    // backfill writes carry no user and legitimately re-apply business fields
    // (the seed's quote_date/expiration_date re-evaluate on every reboot), so
    // guarding them throws boot-time BodyRunner errors. Matches the system-write
    // convention used across the case/lead/opportunity hooks.
    if (event === 'beforeUpdate' && previous && ctx.user?.id) {
      const frozen = previous.status === 'accepted' || previous.status === 'rejected' || previous.status === 'expired';
      if (frozen) {
        // A REJECTED quote also takes its `status` (#2366 row 2): it is not
        // terminal — the rep revises it by moving it back to Draft, and that
        // move is the one way out. Which moves are legal stays the state
        // machine's (`quote_status_progression`); this freeze judges only that
        // nothing else changes on the same write.
        const allowed = new Set(['internal_notes', ...(previous.status === 'rejected' ? ['status'] : [])]);
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
          const REFERENCE_FIELDS = new Set(['crm_account', 'crm_contact', 'crm_opportunity', 'crm_price_book']);
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

          // Two sentences, one per reader (#2338 item 12): the diagnostic keeps
          // API names and the attempted keys, and the `userMessage` the console
          // shows uses labels — users were shown "…is accepted; only
          // internal_notes may be edited. Attempted: discount.". The full
          // reasoning is on the opportunity freeze; `STATUS_LABELS` is at the
          // top of the handler, shared with the line freeze.
          const what = `${subject()} is ${previous.status as string}`;
          const rejected = previous.status === 'rejected';
          throw Object.assign(refuse(
            rejected
              ? `${what}; only internal_notes and status may be edited — revise it back to draft first. Attempted: ${violating.join(', ')}.`
              : `${what}; only internal_notes may be edited. Attempted: ${violating.join(', ')}.`,
            'RECORD_LOCKED',
            409,
            rejected
              ? `${subject()} is Rejected; revise it back to Draft to change it. Until then only its Internal Notes can be edited.`
              : `${subject()} is ${STATUS_LABELS[previous.status as string]}; only its Internal Notes can still be edited.`,
          ), {
            reason: rejected ? 'frozen_rejected' : previous.status === 'expired' ? 'frozen_expired' : 'frozen_accepted',
            params: { subject: subject(), quote: typeof previous.name === 'string' ? previous.name.trim() : '' },
          });
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
      //     mirror of the live request (`approvalStatusField`);
      //   • `approval_status` anything but `approved` on a deal at or over the
      //     large-deal line → `opportunity_lifecycle`'s refusal of a close-won
      //     (#2334, widened by #2350 ruling B to `not_required` and an unset
      //     verdict too, so a recalled deal or one never sent for approval is
      //     held). Under the line only `pending` holds (the lock), and
      //     `approved` never does. The line is a COPY of
      //     `LARGE_DEAL_AMOUNT`, as in that hook (a lowered body cannot import
      //     it); `test/deal-threshold-parity.test.ts` holds both copies to it;
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
            fields: ['stage', 'amount', 'approval_status', 'status_change_approval_status', 'qualification_approval_status'],
          }).catch(() => null)
          : null;
        // Each hold is named by the field label and value the rep sees on the
        // deal itself, so the sentence points at where to look. At or over the
        // line, the Large Deal Approval holds every verdict but `approved`
        // (#2334, #2350); under it, only a `pending` one (the lock).
        const LARGE_DEAL_AMOUNT = 100000;
        const large = deal ? Number(deal.amount) >= LARGE_DEAL_AMOUNT : false;
        const VALUE_LABELS: Record<string, string> = { not_required: 'Not Required', pending: 'Pending', rejected: 'Rejected' };
        const holds = (d: Record<string, unknown>, f: string): boolean => f === 'approval_status'
          ? d[f] === 'pending' || (large && d[f] !== 'approved')
          : d[f] === 'pending' || d[f] === 'rejected';
        const held = deal && !String(deal.stage).startsWith('closed_')
          ? [['approval_status', 'Approval Status'], ['status_change_approval_status', 'Status Change Approval'], ['qualification_approval_status', 'Qualification Approval']]
            .filter(([f]) => holds(deal, f))
            .map(([f, label]) => `${label} is ${VALUE_LABELS[deal[f] as string] ?? VALUE_LABELS.not_required}`)
          : [];
        // A large deal no request holds (`not_required`, unset) is waiting on
        // nothing: what moves it on is a save of the deal, which sends it for
        // approval — so the sentence says that instead of "once granted".
        const unsent = !!deal && large && (deal.approval_status == null || deal.approval_status === 'not_required');
        // The quote has exactly one opportunity, so "its opportunity" names the
        // deal unambiguously — and ⛔ never by its record id.
        if (held.length > 0) {
          const what = `${subject()} cannot be accepted while its opportunity is held by an approval`;
          const next = unsent
            ? 'Save the opportunity to send it for approval, then accept the quote once it is approved.'
            : 'Accept it once the approval is granted.';
          throw Object.assign(refuse(`${what} (${held.join('; ')}): accepting it would close that deal as won. ${next}`, 'RECORD_LOCKED', 409), {
            reason: unsent ? 'held_unsent' : undefined,
            params: { subject: subject(), quote: typeof previous.name === 'string' ? previous.name.trim() : '', holds: held.join('; ') },
          });
        }
      }
    }

    // ─── The header totals follow their inputs (#2083, #2110) ───────────
    //
    // The quote header's ONE formula, written here and nowhere else:
    //   discount_amount = subtotal × discount%
    //   total_price     = subtotal − discount_amount + tax + shipping_handling
    // Three writers reach it in the same write they make: a person editing
    // `discount`, `tax` or `shipping_handling` — measured on 18.0.0-next.1,
    // that left both figures stale until some line was written, and a quote
    // accepted then drafted its contract at the stale total —
    // `quote_total_rollup`, which writes only `subtotal`, and a create
    // carrying a `subtotal`, `quote_generation`'s draft above all.
    //
    // Both figures are `readonly` (#2110), and this is why they still land:
    // the engine drops a read-only key only when the CALLER sent it, never one
    // a before-hook wrote. The create leg is load-bearing, not tidiness —
    // `quote_generation` runs as the rep, so since the platform's 17.4.0
    // create-path strip its own copy of the two figures would be dropped
    // (measured on 18.0.0-next.3: both stored null).
    //
    // Any writer, a user or not: the rollup's write is how lines reach the
    // header, and seeds replay. ⛔ Never on a quote settled before this write —
    // the freeze above is not reopened, and the rollup skips one too — nor
    // with no `subtotal` to derive from, nor on the predicate path, because
    // it reads `previous` (D3, see `forecast.hook.ts`).
    const settled = previous?.status === 'accepted' || previous?.status === 'expired';
    if (event === 'beforeInsert' || (event === 'beforeUpdate' && previous && !settled && ctx.dispatch?.mode !== 'per-row'
      && ['subtotal', 'discount', 'tax', 'shipping_handling'].some((k) => k in input))) {
      const now = (k: string): number => {
        const v = k in input ? input[k] : previous?.[k];
        return typeof v === 'number' ? v : 0;
      };
      const subtotal = 'subtotal' in input ? input.subtotal : previous?.subtotal;
      if (typeof subtotal === 'number') {
        const discountAmount = Math.round(subtotal * (now('discount') / 100) * 100) / 100;
        input.discount_amount = discountAmount;
        input.total_price = Math.round((subtotal - discountAmount + now('tax') + now('shipping_handling')) * 100) / 100;
      }
    }
  },
};

/**
 * On acceptance: push the linked opportunity to `closed_won`.
 *
 * Deliberately NOT elevated — the reason is on `quote_accepted_contract_draft`
 * (`../flows/quote-accepted-contract-draft.flow.ts`, a hook here until
 * hotcrm#2558): this write stays the accepting caller's, so the opportunity's
 * own guards and an approval's record lock judge it as they always have. A deal an
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
    // A record id or nothing — never boolean `false` (#714: `(a && x) || (b && y)`
    // is `false` when neither holds, and `false` in a lookup is a junk value).
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
      // DELIBERATELY BARE — the one throw in this file the #1075 sweep left
      // alone (the contract draft's, its sibling, is a flow since #2558). Every other
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

/**
 * A quote's price book (REQ-0009 phase 2, #2318).
 *
 * - A quote created without a book gets the organization's active standard
 *   book, so its lines price from it. The field is not `required` for this
 *   reason (the note on `crm_quote.crm_price_book`). The standard-book read is
 *   scoped to the organization the write belongs to, as `price_book_standard`
 *   scopes its own (`price_book.hook.ts`); a system write whose organization
 *   cannot be resolved stamps nothing, and its lines fall back to the
 *   standard book or the product price (`_line-item-price-fill.ts`).
 * - A person may not choose an inactive book; the picker withholds them
 *   (`lookupFilters`), and this refuses one written past it.
 * - A person may not change the book of a quote that already has line items:
 *   each line was priced from the old book, and repricing them silently is a
 *   change to negotiated figures. Removing the lines first is the way through.
 *
 * Priority 210, after `quote_workflow` (200): on a settled quote the freeze's
 * refusal is the one a person reads. USER writes only for both refusals, the
 * boundary the freeze draws: a seed or import carries its own history.
 */
const quotePriceBook: Hook = {
  name: 'quote_price_book',
  object: 'crm_quote',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 210,
  description: "Default a new quote to the standard price book; refuse an inactive book, and a book change on a quote with line items.",
  refusals: {
    VALIDATION_FAILED: {
      message: '{{book}} is not active, and a quote prices only from an active price book. Choose another price book for {{target}}.',
      status: 400,
      params: ['book', 'target', 'subject', 'quote', 'count', 'from'],
      reasons: {
        line: { message: '{{subject}} already has 1 line item priced, so its price book cannot change. Remove the line items first, then choose the price book and add them again.' },
        line_from: { message: '{{subject}} already has 1 line item priced from {{from}}, so its price book cannot change. Remove the line items first, then choose the price book and add them again.' },
        lines: { message: '{{subject}} already has {{count}} line items priced, so its price book cannot change. Remove the line items first, then choose the price book and add them again.' },
        lines_from: { message: '{{subject}} already has {{count}} line items priced from {{from}}, so its price book cannot change. Remove the line items first, then choose the price book and add them again.' },
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
    // A reference arrives as an id, or expanded as `{ id }`.
    function refId(value: unknown): string {
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object' && typeof (value as Record<string, unknown>).id === 'string') {
        return String((value as Record<string, unknown>).id);
      }
      return '';
    }
    const { event, input, previous } = ctx;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;
    if (event !== 'beforeInsert' && event !== 'beforeUpdate') return;
    const has = (key: string): boolean => Object.prototype.hasOwnProperty.call(input, key);

    if (event === 'beforeInsert' && !refId(input.crm_price_book)) {
      const organizationId = [
        ctx.user?.organizationId,
        ctx.session?.organizationId,
        input.organization_id,
      ].find((candidate): candidate is string => typeof candidate === 'string' && candidate !== '');
      if (!organizationId && !ctx.user?.id) return;
      const where: Record<string, unknown> = organizationId
        ? { organization_id: organizationId, is_standard: true, is_active: true }
        : { is_standard: true, is_active: true };
      const [standard] = await api.object('crm_price_book').find({ where, fields: ['id'], top: 1 });
      if (standard && typeof standard.id === 'string') input.crm_price_book = standard.id;
      return;
    }

    // D3: a predicate update hands every row one payload, and the line check
    // below reads `previous` (the note in `forecast.hook.ts`).
    if (!ctx.user?.id || !has('crm_price_book') || ctx.dispatch?.mode === 'per-row') return;
    const next = refId(input.crm_price_book);
    const before = refId(previous?.crm_price_book);
    if (event === 'beforeUpdate' && next === before) return;
    const quoteName = [input.name, previous?.name].find((v) => typeof v === 'string' && v.trim() !== '');
    const subject = quoteName ? `Quote ${String(quoteName).trim()}` : 'This quote';

    if (next) {
      const book = await api.object('crm_price_book').findOne({ where: { id: next }, fields: ['id', 'name', 'is_active'] });
      if (book && book.is_active === false) {
        throw Object.assign(refuse(
          `${String(book.name)} is not active, and a quote prices only from an active price book. Choose another price book for ${subject.replace(/^This quote$/, 'this quote')}.`,
          'VALIDATION_FAILED',
          400,
        ), { params: { book: String(book.name), target: subject.replace(/^This quote$/, 'this quote'), quote: quoteName ? String(quoteName).trim() : '' } });
      }
    }

    if (event === 'beforeUpdate' && typeof previous?.id === 'string') {
      const lines = await api.object('crm_quote_line_item').count({ where: { crm_quote: previous.id } });
      if (lines > 0) {
        const old = before
          ? await api.object('crm_price_book').findOne({ where: { id: before }, fields: ['id', 'name'] })
          : null;
        const from = typeof old?.name === 'string' && old.name.trim() !== '' ? ` from ${old.name.trim()}` : '';
        throw Object.assign(refuse(
          `${subject} already has ${lines} ${lines === 1 ? 'line item' : 'line items'} priced${from}, so its price book cannot change. Remove the line items first, then choose the price book and add them again.`,
          'VALIDATION_FAILED',
          400,
        ), {
          reason: (lines === 1 ? 'line' : 'lines') + (from ? '_from' : ''),
          params: { subject, quote: quoteName ? String(quoteName).trim() : '', count: lines, from: from ? String(old?.name).trim() : '' },
        });
      }
    }
  },
};

export default [quoteValidation, quotePriceBook, quoteAccepted];

// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The refusal envelope, authored once.
 *
 * ### What this file is for
 *
 * ⚠️ A business refusal thrown as a bare `Error` is indistinguishable, to a
 * REST consumer, from the server falling over — the only signal is the message
 * string, which is prose, is localised in places, and is the one part of a
 * refusal that is MEANT to change. The platform maps a thrown error to an HTTP
 * envelope with `resolveThrownHttpError`. Measured on 17.4.0, that mapper reads
 * eight properties off the error — `status`, `statusCode`, `code`, `name`,
 * `fields`, `issues`, `message`, `userMessage` — of which the two that decide
 * the envelope a consumer branches on are `code` and `status`.
 *
 * ### The two facts that shape every decision below
 *
 * **1. ⛔ A guard cannot import this file.** A hook handler is lowered to a
 * metadata-only `body.source` and evaluated inside QuickJS with no module
 * scope. `extractHookBody` does not merely warn — it THROWS:
 *
 *     [hook-body-extract] hook 'x': handler references identifier(s) not in
 *     scope at runtime: refuse. Module-scope helpers/imports aren't shipped
 *     with a metadata-only body, so this handler will be BUNDLED instead …
 *
 * …and the CLI build CATCHES that throw and silently bundles the closure, so an
 * imported helper does not go red — it just stops the hook being shippable as
 * pure metadata. So the helper is INLINED into each handler, the same way
 * `account_protection` inlines the territory table rather than importing
 * `./_territory.ts`. This file is the DECLARATION those copies are held to;
 * `test/refusal-envelope.test.ts` reads each copy back out of the LOWERED body
 * and fails when one drifts.
 *
 * **2. ⚠️ FOUR properties cross the sandbox boundary; `refuse()` sets two of
 * them.** The runner marshals an allowlist — `code` (a non-empty **string**),
 * `status` (a **finite number**), `fields` (an **array**), `userMessage` (a
 * **string** with non-whitespace in it) — and drops everything else; the error
 * is always re-thrown as `SandboxError`. Measured on 17.4.0 by driving the real
 * `QuickJSScriptRunner` rather than by reading the marshaller: `hint` arrives
 * `undefined`, `status: '409'` as a string arrives `undefined`, `code: 4001` as
 * a number arrives `undefined`, `fields` as an object arrives `undefined`, and
 * `userMessage: '   '` arrives `undefined`. `instanceof` and `err.name` are
 * still dead as branchable channels — the host always catches a `SandboxError`
 * named `SandboxError`, and a thrown `name` survives only inside the message
 * prose. So a vocabulary riding a key OUTSIDE that allowlist still passes an
 * in-process test and is silently dead in production.
 *
 * ⚠️ This paragraph said **three** and was anchored to 17.1.0 until #1863
 * re-measured it. `userMessage` is the fourth, and #1869 revisited the
 * signature that count falsified: `refuse()` now takes FOUR arguments and
 * writes THREE properties. The allowlist above is what guards, not the arity.
 *
 * `fields` is allowlisted and still deliberately unused — no consumer reads
 * per-field detail off these refusals, and the mapper already synthesises an
 * empty `details.fields` for `VALIDATION_FAILED` (measured on 17.4.0). Adding
 * it later is additive.
 *
 * ### `userMessage` defaults to the author's message — the reason, measured
 *
 * The platform declares `userMessage` a producer-side opt-in: a consumer
 * renders it verbatim and keeps a generic substitution for everything
 * unmarked. So the default is a real decision, and the opposite one — make
 * every site write it — is right for an app whose refusal prose is addressed
 * to a developer reading a log. ⚠️ Measured before choosing, this app's is
 * not:
 *
 *   1. All 17 call sites carry a business sentence naming a remedy the reader
 *      can act on, and two guards already hold them to that.
 *      `test/record-id-not-in-prose.test.ts` runs the LOWERED bodies under the
 *      heading *refusals a user reads name the record they are about*, and
 *      `test/docs-contact-email-uniqueness.test.ts` ties one of these
 *      sentences to the documentation page a user follows.
 *   2. The default discloses nothing new. Measured on 17.4.0, all five classes
 *      ALREADY reach a REST consumer carrying that same sentence — inside
 *      `hook 'NAME' threw: Error: …`, on `message`. Marking it does not put
 *      author prose on the wire; it puts the sentence on the one channel no
 *      boundary rewraps, which is what the platform declares the key FOR.
 *   3. The argument is therefore the seam for DIVERGENCE, not the opt-in: pass
 *      it where the diagnostic and the user-facing sentence must differ. No
 *      site needs that today, and one that does no longer costs an API change.
 *
 * ⛔ A blank or whitespace-only override is dropped at the boundary, so it
 * suppresses nothing — it only returns the reader to the wrapper. The answer
 * to a sentence that should not be shown is a better sentence.
 *
 * ### Why the codes are the platform's, not this app's
 *
 * ⚠️ The mapper only echoes a `code` that is a member of the platform's
 * `ErrorCode` enum (`@objectstack/spec/api`) — **329** members on 17.4.0,
 * `StandardErrorCode`'s 50 plus `REGISTERED_ERROR_CODES`' 279, where this file
 * recorded 290 on 17.1.0. An invented spelling is not rejected and not lost:
 * measured on 17.4.0, `{ code: 'CRM_DEAL_FROZEN', status: 409 }` maps to
 * `409 / RESOURCE_CONFLICT` with the spelling demoted to `declaredCode`, so the
 * `code` callers branch on is derived from the HTTP status instead. An app
 * dialect would therefore degrade the branchable channel to a status echo.
 * Per-guard specificity may ride `declaredCode` IN ADDITION if a consumer ever
 * needs it.
 *
 * ### Why `status` is not optional
 *
 * ⚠️ Measured on 17.4.0, `resolveThrownHttpError` reads `status` FIRST:
 *
 *     code + status  →  409 / DELETE_RESTRICTED   (declaredCode preserved)
 *     status only    →  409 / RESOURCE_CONFLICT
 *     code only      →  **500** / DELETE_RESTRICTED  ← a business refusal filed
 *     neither        →  **500** / INTERNAL_ERROR       as a server fault
 *
 * Only the code column moved since the 17.1.0 taking: a registered `code` now
 * survives a missing `status` instead of being replaced by `INTERNAL_ERROR`.
 * The status column did not, and status is the half that decides whether a
 * consumer reads a refusal or an outage. `VALIDATION_FAILED` is the single
 * exception — the mapper supplies 400 for that code itself, so that one class
 * survives a dropped status (measured: `400 / VALIDATION_FAILED`, with
 * `details.fields: []`). For the other four a code without a status is still no
 * fix at all. Every entry in {@link REFUSAL_CODES} carries both.
 */

/**
 * The declared refusal vocabulary — one entry per CLASS of refusal, not per
 * guard. `test/refusal-envelope.test.ts` parses every `refuse(...)` call out of
 * the lowered hook bodies and fails on any pair that is not one of these, so a
 * new guard cannot quietly invent a sixth class or misspell an enum member.
 */
export const REFUSAL_CODES = {
  /** A submitted value the object's own rules reject. */
  invalid_value: { code: 'VALIDATION_FAILED', status: 400 },
  /** A value that has to be unique within its scope and is not. */
  duplicate: { code: 'DUPLICATE_VALUE', status: 409 },
  /** The record's own state freezes the field(s) this write touches. */
  locked: { code: 'RECORD_LOCKED', status: 409 },
  /** A delete blocked by records that still reference this one. */
  delete_restricted: { code: 'DELETE_RESTRICTED', status: 409 },
  /** A compliance flag prohibits the action outright — do not retry. */
  prohibited: { code: 'FORBIDDEN', status: 403 },
} as const;

/**
 * The canonical inline helper, as the guards carry it.
 *
 * Compared against each lowered copy with whitespace collapsed — the pin is
 * about what the code DOES, not how a transform chose to indent it. A copy that
 * forgot `err.status`, or grew a FOURTH property in EITHER case, fails; a
 * re-indent does not. Read off the assertion itself, that is its exact reach:
 * it matches `err.` followed by a dot-notation name in any case, so it counts
 * what this helper WRITES — three — and stops there. It was LOWER-CASE only
 * until #1868, i.e. blind to `userMessage`, which is why that repair had to
 * land before this helper could adopt the key at all. Which of those writes
 * survive the sandbox is fact 2 above: three are written, four can cross.
 */
export const REFUSE_HELPER = `function refuse(message, code, status, userMessage = message) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  err.userMessage = userMessage;
  return err;
}`;

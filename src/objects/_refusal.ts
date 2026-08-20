// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The refusal envelope, authored once (#1075).
 *
 * ### What this file is for
 *
 * Every business refusal this app raises used to be a bare `Error`, so a REST
 * consumer could not machine-distinguish "this quote is frozen" from "the
 * server fell over" — the only signal was the message string, which is prose,
 * is localised in places, and is the one part of a refusal that is MEANT to
 * change (#693 / #719). The platform maps a thrown error to an HTTP envelope
 * with `resolveThrownHttpError`, and that mapper reads exactly two things off
 * the error: `code` and `status`. Nothing in this app set either.
 *
 * ### The two facts that shape every decision below
 *
 * **1. A guard cannot import this file.** A hook handler is lowered to a
 * metadata-only `body.source` and evaluated inside QuickJS with no module
 * scope. `extractHookBody` does not merely warn about that — it THROWS:
 *
 *     [hook-body-extract] hook 'x': handler references identifier(s) not in
 *     scope at runtime: refuse. Module-scope helpers/imports aren't shipped
 *     with a metadata-only body, so this handler will be BUNDLED instead …
 *
 * The CLI build catches that throw and silently bundles the closure, so an
 * imported helper would not go red — it would just stop the hook being
 * shippable as pure metadata. So the helper is INLINED into each handler, the
 * same way `account_protection` inlines the territory table rather than
 * importing `./_territory.ts`, and the same way the four campaign refresh hooks
 * inline their recompute block. This file is the DECLARATION those copies are
 * held to; `test/refusal-envelope.test.ts` reads each copy back out of the
 * LOWERED body and fails when one drifts.
 *
 * **2. Exactly three properties cross the sandbox boundary.** The runner
 * marshals an allowlist — `code` (a non-empty **string**), `status` (a **finite
 * number**), `fields` (an **array**) — and drops everything else; the error is
 * always re-thrown as `SandboxError`. Re-measured on 17.1.0 for this change:
 * `hint` arrives `undefined`, `status: '409'` as a string arrives `undefined`,
 * `code: 4001` as a number arrives `undefined`. So a vocabulary riding a fourth
 * key, or on `instanceof` / `err.name`, would pass an in-process test and be
 * silently dead in production. `refuse()` takes three arguments and sets two
 * properties for that reason: its signature is the guard.
 *
 * `fields` is allowlisted and deliberately unused. No consumer reads per-field
 * detail off these refusals today, and the mapper already synthesises an empty
 * `details.fields` for `VALIDATION_FAILED`. Adding it later is additive.
 *
 * ### Why the codes are the platform's, not this app's
 *
 * Ruled 2026-08-16 (「主线1 3 4：同意」). The mapper only echoes a `code` that is
 * a member of the platform's `ErrorCode` enum (`@objectstack/spec/api`, **290
 * members** on 17.1.0, up from the 269 measured on 17.0.0 GA). An invented
 * spelling is not rejected and not lost — it is demoted to `declaredCode` and
 * the `code` callers branch on is derived from the HTTP status instead. So an
 * app dialect would degrade the branchable channel to a status echo. Per-guard
 * specificity may ride `declaredCode` IN ADDITION if a consumer ever needs it.
 *
 * ### Why `status` is not optional
 *
 * Measured on 17.1.0, `resolveThrownHttpError` reads `status` FIRST:
 *
 *     code + status  →  409 / DELETE_RESTRICTED   (declaredCode preserved)
 *     status only    →  409 / RESOURCE_CONFLICT
 *     code only      →  **500 / INTERNAL_ERROR**  ← a business refusal filed
 *     neither        →  **500 / INTERNAL_ERROR**     as a server fault
 *
 * A code without a status is therefore not half a fix, it is no fix at all.
 * Every entry in {@link REFUSAL_CODES} carries both.
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
 * forgot `err.status`, or grew a fourth property that dies at the boundary,
 * fails; a re-indent does not.
 */
export const REFUSE_HELPER = `function refuse(message, code, status) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}`;

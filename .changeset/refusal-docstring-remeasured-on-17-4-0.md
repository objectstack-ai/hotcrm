---
---

Re-measure every version-anchored claim in `src/objects/_refusal.ts` — the file
that declares this app's refusal envelope — against the pinned
`@objectstack/*` 17.4.0, and correct the three that had gone stale. Comments
only: the file's exported `REFUSAL_CODES` and `REFUSE_HELPER` are untouched, and
the built artifact is byte-identical.

The central claim was that **exactly three** properties cross the QuickJS
sandbox boundary — `code`, `status`, `fields` — measured on 17.1.0, three minor
versions back. It is **four**. Driving the real `QuickJSScriptRunner` with a
body that throws an error carrying every candidate key, the host catches a
`SandboxError` whose own keys are `code`, `fields`, `innerMessage`, `name`,
`status`, `userMessage`. `userMessage` crosses whenever it is a string with
non-whitespace in it, and it crosses on its own even when no other allowlisted
key is present.

That count was load-bearing twice, so it was not a one-word edit:

- The paragraph argued that `refuse()`'s three arguments **were** the guard,
  because three arguments exhausted what could cross. They no longer do. The
  signature is now written down as a choice this app has not revisited, and the
  allowlist itself is named as what actually guards. ⛔ The signature is
  unchanged — whether to adopt `userMessage` is a separate design question, and
  smuggling an API change in behind a comment fix is the failure this card was
  fenced against. The cost of not adopting it is measured rather than asserted:
  a hook refusal reaches the mapper with `message` still carrying the
  `hook 'NAME' threw: Error: …` debug wrapper and no `userMessage` field at all.
- The "a key outside the allowlist is silently dead in production" warning is
  kept — it is still true of `hint`, `detail`, `details` and everything else,
  and still true of `instanceof` / `err.name`, since the host always catches a
  `SandboxError` named `SandboxError`. Only the arithmetic was stale, and the
  example it reached for happened to be the one key that had joined.

Two more 17.1.0-anchored claims in the same docstring, neither previously
re-measured:

- The `ErrorCode` enum (`@objectstack/spec/api`) is **329** members on 17.4.0,
  not the 290 recorded on 17.1.0 — `StandardErrorCode`'s 50 plus
  `REGISTERED_ERROR_CODES`' 279. The rest of that paragraph re-measured
  **unchanged**: an unregistered spelling is still demoted to `declaredCode`
  while the branchable `code` is derived from the HTTP status.
- `resolveThrownHttpError` still reads `status` FIRST, but one row of its
  precedence table moved. A registered `code` with no `status` now maps to
  **500 / the code itself**, not 500 / `INTERNAL_ERROR` — the code survives, the
  500 does not change. And `VALIDATION_FAILED` turns out to be an exception the
  table never had: the mapper supplies 400 for that code itself, so that one
  refusal class survives a dropped status. The conclusion is narrowed to what
  was measured instead of being carried over.

One unanchored claim in the same file was false on the same reading and is
corrected: the opening paragraph said the mapper "reads exactly two things off
the error: `code` and `status`". Trapped on real property access, it reads
eight — `status`, `statusCode`, `code`, `name`, `fields`, `issues`, `message`,
`userMessage` — of which two decide the envelope a consumer branches on.

Everything was measured by driving the real runner and the real mapper, never by
reading a marshaller and inferring: reading `readErrorInfo` says what the runner
*can* copy, running it says what a host `catch` actually receives.

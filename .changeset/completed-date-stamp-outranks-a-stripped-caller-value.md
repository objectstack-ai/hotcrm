---
'hotcrm': patch
---

Completing a `crm_task` no longer fails *because* the caller supplied
`completed_date`. `Completed date is required when status is Completed` used to
reject exactly the call that sent the field, and accept the one that omitted it.

The two halves that produced the inversion each read correctly on their own.
`completed_date` is `readonly: true`, and since `@objectstack/objectql@17.4.0`
the engine strips a static readonly field from a non-system caller's INSERT as
well as their UPDATE. The completion hook stamped the field only
`if (!input.completed_date)` — that is, only when the caller had left it empty.
Measured against a running server on the pinned 17.4.0: the hook still sees the
caller's value (the strip runs after `beforeInsert` returns), so a supplied
value suppressed the stamp; the engine then deleted the supplied value, because
a hook-written key is not caller-supplied but a caller-written one is; and the
validation, reading the field as absent, refused the write. Supplying the field
suppressed the one thing that would have rescued it.

The cost of that was paid by automated callers, not by people. The error names
the field whose *presence* caused the rejection, so an agent reads it as a repair
instruction and re-sends the field — 39 `create_record` calls in the session that
reported this, none of which could ever have converged.

The hook now stamps the completion timestamp on the completing transition
regardless of what a non-system caller supplied, which is what `readonly: true`
already promised. A **system** write still keeps its own value: nothing strips a
system write, and `src/data/service.seed.ts` back-dates seeded completions with
`daysAgo(3)` / `daysAgo(2)` — stamping over those would replay the demo book with
every completion dated today.

Measured before and after through `x-api-key` on a running dev server, as the
non-admin demo user the report used: cases 1 and 5 keep their existing behaviour,
cases 2, 3 and 4 turn from `400` into `201`, and the stored `completed_date` is
the server's stamp in every one. No metadata declaration changes — the field
stays `readonly: true` and the validation stays exactly as it was.

---
---

Test-only — this PR ships nothing to HotCRM users, so the frontmatter above is
deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No object, field, predicate, view or doc changes.

It closes a blind spot in `test/object-validation-predicates.test.ts`, the
repo-wide guard for the house rule "validation predicates must be TOTAL". The
sweep's static half greps the operands of ORDERING comparisons for a `!= null`
guard. A predicate whose only null-sensitive site is a **function argument** has
no ordering operator at all, so it passed *vacuously* — green, having checked
nothing. That is the third abort route: `daysBetween(null, …)` reaches
`BigInt(NaN)` and throws inside the stdlib function, the engine reports
`predicate failed to evaluate`, and from 17.0.0-rc.2 an ordinary save is
REJECTED on a record the rule was never meant to touch.

The new sweep does a paren-balanced scan of every function call in every
authored predicate and requires `record.f != null` on every field read inside
one, deny-by-default against a short list of functions measured not to abort on
null (`has`, `isBlank`, `coalesce`). It carries its own vacuity guard: a matcher
that finds zero call sites is green forever and worthless, so it asserts it
reaches a non-zero set of sites and proves both directions of its own matcher
against fixtures.

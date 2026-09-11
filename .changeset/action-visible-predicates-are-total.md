---
'hotcrm': patch
---

Make every action `visible` predicate in `src/actions/` TOTAL, so a record page
stops logging `A conditional predicate failed to evaluate` on every load.

Opening any lead record page printed two console warnings — one for **Convert
Lead**, one for **Schedule Follow-up** — each ending
`Reason: [runtime] No such key: status`. Eleven action predicates across six
files read `record.x` with no `has(record.x)` guard, which the house rule
*Validation predicates must be TOTAL* has required since #630: strict CEL aborts
the whole predicate the moment one key is absent, and an aborted predicate is not
the rule anyone wrote.

**What was actually absent, measured rather than assumed.** Instrumenting the
shipped predicate evaluator in a real browser shows the record page evaluating
each header action's `visible` twice against an **empty** record — zero keys —
before the row arrives, then re-evaluating it against the full row. The stored
row was never the problem: the REST payload this surface reads carries every
declared column, and on `crm_lead` `status` is `required` with
`storage: { notNull: true }` and a `defaultValue`, so a lead with no status
cannot exist. The absent key means *"no record yet"*, never *"a lead with no
status"*.

**So the guards fail closed**, `has(record.x) && record.x …`: an action is not
offered against a record nobody has read yet. That is the policy the platform was
already applying through its own error fallback, now stated in the predicate
instead of reached by way of an exception — the buttons appear and hide exactly
where they did, minus the warnings. The alternative arrangement,
`!has(record.x) || …`, would have bought nothing (there is no statusless lead to
rescue) and cost something real: **Convert Lead** flashing for a beat on an
already-converted or disqualified lead, on an action that is irreversible.

One predicate is deliberately left unguarded: **Claim Case**. Its `visible` is
the `Unassigned Cases — Triage` sharing grant's own text, verbatim, and a sharing
condition compiles to a pushdown filter that rejects `has()` outright — a guard
there makes the rule untranslatable and the seeder drops it. Making that one total
means moving the grant and the button together, which is a decision for the
maintainer rather than a sweep. Both files now say so where the next reader will
look.

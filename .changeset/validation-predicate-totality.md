---
'hotcrm': patch
---

Make every validation predicate TOTAL, so a rule can no longer be silently
skipped on update. A rule is evaluated against `{...previous, ...data}`, and the
engine fills absent fields with `null` **only on insert** — on update, `previous`
is whatever the driver returned. A driver that stores only the columns a row was
actually written with hands back a record with the key **absent**, strict CEL
aborts the whole predicate with `No such key`, and the engine's answer to a
predicate that cannot answer is to skip the rule. No error, no failed save — just
a rule that reads as enforced and requires nothing.

23 of the app's 24 script validations were exposed, including
`crm_lead.disqualification_reason_required`, `crm_task.completed_date_required`
and `crm_case.escalation_reason_required`. Every `record.x` read now carries a
`has(record.x)` guard, and `test/object-validation-predicates.test.ts` enforces
the house rule two ways: a structural check that no predicate reads a field
without a guard, and a run of every predicate through the engine's own
`evaluateValidationRules` against a record with no keys at all, failing on any
"predicate failed to evaluate" warning.

Measured per driver: `driver-sql` and `driver-sqlite-wasm` are column-complete
(`SELECT *` returns NULL for unset columns), so rules already fired there and
their behaviour is unchanged. `driver-memory` and `driver-mongodb` return only
what was written, so on those the affected rules now fire where they previously
did nothing — a record that was accepted before may now be correctly rejected on
update (for example, moving a task to Completed without a completed date).
Refs #630.

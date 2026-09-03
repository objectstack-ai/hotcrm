---
'hotcrm': patch
---

`filter:` on `ctx.api` is a live alias of `where`, not a silent drop — measured,
and the three places that said otherwise now say what was measured.

Three sources in this repo carried two incompatible answers about what happens
when a hook passes `filter:` instead of `where:`:

- `test/hook-query-predicate.test.ts` asserted, against a real engine and green
  in CI, that `filter` is a live predicate alias;
- the `HookQuery` docblock in `src/objects/_hook-api.ts` and `AGENTS.md` §2 both
  said it "fails **silently**" — that `findOne` drops the key and returns the
  object's **first row**, and that `count` counts the **whole object**.

The sharpest form of it was inside a single file: the same green test file both
asserted the alias works and told authors, in its guard's failure message, that
"the kernel drops it and reads the wrong record".

This is not a doc nit, because **the two errors point in opposite directions**.
"Silently dropped" means a hook querying by `filter` matches every row — an
unscoped read. "Aliased" means it matches correctly. An author who believes the
wrong one mis-judges the blast radius of every `filter` call site, and the stale
belief is the one that errs unsafely.

**Measured**, per method, against the pinned `@objectstack` packages (17.2.0),
on the object the kernel injects as `ctx.api` — a real `ScopedContext` over a
real ObjectQL engine, not the test harness:

| method | `filter:` behaviour |
|:--|:--|
| `find` | **aliased** to `where` — predicate applied |
| `findOne` | **aliased** to `where` — predicate applied |
| `count` | **aliased** to `where` — predicate applied |

`update` and `delete` fold the same key on their options bag. Nothing is
dropped: the engine rejects any option it does not recognise, so `filters`
(plural) and every misspelling **throw**, and `findOne` with no predicate at all
throws rather than returning an arbitrary row. On this version a bad predicate
key cannot produce an unscoped read.

The measurement carries negative controls, because a green that also appears
when the apparatus is dead proves nothing. An unrecognised key (`wibble:`) must
throw — that is what a key this engine does not know does, and if it ever passes
silently the alias greens stop being evidence. The no-match probes carry the
rest of the weight: a dropped predicate and an applied one are indistinguishable
when the probe matches, and separate only on a predicate matching nothing, where
"applied" gives the empty answer and "dropped" gives the unfiltered one. Both
stale alternatives — the first row, the whole object — are now asserted against
by name. An apparatus control asserts the engine discriminates at all (an
unfiltered read returns 3, a scoped read returns 1), so an engine that ignored
predicates entirely could not read as a pass.

**The `where`-only convention and its repo-wide guard are unchanged.** Only the
stated reason changes, and it is still a real one: mixing the spellings is the
live hazard. A query assembled in two places that ends up carrying both keys
with different values throws `Conflicting options … 'where', 'filter' are
spellings of the same parameter`, and an empty `where: {}` counts as a different
value rather than as "no opinion" — so a base predicate plus a `filter:`
override is a runtime throw, not a merge. One spelling makes that unreachable,
and `HookQuery` still omits the alias so the mistake stays a compile error.

The history is kept and dated rather than deleted: the repo really did pay for a
silent drop once, seventeen hook calls whose predicate vanished, on a kernel
that is not the one pinned here. The failure that produced this card is prose
written against a real measurement that later stopped being true and then
travelled, so the test file's header now says explicitly which paragraphs are
history and which are measurements of the currently pinned engine.

`AGENTS.md` also stopped citing `.changeset/hook-query-where-not-filter.md`,
which no longer exists — that changeset was consumed at release and the record
lives in `CHANGELOG.md`.

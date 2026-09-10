---
---

Comment text and one character class — this PR releases nothing to HotCRM
users, so the frontmatter above is deliberately empty (the sanctioned "releases
nothing" declaration `.github/workflows/changeset-check.yml` documents). No
executable line under `src/` changed: `REFUSAL_CODES` and `REFUSE_HELPER` are
byte-identical and `dist/objectstack.json` is byte-identical either side.

`test/refusal-envelope.test.ts` mirrored the claims `src/objects/_refusal.ts`
made about the QuickJS sandbox boundary, and those claims were taken on 17.1.0.
PR #1867 re-measured them against the pinned 17.4.0 under an epic fence that
told it to report and not edit. This is that report discharged.

**The guard could not fail on the key it exists to catch.** The assertion
titled "sets exactly the two properties that cross the sandbox boundary"
matched `/err\.[a-z]+ =/g` — a lower-case-only character class, so a camelCase
write onto the refusal was invisible to it. `userMessage` is precisely the key
the 17.4.0 re-measurement added to the sandbox allowlist, so the one write the
guard most needed to see was the one it could not. Measured, on disk, against
the real suite:

| body under test | before | after |
|:--|:--|:--|
| as declared | passes | passes |
| `+ err.userMessage = …` | **passes** | **fails** |
| `+ err.hint = …` | fails | fails |

The class is now `[A-Za-z_$][A-Za-z0-9_$]*`. Nothing else about the assertion
moved: same file, same input, same expected value, no new case.

**Its title claimed a different list from the one it measures.** It named the
properties that *cross* the boundary while counting the properties `refuse()`
*writes*. Until 17.4.0 those were the same two, which is how the looseness went
unnoticed; they are no longer — four cross, this app writes two. The title now
names the written set, and the comment states the assertion's exact reach
(dot-notation writes, in either case) so the next reader does not over-read it.
The crossing set stays pinned where it belongs, in the file header.

**Two sentences were false on 17.4.0 and are re-anchored to it.** The file
docstring said the sandbox marshals "exactly three properties" and offered "a
fourth key" as its example of an envelope that would be silently dead — the
allowlist is four, and the fourth key is `userMessage`, which crosses. The
precedence comment said a code without a status "still falls through to
500 / `INTERNAL_ERROR`"; on 17.4.0 the status half holds and the code half does
not — `code only` maps to 500 carrying the code itself, and `VALIDATION_FAILED`
does not fall through at all, because the mapper supplies 400 for that code.
Neither reading is renumbered from the old text: both are #1867's measurements,
taken by driving the real `QuickJSScriptRunner` and the real
`resolveThrownHttpError`, and both now carry their `17.4.0` anchor explicitly.
An unanchored claim cannot advertise its own staleness, which is why the
version is written down rather than assumed.

The neighbouring claim that a bare `Error` maps to 500 / `INTERNAL_ERROR`
re-measured unchanged and is untouched. `refuse()`'s signature is untouched.

One clause outside `test/` moved, because this diff is what made it false.
`src/objects/_refusal.ts`'s `REFUSE_HELPER` docstring described the assertion
being repaired — "it matches `err.` followed by a LOWER-CASE name", and "a copy
that … grew a third LOWER-CASE property fails". Both are accurate descriptions
of the code before this change and inaccurate after it, so they are corrected
in the same commit instead of being left behind it.

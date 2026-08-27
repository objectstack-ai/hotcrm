---
---

Tooling and tests only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration `.github/workflows/changeset-check.yml` documents). No `src/`
metadata changed: no object, field, view, label or hook handler logic, and no
threshold, constant or scanned file set moved. `pnpm hygiene` reads exactly the
files it read before; only what it PRINTS changed.

`scripts/check-source-hygiene.mjs` opened every run with a single sentence —
*"Source hygiene — 340 files under src, test, e2e, scripts, plus 3 root .ts
file(s) in the marker and header checks; …"*. That leading figure is
`codeFiles.length`, every file type the walk returns, while the marker and
copyright-header checks named in the same clause read `allTs`: `.ts` only, 329
of them. The clause bound a figure to two checks that never open 14 of the files
it counts, and a reader taking the sentence at face value got 343.

The gap is not a stale constant that could be corrected once. It widens on its
own: every non-`.ts` file added anywhere under the scanned trees moves
`codeFiles.length` and leaves `allTs` alone. The PR that landed
`scripts/lib/source-hygiene-surface.mjs` moved it from 13 to 14 without going
near this line.

The banner is now one line per surface, each count printed beside the checks
that consume it — `.ts`-only for the marker and header checks, the walked trees
for the size cap and its advisory, `src/` for `console.log` and the id-in-prose
rule, and the union for the byte scan. Nothing was deleted: `codeFiles.length`
is a live reading and keeps its line next to the two checks that actually
measure that set. Every figure is interpolated from the same array its checks
are handed a few lines below, so the two cannot drift apart again.

`test/source-hygiene-scan-surface.test.ts` asserts the binding rather than
trusting it, on a sandbox built so the two figures disagree — three `.ts` files
under the code trees against nine files in the walk. A green run could not have
shown this: the gate was green before the fix too. Printing the walk figure in
the marker clause turns that case red, which was confirmed by doing it.

---
---

Extend the source hygiene gate's control-byte scan to `content/` and
`.changeset/`, the two first-party text trees it could not see (#818).

The scan added in #686 read `src`, `test`, `e2e` and `scripts` — the same
directory list the three code-level checks use. That list is right for them and
wrong for a byte-level check: `content/` holds every product documentation page
in three locales, `.changeset/` holds a file that every PR is required to add,
and both are pure text. #807 changed four files and this gate judged one of
them.

The gap matters because of how the defect hides. One raw control byte makes
grep and ripgrep classify the entire file as binary: `grep -rn` answers
`binary file matches` instead of line hits, and the `-l` / `-c` forms most
sweeps use report nothing at all. `content/` is one of the most grep-ed trees
in the repo and the read surface of several documentation guards, which read it
with `readFileSync` — and `readFileSync` does not care about control bytes at
all. So the first thing to break is not CI, it is the ability of a human or an
agent to find anything in that file.

Only the control-byte check moves. The other three keep their existing surface,
which was measured rather than assumed: `console.log` is already `src/`-only
and appears legitimately in the docs — the three marketplace
`publishing-your-first-app` pages instruct the reader to run
`node -e "console.log(...)"` — the marker check reads `.ts` files and these two
trees contain none, and the 100KB cap's remedy — "split the file" — is a review
argument about modules that does not transfer to documentation pages. Whether
docs want a size ceiling is a separate question (#814), not a silent side
effect of this change.

Both trees were already clean, so the gate lands green; the byte scan's surface
roughly triples (244 code files, plus 379 under the two text trees).
`test/source-hygiene-scan-surface.test.ts` pins both
halves of the split — that a control byte under `content/` or `.changeset/` is
now reported with file, line, byte value and column, and that the other three
checks did **not** widen with it.

Tooling only — no CRM metadata changes, nothing ships to users.

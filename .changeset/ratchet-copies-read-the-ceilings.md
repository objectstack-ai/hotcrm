---
---

Repo tooling only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). Same route as
`.changeset/interaction-ceiling-reanchored.md`.

`scripts/check-source-token-ratchet.mjs` computes every figure it needs —
`CEILINGS`, `BUFFER`, `anchor()`, and the readings it prints. Two artefacts
restated those figures by hand and nothing compared the copies to the producer,
so each was in permanent tension with the ratchet it describes: a shrink-only
ceiling is *meant* to be tightened, and every legitimate tightening falsified a
copy. That is not hypothetical — the previous re-anchoring had to buy a fence
extension to rewrite one of them, and found the other already false.

Both copies now read the producer.

**The test fixtures.** `test/source-token-ratchet.test.ts` imports `CEILINGS`,
`BUFFER`, `anchor()` and `fmt()` from the gate it runs. The in-buffer case sizes
its scope as `ceiling / (1 + BUFFER)` — the reading whose `anchor()` *is* that
ceiling, which is what "inside the buffer" means — and asserts headroom
relatively, as `ceiling - reading` in the gate's own formatting. The
over-ceiling case likewise sizes itself from the committed ceiling and reads its
over-by figures back off the measurement instead of quoting `~86,005`. Both
cases pin exactly what they pinned before, and now follow the constant instead
of breaking on it.

**The docstring's worked table.** A new pin parses the three rows out of the
script source and asserts, per row, that the printed ceiling is the committed
constant, that it equals `anchor(reading)`, that the product is
`Math.round(reading × (1 + BUFFER))`, that the multiplier is the ruled buffer,
and that headroom and percentage are the derivations of that row's own numbers.
It also asserts there is exactly one row per committed ceiling, in order, and
that each row's date names the anchoring run its reading came from — the column
added when the three rows stopped coming from one run.

Those assertions are deliberately **internal to each row plus the committed
constant**. A row's `headroom` is the headroom at anchor time, not a live
figure; comparing it against what the gate prints today would be wrong by
design, and the pin does not do it.

`BUFFER` and `fmt` are newly exported for this; no value moved. No ceiling was
touched — not `40000`, not `85000`, not `140000`. `tsconfig.json` gains
`allowJs: true` so `tsc` can type the gate's exports at the import site from the
producer itself, rather than from a hand-written declaration file that would be
one more copy of the same kind.

No `src/` metadata changed; the app bundle is byte-identical.

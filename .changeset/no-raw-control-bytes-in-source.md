---
---

Rewrite the two raw NUL bytes in `test/seed-consistency.test.ts` as the escape
sequence `\u0000`, and add a control-byte scan to the source hygiene gate (#686).

The composite-key separator those tests join on was written as a literal NUL
byte rather than an escape. One raw control byte makes grep and ripgrep classify
the **entire file** as binary: `grep -rn` answers `binary file matches` instead
of line hits, and the `-l` / `-c` forms most sweeps use report nothing at all.
The file had silently dropped out of every text search over the repo — found
during the `owner` sweep in #548, where this file happened to hold no matches,
so nothing was missed by luck rather than by design. The defect hides itself:
any later sweep reads clean while skipping the file entirely.

The separator itself was never the problem and does not change. `\u0000` denotes
the same single code unit, so the joined keys are byte-identical at runtime and
the tests assert exactly what they asserted before.

`scripts/check-source-hygiene.mjs` now also fails on any raw control byte
(everything except tab, LF and CR) in `src`, `test`, `e2e` and `scripts`, so a
second occurrence cannot reach `main`. A NUL-only check would not have been
enough — `0x01` and friends produce the same binary classification, which is why
the scan covers the whole class. It reads files as latin1 so each byte maps 1:1
to a code point; utf8 decoding folds an invalid byte into U+FFFD, outside the
control range, and a byte-level scan would have missed it.

Tooling and test hygiene only — no CRM metadata changes, nothing ships to users.

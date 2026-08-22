---
'hotcrm': patch
---

Gate the copyright header's position in `scripts/check-source-hygiene.mjs`, and
move the header back to line 1 in the eight files that had drifted below an
import.

The gate is the change; the eight files are what made it green. All eleven
instances of this drift came from one mechanical 836-file commit that prepended
an import above the header; no gate saw it, and cleaning it up by hand took two
issues and two PRs (#1091 fixed three, this fixes the other eight). The new
check requires the header to be the
first line of every `.ts` file under `src/`, `test/`, `e2e/` and `scripts/`,
with a shebang as the only thing allowed above it — the one construct whose
position is load-bearing. A missing header is an error too, since all 282 `.ts`
files already carry one and a position-only rule would be satisfiable by
deleting it.

There is no path list and no skip-list, so a new file with the header in the
wrong place goes red. Each of the three failure shapes — displaced, absent,
pushed off column 1 — reports its own message naming the case and the fix.

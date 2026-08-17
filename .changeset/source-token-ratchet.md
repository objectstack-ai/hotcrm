---
---

Add a source token ratchet: a shrink-only ceiling on the authored surface,
measured in estimated tokens and printed on every CI run (#1183).

HotCRM's headline positioning claim — the entire enterprise CRM fits in a single
agent context window — is a number, and until now no gate measured it. It
drifted: the README quoted a hand measurement that no longer matched the tree,
and nothing anywhere could have noticed. `scripts/check-source-token-ratchet.mjs`
is now the one place that measurement is defined, so a doc that cites it cites a
command anyone can re-run.

What it measures, per the maintainer rulings of 2026-08-17: comment-stripped,
blank-stripped `src/**/*.ts`, **minus `src/translations/` and `src/data/`**
(「translations + seed 肯定是不需要算 token 的」 — a fifth locale or a richer demo
dataset is healthy growth and must never compete with business logic for the
budget). It reports the two layers the maintainer asked customers to be shown —
business semantics (`objects` + `flows` + `actions` + `hooks`) and interaction
layer (`views` + `pages` + `dashboards` + `apps`) — plus the residual and the
authored total, which carries its own ceiling so nothing under `src/` can grow
unwatched in a directory that is in neither layer.

Anchored from a real run on the landing branch (2026-08-17, base `2342811a`):
business semantics ~80,411 tokens, interaction layer ~39,259, authored total
~133,533. Ceilings are those readings rounded up to the next 1,000 — an anchor,
not a growth budget. Lowering a ceiling is free and encouraged; raising one
requires a maintainer ruling quoted in the raising PR.

The measure is comment-stripped, so comment-slimming work does not move these
numbers — by design. Comments are for the humans and agents reading the repo,
and a gate that rewarded deleting them would be a gate against explanation. The
stripping rule is a character scanner (strings and regex literals keep their
contents; a `//` inside an action body's template literal is authored surface,
not a comment) and is stated in the script header so the number is reproducible
and arguable.

Runs in both `CI` and `Code Quality`, and in `pnpm verify` as `pnpm hygiene:tokens`.
`test/source-token-ratchet.test.ts` pins the measurement basis, the red paths,
and the CI wiring itself.

Tooling only — no CRM metadata changes, nothing ships to users.

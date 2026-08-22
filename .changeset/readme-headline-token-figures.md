---
'hotcrm': patch
---

State HotCRM's positioning claim as the two measured numbers the gate prints,
and hold the README to them (#1187).

The README banner sold the app as "~170k tokens of typed ObjectStack metadata
(~18,000 lines)". Both figures were a hand measurement of a tree that had since
moved, and nothing anywhere could have noticed — the number a reader meets first
was the one number in the repo with no source. It now reads as the two layers
the maintainer asked customers to be shown, each taken from
`scripts/check-source-token-ratchet.mjs`:

- **business semantics** ~81k tokens — objects, flows, actions, hooks: every
  business rule an agent must hold to change behavior safely;
- **interaction layer** ~39k tokens — views, pages, dashboards, app shell.

Translations and seed data stay outside the count, by the maintainer ruling that
set the accounting basis (「translations + seed 肯定是不需要算 token 的」): a fifth
locale is healthy growth, not business logic, and must never compete with it for
the budget. The banner says so, so a reader comparing the figure against the size
of `src/` is not quietly misled.

The claim is now self-defending. `test/docs-drift.test.ts` parses both figures
out of the banner and compares them against a live `--json` run of the gate, so
the next drift fails CI instead of surviving to the next audit. The band is the
maintainer's already-ruled 5% working buffer (「给 5% 缓冲」) rather than a fresh
tolerance invented for the README — the same 5% the ratchet's ceilings carry. That
is what keeps this a fix and not a recurring chore: the measurement moved
80,411 → 80,356 → 81,233 → 80,767 in one working day as four ordinary PRs landed,
crossing the ~80k/~81k rounding boundary twice, and a rule demanding the banner
equal today's rounded reading would have required a README PR for each. Under the
ruled buffer the banner and the ratchet ceiling go stale at nearly the same
reading, so re-stating the claim is a maintainer decision rather than merge
overhead.

---
---

Gate and documentation only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration
`.github/workflows/changeset-check.yml` documents, on par with the `skip-changeset` label).
The diff opens `scripts/`, `test/`, `README.md`, `.github/tasks/` and `docs/architecture/`;
it opens no file `objectstack build` reads — not `objectstack.config.ts`, not
`objectstack.composition.ts`, not one line under `src/` — so the published artifact and the
`content/docs/` documentation site are byte-identical to `main`.

**The token ratchet went from one ceilinged package to four.** Maintainer ruling, verbatim
and kept untranslated:

> 「1928 门禁 改为 多 sales 模块的门禁」

Until now `scripts/check-source-token-ratchet.mjs` ceilinged `src/sales/` alone and printed
`src/service/`, `src/revenue/` and `src/marketing/` with no ceiling — explicitly so that the
per-module budget ADR-0130 §4 promises would have real starting figures. This spends them:
every package carries its own `business semantics`, `interaction layer` and `authored total`
ceiling, twelve in all, each `anchor()` of that package's own reading under the same ruled 5%
buffer (「给 5% 缓冲」) that set the committed ones.

They are four **independent** gates, not one gate over a wider surface. A module past its own
ceiling reddens that module and leaves the other three green, so `src/marketing/` cannot spend
headroom `src/sales/` is not using and a sales feature cannot be paid for by a quiet module —
a single summed ceiling permits both while staying green.

The package roster is now **read off disk** (a directory under `src/` with an `objects/`
directory — the same predicate `test/helpers/src-roster.ts` uses since #1940), so a fifth
package is seen the day it lands; the gate then refuses to run until that package has a
ceiling, because a package with no ceiling reads exactly like a package under its ceiling.
Committing a package's first ceiling is an anchoring, not a raise, and needs no ruling.

Unchanged on purpose: the measure is still comment-stripped (a gate against explanation is
not a gate anyone should want), `translations/` and `data/` are still outside the ratchet
entirely in every package, and the README banner is still pinned to `src/sales/`'s reading
alone — ADR-0130 §1.3(b) is a claim about the package a customer installs.

---
---

Gate and test documentation only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing" declaration
`.github/workflows/changeset-check.yml` documents, on par with the `skip-changeset` label).
The diff touches `scripts/check-source-token-ratchet.mjs`, two files under `test/` and this
changeset; it opens no file `objectstack build` reads — not `objectstack.config.ts`, not
`objectstack.composition.ts`, not one line under `src/` — so the published artifact and the
`content/docs/` documentation site are byte-identical to `main`. This follows #1928's
precedent, which raised two of these same ceilings and declared itself the same way.

**The two `src/sales` ratchet ceilings rise to `business semantics = 59,000` and
`authored total = 107,000`.** Maintainer ruling, verbatim and kept untranslated, given on
#1951 to letter A (「raise them to the `anchor()` of the post-#1916 readings, 59,000 and
107,000」):

> 「同意」

They are `anchor()` of a reading — `ceil(reading × 1.05 / 1000) × 1000` on 55,986 and
101,395, the readings PR #1950's tree prints — so the ruled 5% working buffer (「给 5% 缓冲」)
is the whole of the raise and the kind stays `ANCHORED`. ⛔ Not 57,000 / 103,000: that pair
carries a 1.8% buffer while claiming to follow the 5% rule, and the ruling names it and
refuses it.

Unchanged on purpose: `src/sales`'s `interaction layer` ceiling (31,000), every ceiling of
`src/service/`, `src/revenue/` and `src/marketing/`, the measurement basis, and the README
banner — which is pinned to the measured reading, not to a ceiling (「解耦:banner 钉实测,
ceiling 独立」), and `origin/main`'s reading did not move.

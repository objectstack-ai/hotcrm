---
'hotcrm': patch
---

Re-anchor the business-semantics token ratchet to 100,000 on a maintainer ruling,
and decouple the README banner from the ceiling.

Maintainer ruling, 2026-09-05, quoted verbatim and untranslated as
`scripts/check-source-token-ratchet.mjs`'s own header requires of any PR that
raises a ceiling:

> business-semantics 棘轮 提升到 100000

and the shape it was given, from the same exchange, 选项 A:

> 解耦:banner 钉实测,ceiling 独立

**What moved.** `CEILINGS['business semantics']` 85,000 -> 100,000. The
interaction layer (40,000) and the authored total (140,000) are untouched — the
ruling names one layer. The README banner now states the measurement instead of a
figure that had drifted from it: business semantics ~81k -> **~85k** (measured
84,579), interaction layer ~39k -> **~37k** (measured 37,429). Both rows move,
because the rule that governs them is one rule.

**Why it is not a constant change.** The banner and the ceiling used to be tied
together: `test/docs-readme-token-figures.test.ts` asserted that each layer's
banner band closed *above* its committed ceiling, and reasoned from that the
ratchet would fail first on growth. With that coupling intact, raising the
ceiling would not have created headroom — the banner band's upper edge would have
become the effective cap, and the assertion would simply have gone red. So the
two numbers are separated and each is given one job. The ceiling is the growth
budget, alone. The banner rule becomes a truthfulness rule: the README figure
must track the measured reading within the ruled 5% buffer. It caps nothing; it
stops the README advertising a size the app does not have. The case is re-aimed,
not deleted, and the case tying each row's restated ceiling to `CEILINGS` stays —
that is what stops the README quoting a ceiling the gate no longer commits.

**A ceiling can now be RULED rather than anchored.** Every ceiling until now was
`anchor(reading)` — a reading the gate printed, plus the buffer, rounded up. A
maintainer grant is not derived from any reading, and on this layer none could
derive it: anchoring to 100,000 would need a reading between 94,286 and 95,238
and the tree measures 84,579. The header records it as a ruled ceiling and
deliberately writes no worked row for it, rather than reverse-engineering a
reading that would produce the constant.

`test/source-token-ratchet.test.ts` learns that second kind. It modelled every
ceiling as `anchor()` of a measured reading, so a maintainer grant could not be
expressed in it at all. It now parses a ruled row as well as a worked one, still
asserts one row per committed ceiling in the committed order, and keeps every
anchored-row case exactly as it was. The kind is not a free choice: a ruled row
must restate the committed constant, and no reading recorded in the header may
anchor to it — which is what stops a ceiling being filed as "ruled" to dodge
arithmetic that did in fact apply. That is a new invariant, so the suite is
strictly more expressive than before, not weaker.

Two consequences are recorded in the header rather than silently absorbed. The
gate's opportunistic-tightening advisory now fires on this layer every run,
suggesting a re-anchor down to ~89,000 — following it would hand back the
headroom the ruling created, so a ruled ceiling is not tightened on that line
alone. And the shrink-only "declined as a raise" line for business semantics is
retired: at a 100,000 ceiling its `anchor()` lands below, so the reasoning that
line recorded no longer describes the layer.

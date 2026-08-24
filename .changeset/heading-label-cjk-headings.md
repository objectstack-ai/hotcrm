---
---

Test tooling only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). Same route as `.changeset/heading-label-explicit-id.md`,
the previous change to this same helper.

The docs-drift guard's `headingLabel()` stripped its leading run with
`/^[^A-Za-z]+/` — "everything that is not a Latin letter" — so a heading
containing no Latin letters at all was stripped down to nothing. Four of the
nine `## ` headings on each of the two zh `analytics/dashboards` pages
(`五个仪表盘`, `你可以改什么`, `数字是从哪里来的`, `提示` and their zh-Hant
counterparts) therefore shared one label: `""`. Both consumers key on label
equality — the coverage test builds a `Set` where the four dedupe to one, and
the per-dashboard rule does `.find(s => headingLabel(s.heading) === d.label)`
and takes the first hit — so the collapse was real but unreachable only because
every dashboard `label` happens to be English today.

The leading strip is now a named `LEADING_ORNAMENT` class: emoji
(`\p{Extended_Pictographic}`) with the modifiers, regional indicators, variation
selectors and ZWJ that spell a full emoji sequence, plus `\p{P}`, `\p{S}` and
whitespace. It keeps letters and digits in **every** script, so `## 提示`
resolves to `提示`.

The classes were read off the headings the pages actually ship rather than
enumerated, and two of them are load-bearing rather than defensive:
`\p{Extended_Pictographic}` is used instead of `\p{Emoji}` because `\p{Emoji}`
is true for ASCII `0`-`9`, `#` and `*`, which would eat the ordinal off
`## 1. The home dashboard`; and `\p{Variation_Selector}` is required because
`☎️` is two code points (U+260E + U+FE0F) and U+FE0F is neither `\p{Emoji}` nor
`\p{S}` nor `\p{P}` — without it the label for `## ☎️ Sales Activity` keeps a
stray U+FE0F and stops matching the `Sales Activity` dashboard.

Swept before landing, over the three pages `headingLabel()` is applied to: 27
`## ` headings, 8 labels move, **0 of them with a non-empty old label**, and the
set of headings matching each of the five registered dashboard labels is
unchanged (3 before, 3 after, for every label). No rule's behaviour changes.

`test/heading-label.test.ts` pins both ends. The regression test's baseline is
still the old `/^[^A-Za-z]+/` strip, but it now enumerates the moves that are
allowed instead of forbidding all of them: a heading whose old label was
non-empty must come through byte-identical, every heading the old strip emptied
must now carry its own text, and none of the freed labels may land on a
registered dashboard's label. A new test adds the page-level invariant — no two
`## ` headings on one page resolve to the same label — which is red on the zh
pages without the strip fix, and is what turns the old dormancy from a
coincidence into something enforced.

No `src/` metadata changed; the app bundle is byte-identical.

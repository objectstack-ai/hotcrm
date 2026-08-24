// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * A fumadocs **explicit heading id** — `## 📈 Sales Performance [#sales-performance]`.
 *
 * This is fumadocs' OWN regex, copied verbatim from `fumadocs-core@16.9.3`
 * (`dist/mdx-plugins/remark-heading.js` — the version `apps/docs/package.json`
 * pins, rendering the same `content/docs` tree the drift guards read):
 *
 * ```js
 * const regex = /\s*\[#(?<slug>[^]+?)]\s*$/;
 * ```
 *
 * It is copied rather than re-derived because both details that bite are easy
 * to get subtly wrong from memory:
 *
 * - the spelling is `[#id]`, **not** `{#id}`. A `{…}` in an `.mdx` heading is
 *   parsed as a JSX expression and takes the whole page's build down with
 *   `Could not parse expression with acorn` — measured, and recorded in #935.
 *   `{#id}` is not an uglier second spelling; it is a page that cannot ship.
 * - the body is `[^]+?` (lazy, any character including newline), not
 *   `[^\]]+`. On `Foo [#a] [#b]` fumadocs strips from the FIRST bracket —
 *   rendered text `Foo`, id `a] [#b` — where `[^\]]+` would strip only the
 *   last one and disagree with the page a reader actually sees.
 *
 * The anchor at `$` is what keeps this narrow: an id is only an id when it
 * ends the heading, so `## Foo [see #935]`, `## Foo [docs](/x)` and
 * ``## Foo `[#x]` `` all keep their tails. That mirrors fumadocs, which reads
 * an id off a trailing **text** node only.
 */
export const EXPLICIT_ID = /\s*\[#(?<slug>[^]+?)]\s*$/;

/**
 * The **ornament run a heading opens with** — the emoji in `## 🎧 Customer
 * Service`, and any punctuation, symbols or whitespace around it.
 *
 * ## Why this is not `/^[^A-Za-z]+/` (#1272)
 *
 * It used to be. That rule strips everything that is not a Latin letter, so a
 * heading carrying no Latin letters at all is stripped down to nothing.
 * Measured on `origin/main` @ `bd61468a`, before this change:
 *
 * ```
 * content/docs/analytics/dashboards.zh-Hans.mdx | headings: 9 | resolve to "": 4
 *   -> ["五个仪表盘","你可以改什么","数字是从哪里来的","提示"]
 * content/docs/analytics/dashboards.zh-Hant.mdx | headings: 9 | resolve to "": 4
 *   -> ["五個儀表板","你可以改什麼","數字是從哪裡來的","提示"]
 * ```
 *
 * Four different sections on each zh page shared one label, `""`. Both
 * consumers key on label equality — the coverage test builds a `Set` of labels,
 * the per-dashboard rule takes the FIRST `.find()` hit — so the moment a
 * dashboard `label` is localized, a rule would read the page intro's tile
 * bullets and report clean about a section it never opened. Dormant, not
 * harmless, and the same "guard goes green on the wrong input" class as #935.
 *
 * ## Why these classes, and not the obvious ones
 *
 * The classes come from the headings the pages actually ship, not from an
 * enumeration of today's five emoji — an enumeration is a fix that breaks on
 * the sixth.
 *
 * - `\p{Extended_Pictographic}`, **not** `\p{Emoji}`. `\p{Emoji}` is true for
 *   ASCII `0`-`9`, `#` and `*` — they carry Emoji=Yes so keycap sequences can
 *   be formed — so it would eat the ordinal off `## 1. The home dashboard` and
 *   hand a rule the label `The home dashboard`. That is the over-permissive
 *   direction `test/heading-label.test.ts` exists to forbid.
 *   `\p{Emoji_Component}` is out for the same reason: it also contains them.
 * - `\p{Variation_Selector}` is load-bearing, not defensive. `☎️` is TWO code
 *   points, U+260E + U+FE0F, and U+FE0F is not `\p{Emoji}`, not `\p{S}` and not
 *   `\p{P}` — it is a mark. Drop this class and the label for
 *   `## ☎️ Sales Activity` keeps a stray U+FE0F and stops matching the
 *   `Sales Activity` dashboard. It is the one way this change could have broken
 *   a live rule, and the reason the class was read off the real headings.
 * - `\p{Emoji_Modifier}` (skin tones), `\p{Regional_Indicator}` (a flag is two
 *   of these and neither is Extended_Pictographic) and `\p{Join_Control}` (the
 *   ZWJ inside a sequence like 👨‍👩‍👧) are the emoji spellings these pages do not
 *   use yet but a translator can reach for.
 * - `\p{P}`, `\p{S}` and `\s` are the punctuation half of "emoji/punctuation
 *   run", and what lets the separator after an emoji go with it.
 *
 * What it deliberately does not strip is a letter or a digit in ANY script, so
 * `## 提示` resolves to `提示` rather than to `""`.
 */
export const LEADING_ORNAMENT =
  /^[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\p{Variation_Selector}\p{Join_Control}\p{P}\p{S}\s]+/u;

/**
 * A docs heading reduced to the label a guard can compare against metadata:
 * the leading ornament run dropped so `## 🎧 Customer Service` matches the
 * dashboard's `label`, and a trailing explicit id dropped so
 * `## 📈 Sales Performance [#sales-performance]` matches it too (#935).
 *
 * The id half is not cosmetic. Every section heading on the three
 * `content/docs/analytics/dashboards*.mdx` pages opens with an emoji, so
 * `github-slugger` gives them all a leading-hyphen slug (`-sales-performance`)
 * and the one clean way to write a stable anchor at such a section is an
 * explicit id. Stripping only *leading* non-letters rejected exactly that: the
 * coverage guard reported
 *
 *     content/docs/analytics/dashboards.mdx has no section for: Sales Performance.
 *
 * about a page whose `## 📈 Sales Performance [#sales-performance]` section was
 * sitting right there. The message names the heading TEXT, so the next reader
 * re-reads the words and never suspects the matcher — which is why this was
 * filed as a guard defect rather than a docs one.
 *
 * Tolerating the id does not loosen the rule the guard exists to enforce.
 * fumadocs does not render the id, so two headings that differ only in their id
 * show a reader the same words and SHOULD resolve to the same label; headings
 * whose visible text differs still resolve apart. Both directions are pinned in
 * `test/heading-label.test.ts` — a guard that goes green by getting more
 * permissive would let a section match a dashboard it does not document, and
 * report clean about a section it never read.
 */
export const headingLabel = (h: string): string =>
  h.replace(EXPLICIT_ID, '').replace(LEADING_ORNAMENT, '').trim();

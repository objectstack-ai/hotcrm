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
 * A docs heading reduced to the label a guard can compare against metadata:
 * leading emoji dropped so `## 🎧 Customer Service` matches the dashboard's
 * `label`, and a trailing explicit id dropped so
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
  h.replace(EXPLICIT_ID, '').replace(/^[^A-Za-z]+/, '').trim();

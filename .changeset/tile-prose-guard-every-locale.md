---
'hotcrm': patch
---

The dashboards docs guard now reads tile references in the Chinese pages' running
prose, not only the English page's.

`test/docs-drift.test.ts` carries two dashboards rules: every tile BULLET must
resolve to a widget on that dashboard, and every `**Name** tile` reference
anywhere in the prose must resolve to a widget on some dashboard. #685 put
`content/docs/analytics/dashboards.zh-Hans.mdx` and `.zh-Hant.mdx` under both, but
only the first one actually reached them — the second keyed on the English word
"tile", and the zh pages say `**Quiet 90+ Days** 磁贴 / 磁貼`, so their prose was
never read. The tile LISTS were checked the whole time; the sentences around them
were not.

Nothing on the pages was wrong. Both tiles their prose names — `Quiet 90+ Days`
and `SLA Compliance` — are real widgets, which is why this shipped as a dormant
coverage gap rather than a live defect. It is worth closing because the defect
class has appeared in exactly this shape before: the `Slipping Deals` tile that
#610 removed was named in the Tips prose, not only in a list, and the zh copies of
that sentence were part of what #685 had to retranslate.

The noun now comes from a `TILE_WORDS` table (`tile` / `tiles` / `磁贴` / `磁貼`)
that the pattern is built from, so a fourth locale is a word rather than a regex
edit. Two details of the match moved with it. The separator between the bold name
and the noun is now zero-or-more whitespace instead of one-or-more, because
Chinese typography does not require a space there and the unspaced spelling would
otherwise have stayed unchecked — the same hole in a new dress. And the trailing
word boundary is now a lookahead for an ASCII word character: a JavaScript `\b` is
defined against both of its neighbours, so it never matches after a Chinese
character and would have made the new alternatives inert. The English half accepts
exactly the strings it accepted before, and its hit set is unchanged.

References read across the three pages go from 2 to 6. A new assertion probes each
locale's word directly, spaced and unspaced, so narrowing the pattern again fails
straight away instead of staying green on the English hits alone — which is what
the existing vacuity guard, a union count over all three pages, would have done.

Fixes #725. Follows #685 and #610.

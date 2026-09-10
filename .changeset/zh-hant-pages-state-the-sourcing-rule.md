---
'hotcrm': patch
---

Every Traditional Chinese documentation page now says, in one identical sentence
at the top, that the application ships no Traditional language pack — and what
that means for the interface names the page spells.

## Why the pages needed it

The zh-Hant documentation face has no application locale behind it.
`src/translations/` and `supportedLocales` carry `en`, `zh-CN`, `es-ES` and
`ja-JP`, and no Traditional pack. So a Traditional page naming a button, a view
or a navigation path has no Traditional source to take the wording from, and
until now each page answered that on its own: seven pages explained the
convention in a parenthetical, and the rest simply followed it in silence.

A reader met the result as an inconsistency. `reference/security-and-compliance`
spells more English navigation paths than any page that explains why it does.

## What a reader sees now

One sentence, identical on all 67 pages, immediately under the page title:
interface nouns take the zh-CN pack wording written in Traditional characters
where the pack carries them, and otherwise keep the English label exactly as the
product ships it — never an invented Traditional translation.

The seven existing parentheticals are untouched. They explain something
narrower and page-specific (why *that page's* navigation paths are in English),
they were corrected once already, and rewriting them was the drift this repo has
paid for before.

## The rule behind it

`AGENTS.md` §Documentation discipline now states the sourcing order itself,
rather than leaving each page to improvise one. The reason it gives is the
measured one, as a single chain: no Traditional pack exists, which is *why* the
console falls back to Simplified, which is why a Traditional page labels
platform navigation in English instead of mixing scripts. Those had been two
separate explanations of the same fact; they are now one.

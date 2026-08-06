---
'hotcrm': patch
---

Bring the Chinese contracts pages' closing *Sharing* paragraph up to the
measured `controlled_by_parent` reach, so zh readers stop getting the pre-#694
account-scoped story.

`content/docs/revenue/contracts.mdx` was rewritten in #699 to say that neither
route an admin can take actually delivers "contracts follow the account" today:
a sharing rule on Contract widens the records it matches for every holder of the
object, and a Controlled-by-Parent OWD derives org-wide in this release — the
parent link is not consulted per caller. That rewrite landed on the English page
only. `contracts.zh-Hans.mdx` and `contracts.zh-Hant.mdx` still told readers the
two routes merely "open contract visibility to every user of the object", which
omits the conclusion the correction exists to deliver: the narrow route the
reader is looking for does not exist.

Both translated paragraphs now carry the same three facts as the English page,
and both point at the *Controlled by Parent, in practice* section of
`content/docs/administration/sharing-and-security.mdx` by its translated section
name — `“由父级控制”在实践中` / `「由父層控制」在實務中` — on top of the
page-level link they already had. No new anchor link is introduced: the
translated headings do not slugify to the English anchor, so the zh pages keep
the un-anchored form used since the #868 anchor sweep, and the English page
itself cites the section as plain text too.

Documentation only, Chinese pages only. No English page, metadata, profile,
sharing-rule or OWD change — the reach being described is unchanged and stays
pinned by `test/parent-derived-reach.test.ts`.

---
'hotcrm': patch
---

The home page's AI card no longer names a retired assistant persona, and it now
sends you to the entry point the product documentation describes.

The right-hand card on the Sales Home page read:

```
Today with Copilot
Ask the Sales Copilot
Open the floating Copilot (bottom-right) and ask "what should I focus on
today?" — it sees your live pipeline, schema, and accounts.
```

Two things were wrong with that, and both were visible to a user today — this is
interface copy, not documentation. **The persona does not exist**: the app's own
`sales_copilot` agent was retired long ago, and AI capability is implemented by
agents on the platform side while HotCRM contributes domain skills, so a card
inviting you to "ask the Sales Copilot" names an entity this app does not
contain. **The entry point was wrong too**: the card described a floating widget
in the bottom-right corner, while the assistant is the chat panel the platform
opens from the right edge of every page — the wording the `AI Copilot` docs
section already uses. Whichever of the two was accurate, users were being given
two different places to look.

The card now reads:

```
Today with the AI Assistant
Ask the AI Assistant
Open the assistant panel from the right edge of the page and ask "what should I
focus on today?" — it sees your live pipeline, schema, and accounts.
```

What the card *does* is unchanged — same card, same position on the page, same
suggested question, same statement about what the assistant can see. Only the
name and the directions changed.

This was the last live persona mention outside the documentation. The prose
sweep shipped separately and its guard is scoped to the documentation tree, so
this string sat outside every check: `os validate` and `pnpm lint` walk metadata
shape and treat a card's `title` and `description` as free text. A pin in
`test/metadata-references.test.ts` now holds this card to the platform-assistant
wording. Note that card-level copy has no locale keys — the translation contract
carries page `label` / `description` / `title` / `subtitle` only — so this card
renders the English string in every locale, exactly as it did before (#1004).

Fixes #1002.

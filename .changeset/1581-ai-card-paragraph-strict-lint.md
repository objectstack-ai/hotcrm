---
'hotcrm': patch
---

The "Ask the AI Assistant" card on Sales Home now shows its paragraph, and `pnpm lint` fails on warnings

**What users see.** The **Ask the AI Assistant** card on Sales Home used to
show only its title. Its paragraph was stored in a place the card does not
draw. The card now shows it in all four languages: "Open the assistant panel
from the right edge of the page and ask 'what should I focus on today?' — it
sees your live pipeline, schema, and accounts."

**For developers.** `pnpm lint` now runs `objectstack lint --strict`, so a
warning fails it the way an error already did. Suggestions still never fail
it. `pnpm verify` and the CI lint step both run `pnpm lint`, so a change that
adds a lint warning now turns them red. The paragraph was the last warning
standing, so `main` starts at 0 errors and 0 warnings.

The paragraph's four translations moved out of the language packs
(`pages.sales_home_page.components.ai_briefing.description`) and into the page
itself, next to the copy. The packs have no key for this kind of text.

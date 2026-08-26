---
'hotcrm': patch
---

Drop the `label` key from every `list.tabs[]` entry, because the console has
never rendered it. The object-view switcher builds its tab strip from the view
definitions — each tab is a *view* descriptor, so the string in the tab is that
view's own `label`. All 60 tab entries across the 12 view files carried a
`label` of their own, and 50 of them said something other than what the tab
actually reads: `{ name: 'map', label: 'Map', view: 'account_map' }` renders as
"Accounts by Location", and "Map" appears nowhere on the page.

Nothing users see changes. What changes is what the next author can believe. A
maintained string that never reaches the screen is not cosmetic drift, it is a
trap: editing `label: 'Map'` to fix what a customer reads accomplishes nothing,
and the file gives no way to discover that. #760 is that failure caught in the
wild — it was filed to rename a tab believed to read "Closing Soon", the
authored string sitting beside `closing_this_quarter`. The tab reads "Closing
This Quarter", the view's own label, which was the correct string all along; the
user-facing defect the issue was filed for did not exist. Under ADR-0049 a
declared-but-unenforced key is enforced or removed, and removing it makes
"write a tab name that does nothing" structurally impossible rather than merely
discouraged.

**To rename a tab, rename the label of the view it points at.** That string is
the one on screen, and it is the one the locale packs already translate — which
is also why no translation face is lost here: `tabs[].label` had no `_tabs` key
in the object translation schema, so it could only ever have been hardcoded
English, and it was never rendered in any language.

`name`, `icon`, `view`, `isDefault` and `pinned` are left exactly as they were;
only `label` is removed. `test/view-tab-label-inert.test.ts` pins the absence so
the key cannot return one entry at a time — which is how it accumulated.

This does not touch `userFilters.tabs[]`, a different key that reuses the same
`ViewTabSchema` on page lists (ADR-0047). Its `label` **is** read, and is
translated; nothing here should be read as a claim about it.

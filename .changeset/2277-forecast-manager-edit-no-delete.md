---
"hotcrm": minor
---

**A sales manager edits every forecast and can no longer delete one (#2277).**

Who can do what on forecasts:

- A Sales Manager still reads every rep's forecast and edits any of them, and can still reassign one to another owner.
- Deleting a forecast is now an administrator action only. A sales manager's delete is refused (403).

**Why it changed.** The Sales Manager profile said "no delete" on forecasts. But it also granted *Modify All*, and *Modify All* includes delete, so a manager could in fact delete any forecast. The documentation already said a manager cannot delete one. Now the product matches it. The edit reach comes from a new built-in sharing rule, **Forecasts — Sales Manager Edit**. It grants edit on every forecast to the `sales_manager` position. An edit share never grants delete. Forecasts stay private to their owners for everyone else.

**FROM → TO.** A sales manager who deleted forecasts, for example to hand a hand-entered quarter back to the nightly snapshot, now asks an administrator to do it. Nothing else changes, and no data migration is needed.

This also clears the profile entry that `@objectstack/spec` after 18.1.0 refuses at build: `allowDelete: false` beside `modifyAllRecords: true` (objectstack-ai/objectstack#25707).

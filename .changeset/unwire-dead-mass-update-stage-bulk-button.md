---
'hotcrm': patch
---

Stop shipping the dead "Update Stage" bulk button on the Opportunity list.
Selecting deals and clicking it did nothing at all — no records were written,
no request was even sent, and the console still reported "Action completed
successfully" — so a rep watched a stage move succeed and then found the
pipeline unchanged, which reads as lost data rather than as a feature that
isn't ready. The button is now simply absent: stage moves happen on the
pipeline kanban board (drag a card between columns), by editing the Stage cell
inline in the grid, or on the deal record itself, all of which save correctly.

Nothing else about the action changed — its definition, labels and translations
stay in place, so the button returns in the release that fixes the underlying
bulk-selection defect (#508). A metadata test now fails the build if the button
is re-listed before that fix lands.

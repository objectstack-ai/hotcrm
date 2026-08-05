---
'hotcrm': patch
---

Complete the English view labels, and guard the class that nothing was watching:
every saved list view now has a label entry in all four locales, checked against
the views the stack actually ships.

Nine saved views had no `_views` label entry in the `en` bundle — `crm_task`'s
"My Priority Tasks" and "Open Tasks · Most Overdue First", `crm_lead`'s "Hot
Leads", `crm_account`'s "Upcoming Renewals" and "At-Risk Accounts",
`crm_case`'s "My Open Cases" and "SLA at Risk", and `crm_opportunity`'s "Stale
Opportunities" and "Closing This Quarter" — while zh-CN, ja-JP and es-ES all
carried the full set. Every entry added here is the view's own metadata label
verbatim, so no name a user reads changes.

Nothing on the English screens was wrong, and that is exactly why it went
unnoticed for so long: a missing key falls back to the label in the view
metadata, which in the source locale is already correct English, so a gap and a
correct entry render identically. It matters because the English bundle is the
shape every other bundle is authored from — a view with no slot there is a view
the next translator has nowhere to put — and because English silently tracked
any rename of the metadata label while the other three locales kept translating
the old name, with nothing red.

The guard is the durable half. `objectstack lint` never covered this surface —
the `lint` script passes `--skip-i18n`, and even without the flag app-authored
view labels are not in the set it checks — so three new assertions derive the
canonical view set from the compiled stack and require that every view has a
label in every locale, that no locale carries an entry for a view the stack no
longer ships, and that the English entry stays byte-identical to the metadata
label it stands in for, which turns a silent rename into a failing test.

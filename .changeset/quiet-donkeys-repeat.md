---
"hotcrm": patch
---

Scope the Opportunity "Closing This Quarter" list to deals that actually close this quarter.

The view was labelled "Closing This Quarter" in metadata and in all four locales while its
filter carried no condition on `close_date` at all, so it returned every open commit and
best-case deal whenever it was due to close — a deal slated for next March sat under the
heading, and a rep who summed the Amount column got a number that was not this quarter's
commit. The filter now windows `close_date` to the current quarter, using the platform's
own date macros (`{current_quarter_start}` … `{current_quarter_end}`), which the ObjectQL
read path substitutes server-side.

Scoping the list makes an empty result reachable — near the end of a quarter, or in an org
whose commit has slipped — so the view now carries an empty state explaining what it lists
and where the later deals are, translated in all four locales. The labels are unchanged:
they were right all along; the filter was the part that lied.

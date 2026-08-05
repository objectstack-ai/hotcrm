---
"hotcrm": patch
---

Forecast "This Quarter" list view now actually shows this quarter

Opening **Forecasts → This Quarter** returned every quarterly snapshot ever taken — every settled quarter of every year — with the current one merely sorted to the top. All four locales named it "This Quarter" / 本季度 / Este trimestre / 今四半期, so anyone who trusted the heading and read the Quota column down was adding one quarter's target to another's.

The view is now filtered to the current quarter (`period = quarter` **and** `period_start = {current_quarter_start}`), which is the same period key the Sales dashboard's *Quota Attainment by Rep* table pins. Both halves are needed: the period type alone spans years, and the start date alone merges the quarter row with the month row that opens the same quarter.

The restriction had been removed on the ground that the list data path could not resolve a date macro. That was true on ObjectStack 16.1.0 and is no longer: filter placeholders have been resolved on the server's read path since 17.0.0-rc.0, which is what this app has been running for several releases.

**What you will notice:** the view is empty until the nightly forecast sweep has opened the current quarter — the same honest-empty state the quota table already shows at a quarter boundary. It now says so, in every language, instead of showing a blank grid. Settled quarters are on the **All** tab.

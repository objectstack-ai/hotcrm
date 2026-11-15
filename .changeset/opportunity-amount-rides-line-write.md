---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A deal's amount always equals its lines, even when lines arrive back to back.** The opportunity amount rollup (`opportunity_amount_rollup`) now runs inside the line write instead of after it: a line is saved together with the amount it makes, and a line whose deal an approval locked a moment earlier is refused (409 `RECORD_LOCKED`) and not stored. Before, three products added in quick succession to a 40,000 deal were all saved, the second one sent the deal for approval at 114,000, and the third was left out of the amount without a word, so the approver was asked to sign 114,000 while the lines added up to 162,000 (#2493).

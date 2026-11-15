---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**An accepted quote's total always equals its lines, and so does its contract, even when a line and the acceptance are saved together.** The quote total rollup (`quote_total_rollup`) now runs inside the line write instead of after it, and when it finds the quote accepted, rejected or expired after the line freeze let a person's line in, it refuses the line with the freeze's own message (409 `RECORD_LOCKED`) and the line is not stored. The contract drafted on acceptance (`quote_accepted_contract_draft`) now takes the quote's stored total instead of the figure read before the acceptance was written. Before, five lines and the acceptance sent at the same moment on a 19,000 quote could store one line and accept the quote at 19,000 while its lines summed to 20,000, with the contract drafted at 19,000 and nothing logged (#2503).

---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A campaign can start and end on the same day (#2633).** Saving a campaign whose Start Date and End Date were the same day was refused with "End Date must be after Start Date", so a webinar or a one-day trade show could only be saved by typing the next day as its end. That shifted the campaign's length and the nightly auto-complete by a day. The rule now refuses only an End Date that is earlier than the Start Date, and its message says so in every language: "End Date cannot be earlier than Start Date", 结束日期不能早于开始日期, "La fecha de fin no puede ser anterior a la de inicio", 終了日を開始日より前にすることはできません. The rule's name changes from `end_after_start` to `end_not_before_start` to match. The campaign pages of the documentation site and the in-app Marketing manual describe the new rule. Contracts and forecasts are unchanged: their end date must still be after their start date.

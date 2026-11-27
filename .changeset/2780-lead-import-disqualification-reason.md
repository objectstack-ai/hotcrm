---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Sales: an unqualified lead can be imported, with its reason (#2780).** The lead import mapping (`crm_lead_import`) turned the statuses *Disqualified* and *Closed - Not Converted* into **Unqualified**, but had no column for the **Disqualification Reason** the lead requires, so every such row was refused and the file could not be repaired. The mapping now has a **Disqualification Reason** column that takes HotCRM's options and common words from other systems (*Bad Fit*, *Budget*, *Wrong Contact*, *No Response*, *Lost to Competitor*), plus **Need Type** and **Estimated Amount** columns, because a **Qualified** lead needs both: 8 of the 50 rows of the shipped leads template were refused for that reason, and the template now imports whole. A row with an unqualified status and no reason is still refused with the lead's own message, and no reason is filled in for you; a lead disqualified as a duplicate and a converted lead still cannot come in through a file. The leads template and the import guide, in English, Simplified and Traditional Chinese, show the new columns. Saved mappings need no change.

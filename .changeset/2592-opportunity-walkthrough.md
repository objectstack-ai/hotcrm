---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Opportunity walkthrough fixes (#2592, #2573, #2574, #2599).** **Win Reason** and **Loss Reason** appear only on a deal closing that way: at Closed Won or Closed Lost, or while a request to close it that way waits on the status-change approval. On an open deal neither is shown, inline edit included, and the server refuses a write that puts one there, so an import or an API call cannot either; a row that already holds a reason keeps it, and an edit that does not send the reason is not refused. A task's or meeting's **Related Opportunity** picker no longer offers lost deals (narrowing it to the activity's own account waits for a platform release). **Clone Opportunity** moves from the record header to the **⋯** menu. On a product's page, the **Opportunity Line Items** tab lists each line's deal, quantity, sales price and total instead of the product's own name on every row.

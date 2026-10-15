---
"hotcrm": patch
---

**A refused lead conversion no longer tells the rep the lead was converted.** Convert Lead refuses three kinds of lead: one whose Duplicate Status is Confirmed, one whose Conversion Approval is Pending or Rejected, and one whose company has no match key. Each refusal opened a dialog with a Submit button, and clicking Submit showed "Lead converted successfully!" although nothing had been converted.

The refusal now ends the conversion on the spot. The dialog shows the same explanation, opening with "Conversion refused", and offers Close only: no Submit and no success message. Which leads are refused is unchanged, and a refused conversion still creates nothing and leaves the lead as it was. A run started through the API reports the conversion as `refused`, with the explanation, rather than pausing on a screen.

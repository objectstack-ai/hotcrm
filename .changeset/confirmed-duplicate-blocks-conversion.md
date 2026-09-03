---
'hotcrm': patch
---

**The app now refuses to convert a lead whose duplicate status is Confirmed.**
This is a behaviour change: a conversion that used to go through is now stopped.

`crm_lead.duplicate_status` carries two different kinds of fact on one field.
`suspected` is a machine's guess — `lead_duplicate_check` writes it at intake
when a re-captured email matches an existing record. `confirmed` is a person's
verdict — a reviewer opened both records, compared them, and said yes. Until now
the app treated the two the same at the moment of conversion: #1207 warned on
`suspected` and let the rep decide, and `confirmed` was not consulted at all, so
the lead a reviewer had already ruled a duplicate converted into a second
account, a second contact and a second opportunity for the same buyer.

**What happens now.** Clicking **Convert Lead** on a `confirmed` lead opens a
refusal instead of the conversion screen. It names the verdict that stopped it —
the lead's Duplicate Status is Confirmed, recorded by a reviewer — and sends the
rep to the **Duplicate Management** section on the lead, where the surviving
record is linked and clickable. Nothing is created: every write in the
conversion sits behind the screen this path never reaches. The right next step
for a confirmed duplicate is disqualifying it as one, which `crm_lead` already
requires a named survivor for.

**What deliberately did not change.** A `suspected` lead still gets #1207's
warning and still converts. The matching behind that flag is email equality, so
shared inboxes (`info@`, a switchboard address) and a second real enquiry from
the same company make false positives certain; blocking on a guess would leave
the seller in a dead end with no way out but a review queue, and the only
comfortable way out of that dead end would be an override flag — the kind of
escape hatch that gets set by default. Interception stands on a person's
judgement, and only on that.

**Clearing the verdict restores conversion.** A reviewer who decides the lead is
not a duplicate clears `duplicate_status`, and the lead converts as before —
including when the link to the other record is left in place, because the
refusal reads the verdict and not the link. Note the one asymmetry, which
predates this change: clearing the *link* alone on a `confirmed` lead tombstones
it (`duplicate_of_type` becomes Erased) and the verdict deliberately survives,
so that lead stays refused until the verdict itself is revised.

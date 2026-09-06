---
'hotcrm': patch
---

The FAQ answer *"The Copilot won't answer about a specific customer"* stops promising
an **AI redaction rule** that ships nowhere.

`reference/faq` line 116 told admins they could "block the Copilot from referencing
flagged accounts (e.g., VIP, in litigation)", and that "The Copilot says so explicitly".
No such control exists, in any of the three faces. Resolved against the installed
platform (`@objectstack/* 17.3.0`): none of the eleven shipped settings namespaces
carries a redaction or sensitivity key, no Setup entry names redaction, sensitivity or
masking in any of the four shipped locales, and `src/` carries no VIP, litigation or
AI-exclusion flag for anything to read. The platform's only `redactFields` belongs to an
object's `publicSharing` block — the fields stripped from share-token responses — and has
nothing to do with the Copilot.

This is the risk worth naming: nothing leaks. The bullet is dangerous the other way
round. An admin who believes flagged-account blocking is sitting there to be switched on
may never configure the control that is actually doing the work, and a false control
placed next to a true one can quietly substitute for it.

So the line becomes a denial that hands the reader the real mechanism: field-level
security. The Copilot reads as the signed-in user, so a field masked on their profile
never reaches it — which is what `administration/sharing-and-security` already says in
its own words, FLS being enforced for the Copilot exactly as it is for list views,
reports and the API. It is permission-shaped visibility, not per-account blocking, and
the replacement is careful not to claim otherwise.

The same claim in checklist form was corrected on `administration/setup` section 14; the
two pages now deny it in the same voice and send the reader to the same page.

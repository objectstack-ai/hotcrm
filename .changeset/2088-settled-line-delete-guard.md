---
'hotcrm': patch
---

**A line item can no longer be removed from an accepted or expired quote, or from a closed deal.** Since earlier releases these lines could not be added or changed, but a rep could still delete one from the quote's Line Items panel or the deal's Products panel, or over the REST API, and the delete went through. The quote or deal kept its settled total, so its remaining lines no longer added up to it.

Deleting one line of an accepted or expired quote, or of a closed-won or closed-lost deal, is now refused with the same lock as adding or changing one (409, `RECORD_LOCKED`). The message now names all three: *"Quote QTE-0007 - Annual Renewal is accepted, so its line items can no longer be added, changed or removed."* and *"Opportunity Acme Renewal is closed (closed_won), so its line items can no longer be added, changed or removed."* (FROM *"…can no longer be added or changed."*). Lines of a draft, in-review, presented or rejected quote, and of an open deal, are removed as before. Deletes made by imports and other system writes that carry no signed-in user are not affected.

Deleting the whole quote or the whole deal is not affected: its lines are deleted with it. Nor does this add any refusal to deleting an account. HotCRM tells such a delete apart from removing one line by hand using the cascade-delete signal that ObjectStack 18.0.0-next.2 added (objectstack#23221). The Quotes and Opportunities guides now say so, in all three languages.

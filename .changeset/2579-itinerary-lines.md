---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**Itinerary lines on a travel request: the legs of a trip, one by one (REQ-0011, #2579).** A travel request's page gains **Itinerary Lines** (`crm_expense_request_line`, 「行程明细」): each leg has a **Kind** (Flight, Train, Car, Hotel, Other), **From** and **To**, a **Start Date** and an optional **End Date** (for a hotel, the check-out day), **Details** and a **Booking Reference**, and the legs are listed in the order of the trip. A leg has no amount: the request's Estimated Amount stays the one total. Lines are optional; a request with none submits and is approved as before. From the moment the request is submitted, a leg's kind, places, dates and details are held, and no leg can be added, removed or moved to another request: such a change is refused with a message saying only the Booking Reference can still be written; the **Booking Reference** stays writable at every status, so the traveler, an assistant acting as the traveler, the approver or whoever books writes the confirmation after approval. A rejected or recalled request opens its legs again. Who reads the request reads its legs; a write needs edit on the request.

---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Generate Quote refuses an impossible validity on the field, and keeps the form open (#2396).** On an opportunity, **Generate Quote** with **Valid For (Days)** at 0 or fewer used to fail the whole quote ("Expiration Date must be after Quote Date") and leave only **Close**, so the rep had to start again. The form now refuses the number on the field, keeps every answer and **Next**, and the rep corrects it and goes on.

**Discount %** now declares the 60% ceiling on the form field too. A caller that submits the form through the API or an AI agent is refused on the field with the form kept, and can resubmit a corrected discount. In the console a discount above 60% still ends the dialog with "Discount cannot exceed 60%" for now: the platform sends the percent box's value as text, which its field check does not read. The console picks up the field check once the platform fix (objectstack-ai/objectstack#30178) ships. The 60% ceiling itself is unchanged, and a quote edited directly is still held to it.

---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Renewal Notice (Days) is capped at the renewal sweep's 120-day look-ahead (#2534).** The daily renewal sweep only looks at contracts ending in the next 120 days, but the field accepted any number. A contract saved with 180 got its renewal task and notification 120 days before the end date, 60 days later than asked, and nothing said so. The field now accepts 0 to 120: a save asking for more is refused with "Renewal Notice (Days) must be ≤ 120", and the value already on the contract stays as it was. The field's limit and the sweep's look-ahead are now one number, so they cannot drift apart. The in-app manual (Contracts, and the automation table in the admin manual) and the docs site now state the limit.

Existing contracts are not changed. A contract stored with more than 120 days before this release keeps its value, and the sweep still reminds it 120 days out, as before. A save that sends the field, with the old value or a new one above 120, is refused until the value is lowered to 120 or less. A save that does not send the field, such as an import or integration update to another column, still goes through.

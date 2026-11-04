---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**The billing hand-off of an activated contract carries its signed date (#2325).** When a contract is activated without a Signed Date typed in, HotCRM stamps today's date on it. That stamp used to be written by a second save after the activation, so the `crm.contract.activated` event sent to your billing endpoint had already been built from the activating save and carried `"signed_date": null`, although the contract itself showed the date. The stamp is now part of the activating save, so the event carries the same date the contract stores. A date typed in the activating edit, or already on the contract, is kept unchanged in both places. Nothing else in the payload changes, and the account still moves to *Customer* as before.

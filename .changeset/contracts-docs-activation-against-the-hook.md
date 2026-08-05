---
'hotcrm': patch
---

Rewrite the Contracts page's "On contract activation" section against the hook
that actually runs, in all three languages. Three of its four steps had no
implementation behind them, and the one thing activation really does was missing.

`contract_on_activation` (`src/objects/contract.hook.ts`) does exactly two things
when a contract's status changes to *Activated*: it stamps **Signed Date** on the
contract when the contract carries none yet, and it sets the account's **type** to
*Customer* when the account is not already one. The page documented neither the
signed-date stamp nor the true promotion condition, and promised three things
instead:

- a **Customer Since** date stamped on the account — `crm_account` has no
  `customer_since` field, and no field of any name records when an account became
  a customer, so the cohort report a reader would build on it cannot exist;
- a **welcome email** to the primary contact, "(configurable)" — no outbound
  customer mail is sent at activation and there is no setting behind one, the
  same promise `content/docs/sales/contacts.mdx` made and lost in #796;
- a **notification** to the account owner — the hook raises none, for the account
  owner or the contract owner. The two contract `notify` nodes that do exist
  belong to the daily expiration and renewal sweeps, not to activation.

The surviving step is also stated more tightly than "if it was a Prospect": the
hook promotes every account that is not already a *Customer*, so a *Partner* and a
*Former Customer* are promoted too. Two mechanics that decide whether anything
happens at all are now written down — the writes run after the save with failures
logged rather than raised, and they hang off an **update**, so a contract that
arrives already *Activated* (data import, seed data, an integration writing the
record in one shot) triggers neither and leaves its account a *Prospect*.

The admin tip on the same page is corrected with it: contract activation is an
object hook, not a flow, so an admin who followed it to the flow list found
nothing to customize.

Documentation only — no metadata, behaviour or field changes. Whether HotCRM
*should* send a welcome email or carry a `customer_since` field is a product
decision and stays open; this change only stops the docs from claiming it already
happens. Fixes #805.

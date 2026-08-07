---
'hotcrm': patch
---

Upgrade the platform to ObjectStack 17.0.0-rc.4, which changes who can see a
record whose sharing is Controlled by Parent — Contacts, Quote and Opportunity
Line Items, Event Attendees and Campaign Members.

Through 17.0.0-rc.3 those objects were readable, and writable, by every user
whose profile granted the object at all. The engine resolved "which parents can
this caller reach" from the parent object's row-level security policies alone,
and HotCRM authors almost none — so the parent set was every record and the
derivation restricted nothing. In practice a sales rep who could open exactly
one account read every account's contacts, and a rep who could open no quote at
all still read every quote's line items, per-line pricing and discounts
included.

From rc.4 the derivation resolves parent access the same way opening the parent
directly would: ownership, sharing rules and manual shares are all folded in. A
rep now sees the contacts of the accounts they can see — their own plus anything
a territory rule or manual share put in reach — and the line items of the deals
and quotes they can see, and nothing else. Writes narrow with reads: changing a
row whose parent you cannot edit is refused, naming the parent that stopped it.

**What this means for you.** Nothing to migrate, but expect related lists to get
shorter for non-administrator users, because they were previously showing rows
those users were never meant to have. If a persona genuinely needs the wider
view, grant it deliberately — *View All* on the parent object, or a sharing rule
that names the parent — rather than relying on the old derivation. Administrators
and any profile holding *View All* are unaffected.

Also in this upgrade: `crm_account` name uniqueness is now enforced on
single-organization and untenanted installs. The per-organization index used to
be NULL-distinct, so where no organization was set it enforced nothing and
duplicate account names went straight in; rc.4 keys it NULL-safely and rejects
them. And `crm_forecast`'s record title now renders — its formula called a
coercion function that does not exist (`text()` rather than `string()`), so it
faulted and left the title blank; rc.4's author-time expression check caught it.

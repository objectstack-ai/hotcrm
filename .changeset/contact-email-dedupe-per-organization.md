---
'hotcrm': patch
---

Dedupe contact email addresses within the organization, not across every
organization on the deployment. On a hosted deployment where many customer
organizations share one database, every customer after the first signed up to
an empty address book: the `contact_integrity` hook looked an address up with
no organization scope, so each new organization's copy of the sample data met
the first organization's contacts and was refused row by row —

```
Another contact (…) with email john.smith@acme.example.com already exists.
```

Measured on a two-customer deployment, the second and third customers landed
0 of 9 contacts and 0 of 4 contracts (a contract requires a contact), plus
partial quotes (3 of 5), quote line items (10 of 16), campaign members (29 of
51) and event attendees (3 of 27). After this change every customer holds the
complete copy: 9 / 4 / 5 / 16 / 51 / 27.

No data was ever exposed across customers — the platform's tenant wall held
throughout, and the same measurement re-run after the fix still shows no row,
reference or record id shared between customers. The rule itself is unchanged
and is the one the documentation already stated: an address is unique **within
your organization**, spanning every account in it, matching the
`(organization_id, email)` unique index `crm_contact.email` declares. Two
different organizations may each know the same person; a second contact with
that address inside one organization is still refused.

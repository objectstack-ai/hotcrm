---
'hotcrm': minor
---

Shared option lists are now platform picklists: Industry, Lead Source, Salutation, Payment Terms and Related To Type are each declared once

Five option lists that several fields offer are now declared once, as platform
`picklist` metadata, and every field that offers one references it by name
instead of carrying its own copy:

| Picklist | Fields that offer it |
|:--|:--|
| `industry` | Lead and Account **Industry** |
| `lead_source` | Lead, Contact and Opportunity **Lead Source** |
| `salutation` | Lead and Contact **Salutation** |
| `payment_terms` | Quote and Contract **Payment Terms** |
| `related_to_type` | Task and Event **Related To Type** |

Nothing a user picks or stores changes: every value, label, color and default is
the same, and so is the order. What changes is that each list can no longer
drift between the objects that share it, because there is only one. A value
converted from a lead onto an account or an opportunity is always a value the
target accepts, and a value outside the list is refused on every object that
offers it, with a message that names the list.

**FROM → TO for integrations that read metadata.** A picklist-bound field is
served with its resolved `options` as before, and now also carries
`picklist: 'NAME'`. The option labels of these five lists are translated once
per locale, under `picklists.NAME` in the language packs, instead of under
each field.

Lists that only one field offers (Opportunity **Stage**, Task and Event **Type**,
Event **Status**, Attendee **Response**, Lead **Need Type** and Lead
**Duplicate Of**) moved back onto that field as its own options. The
**Update Stage** action and the **Schedule Follow-up** screen now read
their option lists from the field they mirror.

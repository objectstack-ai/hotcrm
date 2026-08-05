---
'hotcrm': patch
---

Let a lead or contact who was enrolled in a campaign be deleted again. Anyone who
had ever been added to a campaign was **permanently undeletable** — through the
API and through the UI — and the refusal named an object the caller had not
touched:

```
DELETE /api/v1/data/crm_lead/<id>
→ 400 {"error":"A campaign member must reference either a Lead or a Contact",
       "code":"VALIDATION_FAILED","object":"crm_lead"}
```

The cause was a default nobody wrote down. `crm_campaign_member.crm_lead` and
`.crm_contact` declared no `deleteBehavior`, so both took `Field.lookup`'s spec
default of `set_null`. Deleting the person made the engine's referential pass
clear that column, the cleared row instantly violated
`lead_or_contact_required` — the rule the same object declares — and the whole
delete rolled back. Since `enroll_leads` and the `campaign_enrollment` flow are
ordinary parts of the marketing flow, ordinary use reached it, and a GDPR-style
"delete this person" request could not be served at all.

Both party lookups now declare `deleteBehavior: 'cascade'`. A campaign member is
a junction row whose whole meaning is "this person is enrolled in this
campaign"; once the person is gone the row denotes nothing, so deleting a lead
or a contact now removes that person's campaign memberships with them.
`restrict` would have produced an accurate message but left the person
undeletable until someone un-enrolled them by hand, and the problem being fixed
is undeletable people, not confusing text.

**What changes for you:** deleting a lead or contact silently removes their
`crm_campaign_member` rows, so a campaign's member count and response-rate
metrics drop accordingly — deliberately, since the person is gone. Memberships
naming anybody else, and the campaign side of the junction, are untouched: the
required `crm_campaign` lookup still refuses to delete a campaign that has
members, because a campaign's member list is its historical record. Refs #696.

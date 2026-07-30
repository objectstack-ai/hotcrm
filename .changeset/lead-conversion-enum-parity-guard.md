---
'hotcrm': patch
---

Guard the lead→account/opportunity picklist parity that lead conversion depends on (#531).

The `lead_conversion` flow transplants `{leadRecord.industry}` and
`{leadRecord.lead_source}` verbatim onto the Account/Opportunity it creates.
When Lead and Account each declared their own `industry` picklist, half the
Lead industries (`media`, `logistics`, `energy`, `hospitality`, `real_estate`,
`other`, …) were illegal enum values on `crm_account`, so conversion of those
leads always died in the create-account step with a server-side
ValidationError (#531). The vocabularies were unified into canonical supersets
in `src/objects/_picklists.ts` (#490), but nothing pinned the superset
relation itself — editing either object's options directly would silently
reintroduce the failure.

A new metadata-contract test now walks every `create_record` node of the
conversion flow, and for each field copied verbatim from the lead asserts that
every source select value is a legal option on the target object's field. Any
future drift between the two vocabularies fails CI with the exact offending
values.

---
'hotcrm': patch
---

Scope every uniqueness constraint per organization, so a second tenant can actually be onboarded.

Four objects declared platform-wide unique indexes on values that are only
unique inside one organization. On a multi-tenant deployment each of them
rejects the second organization's perfectly valid record.

- `crm_contact.email`, `crm_lead.email`, `crm_product.sku` each declared the
  uniqueness TWICE: field-level `unique: true` plus a single-column
  `indexes: [{ fields: [...], unique: true }]`. Since framework #3696 the
  field-level form is scoped per tenant — `(organization_id, email)` — while a
  declared index is materialized over exactly its `fields`, i.e. platform-wide.
  Declaring both left the global index enforcing the old behaviour and the
  per-tenant constraint unreachable, so two organizations could not each know
  `john@acme.com` or each stock SKU `ABC-123`. The redundant index is removed;
  the field-level declaration already builds the tenant composite.

- `crm_case.case_number` is worse, and was NOT a double declaration — just a
  global unique index on an **autonumber**. The platform's autonumber sequence
  is per tenant, so every organization counts from 1 and the second one's
  `CASE-00001` is rejected on insert: precisely the collision framework #3696
  exists to prevent. The index is now spelled out as
  `['organization_id', 'case_number']` so the constraint matches the sequence
  that feeds it.

Verified end-to-end: a freshly migrated database now carries
`uniq_crm_contact_organization_id_email`,
`uniq_crm_lead_organization_id_email`,
`uniq_crm_product_organization_id_sku` and
`uniq_crm_case_organization_id_case_number`, with `os migrate plan` reporting
the schema in sync.

The first three are exactly what the new framework lint
`unique/double-declaration` (framework#3991) flags; the stack is now clean
under it.

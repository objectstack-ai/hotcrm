---
'hotcrm': minor
---

Duplicate leads are now recorded instead of rejected. `crm_lead.email` no longer
carries a `unique` constraint: a returning prospect who fills in the Web-to-Lead
form a second time was previously refused by the DATABASE, which turned an
ordinary follow-up enquiry into a save error on a public page. Real funnels
re-capture the same address routinely, so a repeat is a fact to record, not an
error to raise.

What replaces it is a soft check plus an explicit verdict:

- **At intake**, `lead_duplicate_check` normalizes the address (trim +
  lowercase, matching what `crm_contact` already does) and links a re-captured
  one to the record it repeats — an existing contact if the person already
  became one, otherwise the oldest open lead with that address — marking it
  `Duplicate Status: Suspected`. It only ever writes when no verdict is present,
  so a human decision is never overwritten, and it is best-effort: an anonymous
  submission that cannot read CRM data still lands, just unflagged.
- **At disqualification**, closing a lead with reason `Duplicate` now requires
  naming the surviving record (`Duplicate Of` + the matching lookup) and setting
  `Duplicate Status: Confirmed`. That is declarative metadata — one validation
  rule and two `requiredWhen` predicates on `crm_lead` — so the requirement holds
  on every write path, not only in the UI. The `duplicate` reason previously led
  nowhere: nothing recorded what a lead was a duplicate OF.

A **Suspected Duplicates** list view is the queue for reviewing the flags, and
`crm_lead.email` keeps a plain (non-unique) index, since the field-level
`unique: true` was what indexed the column and the intake lookup, the
`crm_lead_import` upsert key and the conversion flow all read leads by email.

**Upgrading an existing deployment.** Every HotCRM install today is a fresh one,
where the database is built from current metadata and the old
`uniq_crm_lead_organization_id_email` index is simply never created. If an
installation with an existing populated database ever needs this version, drop
the leftover unique index with one `os migrate apply --allow-destructive` run;
until that runs, the database still rejects the second lead even though the
metadata permits it. Note that this step is **one-way**: once duplicate
addresses exist in the table, re-declaring `unique: true` cannot rebuild the
index.

Refs #598.

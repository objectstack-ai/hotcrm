---
'hotcrm': patch
---

Account names are now unique **per organization** instead of platform-wide, so two organizations can each have an "Acme Corp".

`crm_account` was the last core object still spelling uniqueness as a table-level
declared index — `indexes: [{ fields: ['name'], unique: true }]`. A declared
index is materialized over exactly its `fields`, i.e. platform-wide, while
field-level `unique: true` has been tenant-scoped since framework #3696. The
physical constraint was therefore `UNIQUE (name)`, and the SECOND organization to
create an account called "Acme Corp" was refused by the database. Account name is
also the seed data's external-id / upsert key, so this bit on the very first
multi-tenant install, before anyone had typed a record.

The declaration moves onto the field, matching `crm_contact.email` and
`crm_product.sku`, and the table-level entry is **removed** rather than kept
alongside it: declaring both leaves the platform-wide index enforcing the old
behaviour and the per-tenant composite unreachable (framework#3991
`unique/double-declaration`) — the fix would have looked applied and done
nothing. A freshly migrated database now carries
`uniq_crm_account_organization_id_name (organization_id, name)`, which also
indexes the column for `searchableFields` and the seed upsert.

Uniqueness within one organization is unchanged: a second "Acme Corp" in the same
org is still rejected.

**Upgrading an existing deployment.** Every HotCRM install today is a fresh one,
where the database is built from current metadata and the platform-wide
`uniq_crm_account_name` index is simply never created. If an installation with an
existing populated database ever needs this version, the old index must be
dropped with one `os migrate apply --allow-destructive` run: it is strictly
tighter than the new composite, so while it survives it keeps enforcing the
platform-wide rule and **this fix silently does nothing**. The boot-time
reconciler creates the new index (`create_index`, `safe`) but skips the drop
(`drop_index`, `destructive`) — see `docs/MAINTENANCE.md` §3.1.

Note that account names are matched exactly, so `Acme Corp` and `ACME  Corp` are
two different accounts; the user documentation no longer claims otherwise.

Fixes #625.

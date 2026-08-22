---
"hotcrm": patch
---

Demo campaigns and knowledge articles now get an owner, so the marketing and service edit grants actually work

Seeded rows arrive owned by nobody — a seed cannot name a user — and the
`demo_bootstrap` sweep is what gives them one on first boot. It claimed nine
objects and skipped two: `crm_campaign` and `crm_knowledge_article`.

Those two hid longer than the rest because their org-wide default is
`public_read`. Their rows read normally for everybody, so nothing looked wrong —
no empty list, no error, no blank page. But `public_read` opens the read
baseline only; a **write** still needs the caller to own the record or hold a
share. `marketing_user` is granted `crm_campaign` edit and `service_agent` is
granted `crm_knowledge_article` edit, both without *Modify All Records*, which
means their write reach is "records I own". Against a permanently ownerless row
that is no records at all: every seeded campaign and every seeded article
answered **403 on save** for everyone except a system administrator, while the
permission screen said the edit was allowed. The same rows also stayed out of
every "My …" list, rendered a blank owner on any owner-grouped report, and could
not receive an owner-addressed notification.

Both objects are now claimed alongside the other nine, so a demo org comes up
with no seeded row left ownerless. Ownership of demo seed data goes to the org's
first user, the same convention every other seeded object already follows —
whether a real deployment's article owner should mean its *author* or its
*maintainer* is a product question this does not answer, and real deployments
assign ownership through import or territory rules before the sweep has anything
to pick up.

Existing demo databases heal themselves: the sweep runs every ten minutes and
claims whatever is still ownerless on its next pass — no reset required. Records
that already have an owner are never reassigned.

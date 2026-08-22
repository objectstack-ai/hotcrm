---
'hotcrm': patch
---

The docs and code comments describing `controlled_by_parent` now say what the platform actually does: a parent-derived child is readable org-wide, not filtered to the parents the caller can read.

No behavior changes — every OWD, sharing model, sharing rule and profile grant is
byte-identical. What changed is that three prose sites stopped claiming the
opposite of measured reality.

`test/parent-derived-reach.test.ts` boots the shipped stack (ObjectQL +
`plugin-security` + `plugin-sharing`) over this app's own metadata and measures
what a `sales_rep` gets back. On 17.0.0-rc.2 a rep who can read exactly ONE
account reads BOTH accounts' contacts, and a rep who can read NO quote at all
still reads every quote's line items. The ADR-0055 derivation resolves the master
id set through the master's row-level security policies only, under a system
context — ownership scope and `sys_record_share` grants are never folded in — and
HotCRM authors no RLS policy on any master, so the master set is every record.
The write gate resolves the master through that same filter, so it is exactly as
wide.

Corrected:

- `src/objects/quote_line_item.object.ts` claimed "reads are filtered to lines
  whose `crm_quote` the caller can read".
- `src/profiles/sales-rep.profile.ts` claimed a rep's territory account carries
  its contacts, and that the parent derivation is what scopes line items to the
  rep's own book. Every `controlled_by_parent` grant in that set is org-wide read
  today.
- `content/docs/administration/sharing-and-security.mdx` told admins contacts
  "follow the account", that a manual share carries its parent-derived children,
  and that a Controlled by Parent record is granted when its parent is visible.

The narrow "filtered to readable parents" semantics is the intended one. The
platform gap is tracked as objectstack-ai/objectstack#5386; the guard test above
pins the measured reach and goes red the moment the derivation narrows, which is
the signal to rewrite these sites and re-take the OWD decision (#549).

Refs #694.

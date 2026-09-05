---
'hotcrm': patch
---

Three platform lint rule families cleared: the account map plots, row-spanning
form fields span at every width, and a dead case translation key is gone.

`objectstack lint` reported 90 warnings on `main`, re-measured on this branch's
base with a fresh install (the 90/12 figure on the epic's census came from
another seat and had not been re-run since). 31 of them are fixed here, one
commit per rule id, by writing the metadata the rule prescribes — no rule is
suppressed, whitelisted or locally re-severitied.

**`view/layout-without-binding` (1).** `crm_account`'s `account_map` list view
declared `type: 'map'` with no `map` block, so it was bound to nothing: the
renderer falls back to literal default field names and the view draws no marker
while authoring reports success. It now binds `locationField: 'office_location'`
— the object's one coordinate-carrying field — and titles each marker with
`name`. User-visible: the map view can plot.

**`absolute-colspan-discouraged` (26).** A form's column count is derived per
surface (mobile 1 / modal 2 / page 3-4), so an absolute `colSpan` lines up only
at the width its author imagined and is clamped everywhere else. Twenty-four
`colSpan: 2` sites — every one of them in a `columns: 2` section, i.e. "the
whole row" — become the relative `span: 'full'`, which states that intent
independently of the surface. Two `colSpan: 1` sites lose the key rather than
gaining `span: 'auto'`: that is already the default, and materializing a default
rewrites "the author said nothing" into "the author asked for the default".
User-visible: fields meant to take a row now do so at every width, not only
where the derived column count happens to be 2.

**`translation-target-unknown` (4).** `_sections.sla_overview` was translated in
all four locales and named nothing on `crm_case` — not a `fieldGroups[].key`
(the SLA group's key is `sla`), not a named form-view section, not a named
`record:details` section. Four entries that translated no heading are deleted.
Not user-visible: they rendered nowhere.

The remaining 59 warnings are reported on the issue with a named reason each,
and are deliberately left in place rather than bent around.

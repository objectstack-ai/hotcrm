---
'hotcrm': patch
---

The contact form gains its **Mailing Address** block. Creating or editing a
contact in HotCRM now offers a fourth tab — Identity · Contact Info · Mailing
Address · Preferences — carrying mailing street, city, state/province, postal
code and country. Until now those five fields could be filled by the CSV
importer and read on the contact detail screen, but no form in the app could
enter or change them.

### What was actually broken

`crm_contact` declares a `mailing_address` field group holding the five address
fields, and the contact **detail** screen renders it: that screen is
synthesized from the object's `fieldGroups`, because `crm_contact` authors no
detail page, and the section is on the record exactly as
`content/docs/sales/contacts.mdx` describes it.

The **form** is authored, and an authored `sections` array wins outright over
the renderer's `fieldGroups` derivation — the same mechanism written up at
length in `src/views/case.view.ts`, re-measured here in a browser against
`@objectstack/console` 17.4.0. `src/views/contact.view.ts` listed three
sections and none of them named a `mailing_*` field, so the group never reached
the form. Because this platform resolves one form for both entry points, the
gap applied to the create dialog and the edit dialog alike.

Meanwhile `src/mappings/contact_import.mapping.ts` maps all five as import
targets and `assets/import-templates/contacts.csv` ships the columns. So an
address could arrive by import and be read on the record, and a user who wanted
to type one in — or correct one that arrived wrong — had no field to type it
into. That is the defect this closes: address entry existed only on the import
path.

### The section reuses the group's key on purpose

The new section is named `mailing_address`, the same key as the field group,
which is the opposite call from the two sections either side of it. Reusing a
group key makes a section's translated heading follow the group's wording;
`contact_details` and `comm_preferences` avoid the collision because they want
their own shorter headings. This section wants exactly the group's wording, and
every shipped locale already carries
`objects.crm_contact._sections.mailing_address` — so `en`, `es-ES`, `ja-JP` and
`zh-CN` all label the new tab correctly with no new translation row.

`mailing_street` is a textarea and spans the full width; the four short fields
sit in the section's two-column grid.

### Nothing else moves

The object, the field group, the import mapping, the CSV template, the detail
screen and the contact docs are all unchanged — the form now agrees with what
they already promised. Five `field-no-consumers` lint warnings clear as a
consequence, because a form section is a reader and an import mapping is not,
but the reason for the change is the missing surface, not the warning count.

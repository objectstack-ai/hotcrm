---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

HotCRM runs on ObjectStack 18.2.0, and reports, positions, permission sets and the web forms' hints are translated

**ObjectStack 18.2.0 (#2319).** All 23 `@objectstack/*` dependencies move from 18.1.0 to 18.2.0
together, pinned exact, and `specVersion` and `engines.protocol` (in `objectstack.manifest.json` and in
each of the four packages) follow to `^18.2.0`. Nothing about what a user can do or see changes from
the upgrade alone; what the new version lets HotCRM show is below.

- **Reports have their names in every language.** The report index (*All reports*) and each report's
  page heading now list HotCRM's ten reports in Chinese, Japanese and Spanish, with the names the
  sidebar's Reports group already uses, for example *各阶段商机* for *Opportunities by Stage*.
  Before, the index listed them in English in every language.
- **Setup → Positions and Setup → Permission Sets are translated.** The twelve positions and the
  seven permission sets carry their names and one-line descriptions in Chinese, Japanese and Spanish,
  for example *客服专员* for *Service Agent*.
- **The public web forms and the lead forms show their hints in the visitor's language.** The
  Web-to-Case form's placeholders and hints (*Short summary of the issue*, *Critical issues should
  also be reported via phone.*), the Web-to-Lead form's *A sales representative will get back to you
  within one business day.*, and the hints on the lead forms (the duplicate status, the status-change
  form, the convert step and the privacy preferences) are translated.

`objectstack lint --strict` on 18.2.0 reports each of these as untranslated, so the upgrade carries
them in the same release.

**Tests that read a platform message now read the platform's answer (#2308).** On 18.2.0 a cleared
Sales Price on a deal or quote line is refused with the record validator's "Sales Price is required
and cannot be cleared" instead of the database's text, an action's success message is stored as a
template, and a permission set with a hierarchy read scope is refused at publish on an edition with
no hierarchy resolver. Each test keeps the protection it pins: the price is still refused and kept,
and a manager still cannot read a report's deal on this edition.

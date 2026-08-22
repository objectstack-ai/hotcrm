---
'hotcrm': patch
---

Spell the Automation page's merge-field example the way this app spells names, in
all three languages. The "Email templates" section on
`content/docs/administration/automation.mdx` (and its `.zh-Hans` / `.zh-Hant`
siblings) opened its bullet list with `{{Opportunity.Name}}` and
`{{Account.Owner.Email}}` — Salesforce-style PascalCase that names nothing here.
HotCRM's objects are `crm_opportunity` and `crm_contact`; its fields are `name`,
`owner_id`, `email`. AGENTS.md holds that parity as a hard rule — *the name in
source = the name at runtime = the name in DB = the name in URL = the name in
docs. No translation layer* — and the rest of the same page already keeps it
(`end_date`, `expiration_date`, `owner_id`). Only this bullet was borrowing
another product's vocabulary, which an admin authoring a template under
**Studio → Integration → Email Templates** would have copied into paths that
resolve to nothing.

The placeholder *syntax* was never the problem and is unchanged.
`EmailTemplateDefinitionSchema` in `@objectstack/spec` 17.0.0-rc.3 documents
subject and body as carrying simple `{{path.to.value}}` placeholders rendered
against a per-send `data` payload, and describes each declared variable's `name`
as "snake_case or dotted path".

What the bullet deliberately does *not* do is invent a payload shape. Whether a
template reads `{{name}}`, `{{record.name}}` or `{{crm_opportunity.name}}` depends
on the `data` payload the caller passes to `sendTemplate()`, the caller decides
that shape, and this repo has no caller to measure it from — `sendTemplate` and
`email_template` have zero occurrences under `src/`, consistent with the compiled
artifact carrying no email-template metadata (#834). So the bullet now gives the
real spellings, says plainly that where the path is rooted is the sender's choice,
and points template authors at the template's own `variables` list rather than at
a shape nobody in this repo has exercised.

Documentation only — one bullet per language file. No metadata, behaviour or field
changes. Fixes #863.

---
'hotcrm': patch
---

Send readers to the app that actually ships the page: *Automation*, *Email
Templates* and *Objects* are Studio navigation, not Setup (#1113, sub-class 2).

Four pages cited seven navigation names under **Setup** that the Setup app has
never shipped, in English and Simplified Chinese. Each of the seven is a real
label — in **Studio**, resolved live from `@objectstack/platform-objects`:
*Automation* is `Studio → Automation` (whose only child is *Flows*), *Email
Templates* is `Studio → Integration → Email Templates`, and *Objects* is
`Studio → Data Model → Objects`. An admin who opened Setup looking for any of
them found nothing there and no hint of where to look instead.

Two of the seven were not renames, and reading each citation's own sentence is
what separated them:

- **Validation rules are a source edit, not a screen.** The Automation page's
  *"To add one"* list opened with `Setup → Object → Validation Rules → New` —
  a four-step path of which no step exists. HotCRM's fifteen objects carry
  their rules as `validations[]` entries in `src/objects/*.object.ts`; the
  page now says so, and points at `Studio → Data Model → Objects` for the
  object roster the Console does show. This matches how
  `administration/state-machines` already documents the sibling case (*"there
  is no Setup → Object → Status → State Machine page"*).
- **A denial stays a denial.** `guides/email-and-calendar`'s 「邮件模板（尚未
  落地）」 section named a path in order to describe a surface HotCRM does
  **not** ship. Renaming it to the live `Studio → Integration → Email
  Templates` would have contradicted the section's own *"HotCRM ships none of
  it today"*, so the Simplified-Chinese text drops the arrow form and mirrors
  its English twin instead — 「一个**「邮件模板」设置页**」, the same wording
  the neighbouring 「邮件与日历」 section already uses.

The `Workflow rule` denials on `administration/automation` and
`reference/glossary` *were* renames: *"no Workflow Rules entry under **Studio →
Automation** — only Flows"* is both true and the more useful sentence, because
`group_automation` really does ship exactly one child.

Three pending changesets carried the same wrong path into `CHANGELOG.md` at
release — two giving advice in the retired path's voice, one setting a scene
with it — and are corrected by hand here, for the reason
`test/docs-setup-navigation-names.test.ts` records: `.changeset/**` is
deliberately outside the guard's scan, so nothing else would have caught them.

Documentation only — no metadata, behaviour or field changes.

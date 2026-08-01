---
'hotcrm': patch
---

Drop the shadowed `assignment` field group on `crm_task`. #577 added the group
with `owner` as its only member, but the synthesized detail page hoists `owner`
into the highlight strip, so the group rendered on forms and never on detail
pages (`field-group-shadowed`). `owner` moves to `basic`, next to
subject/status/priority. Clears the warning #577 introduced; validate goes from
5 warnings to 4.

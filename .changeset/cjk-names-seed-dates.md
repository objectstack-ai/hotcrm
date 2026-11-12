---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Chinese, Japanese and Korean names read family name first, and the demo's forecast periods follow the install day (#2431).** A lead or contact whose last name (the family name) is written in CJK script is now titled family name first with no space: last name 张 and first name 伟 read **张伟**, not 「伟 张」. Every other name still reads *first last*. The rule follows the name, not the viewer's language, so the stored title (contact `full_name`, lead `display_title`), the lead's `full_name`, lists, lookups, the converted contact and the refusal sentences all agree. Search now also matches the stored title (`searchableFields` gains `full_name` on contacts and `display_title` on leads), because a search splits on spaces and 「张伟」 matched neither name field alone; 「伟」 or "Zhang" still find the record through the name fields.

The six lead and contact notifications (*New contact*, *Lead approved / not approved for conversion*, *Lead converted*, *Hot lead*, *New lead assigned to you*) now print `{{person_name}}` instead of `{{first_name}} {{last_name}}`, in all four languages. Every shipped flow passes `person_name` and still passes `first_name` / `last_name`. ⚠️ Self-hosted customers: a flow of your own that sends one of these six templates must add `person_name` to its `templateData`, because a template hole cannot fall back to another value and would print an empty name.

Upgrading: contacts and leads saved before this release keep their old title until they are next saved. `scripts/backfill-record-titles.ts` now also re-titles a contact or lead with a CJK family name whose stored title is in the old order (report first, then `--apply`).

The demo forecast snapshots (current month, last four quarters, last two months) used to be computed when the app was built, so an install months after a build got a "current month" in the past. They now resolve when the seed is written, like every other demo date. Each demo date counts from the day it is seeded, and the admin setup guide now explains why a demo organization a month old shows deals past their close date, and how to start a fresh one.

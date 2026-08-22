---
'hotcrm': patch
---

Section headings are translated in all four locales, and the guard no longer takes its list of surfaces from a linter.

`_sections` holds the headings above every form and detail-page group — "Basic Information", "Ownership & Status", "SLA & Priority". The metadata declares **85 of them across 15 objects**. Before this change `ja-JP` and `es-ES` carried **2 each**, so a Japanese or Spanish user read English headings on essentially every record page and form, under an otherwise fully translated UI. `en` carried 2 as well; `zh-CN` had 66 and was missing 19, including every section on `crm_event` and `crm_event_attendee` — objects added in #592 whose headings no locale had ever translated.

## Why a completed sweep missed an entire surface

#679 reported all four locales complete, and `objectstack lint` agreed: zero i18n warnings. Both were wrong in the same way.

The guard added in #679 chose its surfaces by reading off lint's warning categories — missing-option, -field, -navigation, -page, -action, -view, -widget, -object. **There is no `_sections` category.** Sections were never considered, so the guard inherited the linter's blind spot exactly and then certified the result. A locale could ship 83 English headings and report a clean bill of health from every tool pointed at it (#683).

The correction is in how the new assertion derives its work, not just that it exists: it walks the metadata and asks what that declares, from two sources that must both be collected —

1. every distinct `group` across an object's fields (the fields are the authority for which sections *exist*; `fieldGroups` only supplies each one's English heading), and
2. every `sections[].name` in the page and view tree **at any depth** — detail pages nest them inside `page:tabs` → components → `properties.sections`, and a shallow walk misses precisely those. A first pass at this derivation under-counted by nine for that reason.

A companion assertion fails if the derivation ever returns a trivially small set, so a broken derivation cannot masquerade as a passing check — the failure mode this suite already has one historical example of.

## Consistency the sweep forced

Where two section keys on one object share the same English text — `crm_case.basic` and `crm_case.info` are both "Case Information", one on the form and one on the detail page — every locale now renders them identically. Where the same key carries genuinely different English across objects, the locales diverge deliberately: `assignment` is "Assignment" on `crm_lead` but "Ownership" on `crm_campaign`.

Two metadata inconsistencies surfaced and are left for the object definitions rather than papered over in translation: `crm_opportunity`'s `crm_forecast` section is labelled "Forecast & Metrics" by the object and "Stage & Forecast" by the detail page, so one translation has to serve both screens; and `crm_event_attendee.response` means "Invitation" while `crm_campaign_member.response` means "Response Tracking".

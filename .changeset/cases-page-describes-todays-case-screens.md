---
'hotcrm': patch
---

Correct the Cases page's account of the case **detail screen** and the case
**form** — both described a shape the app moved off two releases ago, in all
three locales.

A reader following the page could not find what it promised. The *Details* tab
was said to hold **16** of the object's 25 fields; it holds **10**. The case
form was said to be **tabbed, with three sections** (*Case / SLA / Resolution*)
covering 20 fields; it is a single untabbed section of **9**. Every number here
was re-derived from source rather than adjusted: the Details tab from the
`record:details` sections of `src/pages/case_detail.page.ts`, and the form from
`CaseViews.form` in `src/views/case.view.ts`, cross-read against the field list
`test/case-create-form-narrowing.test.ts` already pins.

Three claims about **Internal Notes** pointed in two directions at once. The
Details tab's *Description* row omitted it, and the paragraph listing what is
*not* on the tab named it — while the field has been on that tab, in that
section, since it was given a surface there. It is now listed once, in the row
it is actually in, and the page says plainly that this tab is the only place in
the app that shows it.

Two further sentences said the same stale thing in other words and are
corrected with them: the fields-not-on-the-tab paragraph (nine, now fifteen,
and grouped by where each one actually is) and the claim that the **account**
"appears three times over ... and a field in the *Details* tab" — it appears
twice, in the header subtitle and the Key Information strip.

The page also now explains *why* both lists are shorter than their section
names suggest, because the numbers alone read like an omission: a
`record:details` section lists only the fields it owns, so the six fields on
the Key Information strip and the Subject in the page title are not repeated
below it; and the form is the create form and the edit form both, so it offers
what somebody raising a case has in hand and leaves everything the lifecycle
stamps to be read on the detail screen.

The object's own **field groups** table on the same page was re-derived too and
was already correct — 8 / 2 / 7 / 2 / 3 / 2, plus Priority Rank in no group —
so it is unchanged. No metadata changed: this is the documentation catching up
with the screens.

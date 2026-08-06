---
"hotcrm": patch
---

Service docs: the case detail header bullet and the first-response stamp now match the app.

`content/docs/service/cases` described the case detail header as carrying a status badge, a
priority badge and an **SLA countdown**. None of the three is there. The header renders the
case number and subject as its title, the account as its subtitle, an icon, a breadcrumb and
the action buttons — and nothing in this app computes time remaining or time over, so there is
no countdown to render anywhere on the case. **Status** and **Priority** are ordinary fields in
the **Key Information** highlights strip below the header, alongside SLA Due Date, SLA
Violated, Owner and Account; that strip is now a bullet of its own instead of being folded into
the header. This also settles a straight contradiction with `content/docs/service/sla-and-escalation`,
which already said there is no countdown and that the header carries the case number, subject
and account only.

The same page said **first response time** was "stamped the first time an agent comments or
replies". Neither action stamps it. `first_response_date` has exactly one writer,
`logActivityAction`, and it stamps when a call or meeting that **already took place** is logged
on the case (**Log a Call** / **Log a Meeting**), only while the field is still empty. A
comment, an outbound email, a status change and a meeting that is merely *scheduled* all leave
it untouched — so a case worked entirely through comments and email keeps an empty field.

The **Status path** bullet beside the header one was re-checked against the page metadata and
is accurate, so it stays as written. English, Simplified Chinese and Traditional Chinese.
Documentation only — no metadata changed.

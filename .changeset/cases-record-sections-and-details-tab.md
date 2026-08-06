---
"hotcrm": patch
---

Service docs: *What a case record stores* now separates the three things that organise a case's fields, and the *Details* tab stops promising all of them.

`content/docs/service/cases` opened its field section with "the detail screen is organised into
6 sections" and a six-row table. No screen in this app has those six sections. The six **names**
are real — they are `crm_case`'s `fieldGroups` (`src/objects/case.object.ts`), the object's own
filing scheme for its fields — but the detail screen and the form each declare sections of their
own and render three apiece: *Case Information* / *Status & SLA* / *Description* on the **Details**
tab (`src/pages/case_detail.page.ts`), and *Case* / *SLA* / *Resolution* on the tabbed form
(`src/views/case.view.ts`). The section now keeps all six names, says what they actually are, and
gives the three layouts as three tables instead of one merged fiction.

Five of the six field-group rows were also wrong on their own terms: **Parent Case** is in *Case
Information*, not *Origin & Routing*; **Status** and **Case Type** are in *Case Information*, not
*SLA & Priority*; **Closed Date** is in *SLA & Priority*, not *Resolution*; and *System* holds
**Internal Notes** and **Is Closed** — there is no *audit trail* field on a case at all. Only
*Escalation* was accurate. **Priority Rank** belongs to no group, which the table now says.

The **Details** tab bullet said it carries "all metadata fields". It carries **16** of `crm_case`'s
**28**. The twelve it does not carry are named, including **First Response Date** — the field the
*What happens automatically* section above explains at length, which a reader following "all
metadata fields" would go to this tab to find and not find. Nine of the twelve are on the form
instead; **Escalated Date**, **Priority Rank** and **Display Title** are on no case screen.

English, Simplified Chinese and Traditional Chinese. Documentation only — no metadata changed.

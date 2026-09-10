---
'hotcrm': patch
---

Restructure the **Marketing Cloud** overview so its diagram, its numbered life
cycle and its *What the system does for you* list tell one story about what
moves by itself — all three locales.

The page said member enrollment was automatic in three places at once. The ASCII
life cycle drew an arrow out of *In Progress* into "Enroll leads/contacts";
numbered step 2 said "launch the campaign; the system bulk-enrolls the target
audience as campaign members"; and a bullet titled **Automatic enrollment**,
sitting in the list of things the app does by itself, promised "a scheduled flow
bulk-enrolls members matching your target audience". `campaign_enrollment` is a
`type: 'screen'` flow (`src/flows/campaign-enrollment.flow.ts:52`) with no
trigger and no schedule; its only entry point is the **Enroll Members** action
on the campaign. A heading called *What the system does for you* listing a thing
a person does is the defect in one line, and it survived two earlier passes over
this page because both were rewriting the bullet directly below it.

So this is a page-structure change rather than four line edits. The diagram now
has two rows — a STATUS row whose first two moves are yours and whose last is
the nightly sweep, and a MEMBERS row that names **Enroll Members** as a button.
The numbered life cycle gains enrollment as its own step, placed where it really
sits (the action is offered while a campaign is *Planning* **or** *In Progress*,
so the audience can be built before launch and topped up after it), and step 3
now says that moving the status is the launch and that the move enrolls nobody.
The English page links both mentions to
`marketing/campaigns#campaign-enrollment-flow`, which carries the full
description, instead of restating it.

The automation list keeps every bullet that is real and gains a closing
paragraph saying, in the place the false bullet used to occupy, that enrolling
is deliberately not on the list — nothing enrolls anybody when a campaign moves
to *In Progress*, and no schedule enrolls them later, because the audience is
answered on a screen and a scheduled run would arrive with nobody to answer it.
Nothing here describes the removed cron as returnable and nothing proposes
adding one.

**Automatic completion** was measured rather than assumed, and it is real:
`campaign_completion` (`src/flows/campaign-completion.flow.ts`) is a
`type: 'schedule'` flow, `status: 'active'`, `schedule: '0 2 * * *'`, filtering
`status: 'in_progress'` with `end_date` in the past and writing
`status: 'completed'`. The bullet is kept; its wording now carries the status
qualifier the flow's own filter has, so it agrees with the *Campaigns* page and
with the life-cycle step beside it.

The Simplified page names the action as the zh-CN pack does — **Enroll Members**
（批量加入成员）, the shipped label for `enroll_leads` — and the Traditional page
mirrors it in that page's own conventions（批次加入成員 · 畫面 · 排程 · 區隔）,
never a mechanical conversion, the wording PR #1860 established for this family.

No metadata changes: the flow is already a screen flow, and this is the overview
page catching up with it.

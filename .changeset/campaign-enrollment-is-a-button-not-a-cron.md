---
'hotcrm': patch
---

Say who runs Campaign Enrollment on the two marketing pages that describe it.
Both told the reader it runs itself, in two different and equally false ways:
**Campaign Members** item 1 had it firing "when a campaign moves to *In
Progress*", and **Campaigns** had it "on a schedule (default Monday 9 AM)" in
three separate places — the *What happens automatically* list, the *Campaign
enrollment flow* section, and a tip for admins offering to configure the cron.

`campaign_enrollment` is `type: 'screen'` (`src/flows/campaign-enrollment.flow.ts`).
It has no trigger of its own: nothing fires it on a status change, no start node
carries a schedule, and its only entry point is `enroll_leads` — label **Enroll
Members**, `type: 'flow'` on `crm_campaign`, in the record header while the
campaign is *Planning* or *In Progress*. So a reader who launched a campaign and
waited was waiting for members that were never coming, and the one button that
produces them was named on neither page.

The pages now describe the real gesture: open the campaign, click **Enroll
Members**, and answer the *Enrollment Criteria* screen — which side (leads or
contacts, one per run) and the segment on that side (leads by status, contacts
by department). The true half is kept: the flow creates a member per matching
person with status *Sent*, and skips the already-enrolled and the opted-out.

The design reason travels with it, because it is what stops the cron coming
back. The criteria are answered on the screen, and a scheduled run has nobody to
answer them — the flow's own record of its history says a cron firing seeds no
inputs at all, which left every run either matching no campaign or mass-enrolling
into a null one. "This is manual" is a design decision here, not a gap.

The admin tip keeps the auto-complete cron, which is real (2 AM daily,
`campaign_completion`), and stops offering an enrollment cron to configure —
**Administration › Automation**, the page it sends readers to, has always listed
this flow correctly as a *Screen* flow.

zh-Hans names the action as the zh-CN pack does — **批量加入成员**, the shipped
label for `enroll_leads` — glossed after the English label in the pattern these
pages already use. zh-Hant mirrors it in each page's own Traditional conventions
(**批次加入成員**, the 批次 spelling those pages already use), never a mechanical
conversion.

No metadata changes: this is the doc surface catching up with the trigger change
that shipped in #597.

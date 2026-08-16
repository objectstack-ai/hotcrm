---
'hotcrm': patch
---

Point the Approvals docs at the approval centre, the screen the Inbox entry now opens.

The **Approvals › Inbox** sidebar entry was re-pointed away from the
`sys_approval_request` object list — a read-only table with no Approve/Reject — to
the platform's approval centre (`componentRef: 'approvals:inbox'`). The label and
the entry id did not move, only the destination, so six documentation pages kept
describing a screen the sidebar had stopped opening:

- `content/docs/revenue/approvals.{mdx,zh-Hans,zh-Hant}` said the item "pins no
  view of its own, so it opens the object's list", and tabled the four built-in
  views as the filters a reader would meet there.
- `content/docs/revenue/index.{mdx,zh-Hans,zh-Hant}` introduced the entry as "the
  approval requests waiting on you (`sys_approval_request`)" — a parenthetical
  naming the object the entry used to open.

All six now describe the approval centre: its three tabs (**My Pending** /
**Submitted by me** / **All**) and its separate **Status** filter over *All
statuses*, **Pending**, **Approved**, **Rejected**, **Recalled** and **Returned
for revision** — each label verified against the shipped console bundle rather
than paraphrased.

The four built-in views are **not** deleted. They are real and still shipped by
the approvals plugin on the object; they are simply no longer what **Inbox**
opens, so they keep a section of their own, and the pages now carry a collision
table — because **My Pending** and **All** appear on both sides verbatim, and a
half-right table is worse for a reader than a plainly wrong one. The centre's
**Submitted by me** tab is called out against the phantom *Submitted by Me* it
differs from by one capital letter.

`test/docs-revenue-approvals-navigation.test.ts` gains the pin that would have
caught this: the sentence each page must carry is keyed on the nav entry's own
shape, read off `src/apps/crm.app.ts`, so re-pointing the entry without rewriting
the pages fails loudly instead of shipping quietly. The centre's labels are pinned
against the installed console bundle, and `revenue/index` — previously pinned by
nothing at all — is covered too.

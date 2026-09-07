---
'hotcrm': patch
---

Call `loss_details` by its declared label — **Loss/Win Details** — everywhere the
Opportunities page names it, in all three locales.

The field is `Field.textarea({ label: 'Loss/Win Details' })` on `crm_opportunity`,
and both language packs agree with it: `src/translations/en/objects.pipeline.ts`
carries the same English label and `src/translations/zh-CN/objects.pipeline.ts`
carries 「赢/丢单详情」. That is what the *Win / Loss* form section renders and what
a rep reads on screen. The page named it four different ways and none of them was
the label: **Win/Loss Details** with the halves the other way round, a lowercase
`win/loss details` inside the record-stores table, and twice as **Loss Details**
with the win half dropped entirely.

The short form is not merely shorter, which is why this is a wording correction
rather than a typo sweep. `loss_details` carries the free-text context behind
*either* outcome — the pack's own help text says "Free-text context behind the win
or loss reason" — and the *Win / Loss* form section offers it beside both
`win_reason` and `loss_reason`. Calling it *Loss Details* in the two places a rep
is most likely to read it, the detail-layout list and *Tips for sales reps*, tells
them the box is for losses; the second of those then says these fields "are the
only competitive data the app keeps", which is exactly the sentence that has to be
right about which of them a win writes to.

The Chinese faces already used the pack wording in two of their four sites; the two
coined short forms — 「丢单详情」 / 「丟單詳情」 — return to 「赢/丢单详情」 and
「贏/丟單詳情」. No `src/` metadata changed: the object, the packs and the form
agree with each other and only the prose disagreed.

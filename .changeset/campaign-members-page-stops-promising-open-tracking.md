---
'hotcrm': patch
---

Rewrite the **Campaign Members** page — all three locales — against the record the
app actually ships. The page had been describing the pre-#597 member: seven
statuses and two tracker stamps, none of which exist.

### What the page claimed

`crm_campaign_member` declares **eight** fields and **four** statuses — `sent`
(the default), `responded`, `converted`, `unsubscribed`. #597 removed
`first_opened_date` / `first_clicked_date` and the `opened` / `clicked` /
`bounced` statuses because nothing in this app or on the platform could ever
write them: the platform email service is outbound delivery with a
`queued | sent | failed` message state, and it ships no tracking pixel, no click
webhook and no bounce feed. The docs surface was never cleaned in that move, so
for every release since, the page has offered a reader:

- a heading counting **7 member statuses**, over a table with *Opened*,
  *Clicked* and *Bounced* rows and a "the status is monotonic" line built
  entirely on *Clicked* outranking *Opened*;
- *First Opened* and *First Clicked* in "What the member record stores" — while
  omitting *Member Number*, a field that does exist;
- an "Engagement tracking" section promising an email integration that "writes
  back to the member record automatically";
- **Open rate** and **Click rate** formulas — `members where status >= Opened ÷
  Sent` — that no shipped picklist value can satisfy;
- tips telling marketers to clean *bounces* and dismissing *Opened* / *Clicked*
  as vanity metrics, and telling admins to install connectors for tracking that
  is not in the product.

### What it says now

Every status row names what really writes it: enrollment for *Sent*, the **Mark
Responded** button for *Responded*, a lead converting for *Converted*, and a rep
or an opt-out request for *Unsubscribed* — which also ticks that person's
**Email Opt Out**, and so keeps them out of future enrollments. The lifecycle is
described as it behaves rather than as a ladder: moving a member back clears the
response stamp, and an unsubscribed member is never promoted by the conversion
sweep.

The metrics section is rewritten rather than deleted, on rates the four statuses
can express — *Sent* is every member, *Responses* are the members at *Responded*
or *Converted*, and the response rate is one over the other. Conversions reach
the campaign through its converted-lead count and its ROI figures; unsubscribes
are not a campaign counter, and the page now says so instead of implying a rate.
A callout states plainly that this app tracks no opens, clicks or bounces, so a
reader stops looking for the switch that turns them on.

The Simplified page takes its four status nouns from the zh-CN language pack —
已发送 · 已响应 · 已转化 · 已退订 — rather than leaving English tokens in a
Chinese table; the Traditional page mirrors it in that page's own conventions.

Nothing about the metadata changes: this is the doc surface catching up with a
trim that shipped in #597.

---
'hotcrm': patch
---

Sweep the pre-#597 campaign engagement vocabulary off the **Campaigns** page, the
**Email & Calendar** guide and the **Marketing Cloud** overview — all three
locales of each. These pages were the surfaces #1829 could not reach when it
rewrote **Campaign Members**, and between them they offered a reader an open
rate, a click rate, two tracker date fields to fill in by hand, and a five-step
member ladder, none of which exist.

### Campaigns

The record's section table listed an **Engagement** *(rollup)* section holding
"opens, clicks, responses, conversions". `crm_campaign` has no open or click
column and no section of that name: its detail screen is derived from six field
groups — *Campaign Information*, *Schedule*, *Budget & ROI*, *Performance*,
*Ownership*, *Campaign Assets* — and the table now names those, with the ROI
cross-reference elsewhere on the page corrected from a *Costs* section that does
not exist to *Budget & ROI*.

"Measuring a campaign" claimed a right-hand panel showing an **Open rate**
(`% of members with status ≥ Opened`), a **Click rate** (`≥ Clicked`), a
**Conversion rate** and a **Pipeline value**. None of the four is a field, and
`≥` imports an ordering the member picklist does not have — *Sent*, *Responded*,
*Converted* and *Unsubscribed* are four values with no ranking between them. The
section now walks the counters the campaign really rolls up — number sent,
responses (members at *Responded* **or** *Converted*), number of leads, converted
leads, opportunities created, won opportunities, actual revenue — plus the two
formula fields, *Response Rate %* over sent and *ROI %* over actual cost. It also
states that open pipeline is summed nowhere on the campaign; closed-won is the
only money it rolls up. A callout says plainly that a campaign has no open,
click or conversion rate.

### Email & Calendar

Inside a section whose whole point is honesty about what is not shipped, one
sentence certified the phantom as the real part: "the one adjacent thing that
*is* real: a campaign member carries **First Opened** and **First Clicked**
dates — but they have no automatic writer, so a person or an import fills them".
Both fields were deleted in #597, so the workaround it offered could not be
performed. It now says what a member does record — a response, written by **Mark
Responded** or by that person's lead converting — and that there is no status
for an open, a click or a bounce.

### Marketing Cloud overview

Two claims here were stronger than the ones this card was filed for. The campaign
life cycle had members moving through *Sent → Opened → Clicked → Responded →
Converted*, and "what the system does for you" promised that "opens, clicks,
bounces, unsubscribes update the member status as engagement happens" — an
automatic writer for three statuses that do not exist. The lifecycle step now
describes the four real values and says there is no ladder between them; the
automation bullet names the one status the app writes by itself (a lead
converting promotes its member rows) and attributes *Responded* and
*Unsubscribed* to the people who actually set them.

The Simplified pages take their status nouns from the zh-CN language pack
(已发送 · 已响应 · 已转化 · 已退订) and the Traditional pages mirror them in each
page's own conventions (已發送 · 已回應 · 已轉化 · 已退訂), the wording PR #1846
established for this family.

No metadata changes: this is the doc surface catching up with a trim that
shipped in #597.

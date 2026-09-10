---
'hotcrm': patch
---

Sweep the pre-#597 campaign engagement vocabulary off the last surface carrying
it — the **Cubes** and **Reports** pages, all three locales of each. Both pages
argue *why campaign analytics has no cube*, and the force of that argument comes
from an accurate inventory of what the records do carry. The inventory was wrong
in the reader's favour twice over.

### The member record does not stamp an open or a click

Both pages said `crm_campaign_member` "stamps **First Opened**, **First
Clicked**, **Response Date** and **Responded** per member". Two of those four
fields were deleted in #597 because nothing in the product or on the platform
could ever write them, so the sentence told a reader that per-member open and
click data exists and merely is not aggregated — the opposite of the truth. The
member's response block is *Status*, *Response Date* and *Has Responded*, under
its *Response Tracking* section, and the pages now say so. Each also states the
stronger fact the old wording hid: an open or a click is not an unaggregated
figure, it is an unrecorded one — the app tracks no opens, clicks or bounces at
all.

The **Reports** page carried the same claim a second time as a paraphrase that
named no field — "the opens, clicks and responses are stamped on each member
record, and nothing rolls them up" — in Simplified and Traditional as well as
English. That bullet now says what a member record answers (whether and when the
person responded) and that opens and clicks are absent rather than one layer
down.

### Two formula fields, two different sections

Correcting the member half surfaced a second error in the same sentence: both
pages placed the campaign's whole money block in the **Performance** section.
Five of the fields they name are not there. `crm_campaign`'s *Budgeted Cost*,
*Actual Cost*, *Expected Revenue*, *Actual Revenue* and the *ROI %* formula are
grouped under **Budget & ROI**, a section of its own — the form agrees, and puts
`roi` beside the two manual-entry cost fields it divides by, rather than at the
bottom of *Performance* where its dependency was invisible. **Performance** holds
the six counters and the *Response Rate %* formula. The pages now name both
sections, and use each counter's declared label (*Number Sent*, *Number of
Responses*, *Number of Leads*, *Converted Leads*, *Opportunities Created*, *Won
Opportunities*) instead of the compressed `Num …` list they had transcribed.

The Simplified pages take their response vocabulary from the zh-CN language pack
(响应 · 已响应) and the Traditional pages mirror it in each page's own conventions
(回應 · 已回應), the wording PR #1846 established for this family. Field and
section names stay in English on both Chinese pages, which is what these pages
already do for every other campaign field they name.

No metadata changes: this is the doc surface catching up with a trim that
shipped in #597.

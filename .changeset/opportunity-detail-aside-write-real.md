---
"hotcrm": patch
---

Sales docs: the two "when you open an opportunity, you'll see" bullets that describe the deal page's side column now match the page metadata.

`content/docs/sales/opportunities` promised a **Competitors & Notes** side panel and an **AI
Reference Rail** of *Sales Copilot suggestions (Customer 360, Revenue Forecast, related signals)*.
Measured against `src/pages/opportunity_detail.page.ts`, that page declares three regions — a header,
a main column carrying the tab strip, and one narrow `aside` — and the `aside` holds exactly one
component: a `record:reference_rail`. There is no second side panel, and no component on the page is
AI-driven.

- **Competitors & Notes** — no such panel, and nothing on the page renders talking points. The
  bullet now points at where those two things actually are: **Competitors** is an ordinary
  multi-select field on the opportunity whose options are still the placeholders *Competitor A* /
  *B* / *C* (`src/objects/opportunity.object.ts`), authored in the edit form's *Sales Strategy*
  section rather than shown on this page at all; the nearest thing to notes is the *Details* tab's
  collapsible **Description** section, carrying **Description** and **Next Steps**.
- **AI Reference Rail** — unlike the case page, the rail here is real; what is wrong is its
  contents. Its three entries are snapshots of records already linked to the deal — **Quotes**
  (`crm_quote` via **Opportunity**), **Products** (`crm_opportunity_line_item` via the same lookup)
  and **Open Tasks** (`crm_task` via **Related Opportunity**), each a total-count badge, at most
  three records and a *View all* link, with empty entries folded into a *+ N empty* chip. No
  suggestion of any kind is produced here or anywhere else on the page: Customer 360 and revenue
  forecasting are skills you reach by asking, which the section below the list already describes.
  The bullet also now records that the rail's **Open Tasks** entry carries no status filter — rail
  entries declare none and the rail queries on the relationship alone — so the filtered
  not-*Completed* list is the one on the *Related* tab, ten at a time.

Each name is kept and answered rather than silently deleted, following the same approach as the case
detail passage. Whether the deal page *should* grow a competitor panel, and the "Copilot" wording
itself, are product questions this leaves open. English, Simplified Chinese and Traditional Chinese.
Documentation only — no metadata changed.

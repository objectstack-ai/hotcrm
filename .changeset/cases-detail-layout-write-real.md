---
"hotcrm": patch
---

Service docs: the three remaining "when you open a case, you'll see" bullets now match the page metadata.

`content/docs/service/cases` promised a **Customer panel**, a **Related** tab carrying four kinds of
record, and an **AI Reference Rail**. Measured against `src/pages/case_detail.page.ts`, that page
declares two regions and nothing else — a header holding the page header, the Key Information
highlights strip and the status path, and a main region holding one tab strip. There is no third
region, no side panel and no AI component anywhere on it.

- **Customer panel** — no such component. The **account** is on the page three times over (header
  subtitle, Key Information strip, and a field in the *Details* tab) and the **primary contact** is a
  field in that tab's *Case Information* section, so the bullet now points at where those two
  actually are. **Contract tier** and **open cases this month** have no carrier at all: a case links
  to no contract, `crm_contract` has no tier field either (the nearest real field is **Customer
  Tier** on the account, which this page does not show), and nothing in this app counts a customer's
  cases by month.
- **Related** — one list, not four. The tab is an accordion with a single item, **Open Tasks**: the
  `crm_task` records pointing at the case through **Related Case** (`related_to_case`), filtered to those not yet
  *Completed*, ten at a time. Attachments are enabled on the object but no component on this page
  lists them; `crm_case` has no opportunity relationship in either direction; and the case's three
  milestones — *escalated*, *resolved*, *closed* — are `activityMilestones` that land as entries in
  the **Activity** timeline, not as records on this tab.
- **AI Reference Rail** — no rail of any kind. The service skills are real and the page already
  describes them further down, but they are reached by asking, not from a panel beside the case. The
  one reference rail this app renders is on the opportunity detail page, and it lists related records
  rather than suggestions.

Each name is kept and answered rather than silently deleted, following the same approach as the
earlier case and SLA passages. Whether this page *should* grow a customer panel or an assistant rail
is a product question this leaves open, as is the "Copilot" wording itself. English, Simplified
Chinese and Traditional Chinese. Documentation only — no metadata changed.

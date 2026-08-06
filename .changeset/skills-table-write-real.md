---
'hotcrm': patch
---

Skills reference: every skill's Reads / Writes / Output row now matches its skill source

`content/docs/ai-copilot/skills.mdx` documented capabilities the six skills in
`src/skills/` do not have. The worst of it was Case Triage's **Writes** row, which
promised updates to `priority`, `category` and `queue`: triage declares only
`describe_object` and `get_record`, the Escalate / Close actions carry no AI
exposure so no write tool is materialised for it, and `category` / `queue` are not
fields on `crm_case` under any name. Every skill's rows were re-checked against its
source and rewritten to what the instructions and tool lists actually say:

- **Case Triage** suggests a priority with its one reason and points at **Escalate
  Case** / **Close Case** for an agent to click; it reads no prior cases (no query
  tool) and no product (`crm_case` has none). Its classification field is **Case
  Type**, set by a person.
- **Lead Qualification** writes nothing itself — it calls **Convert Lead** or
  **Schedule Follow-up**, and those flows do the writing. `rating` is never written;
  it is the 1–5 star Lead Score a person sets.
- **Email Drafting** has no send tool at all, offers a second subject-line variant,
  and grounds the copy in the contact plus the related account or opportunity.
- **Revenue Forecasting** summarises pipeline by stage and forecasts a range; the
  Closed / Commit / Best Case / Pipeline buckets belong to the opportunity's
  **Forecast Category** and the scheduled forecast snapshot, not to the skill.
- **Customer 360°** reads contacts, open cases, open opportunities and published
  knowledge articles — not contracts, activities or campaign memberships.
- **How skills work together** no longer claims skills invoke each other; the only
  handoff written into a skill's instructions is Case Triage naming Email Drafting.

`content/docs/whats-new.mdx` counted five built-in skills; `allSkills` registers
six — Live Data was missing from the list. All changes in `en` / `zh-Hans` /
`zh-Hant`.

---
'hotcrm': patch
---

Write the two AI skill pages' capability lists back to what the skill sources
actually declare, in all three languages.

`content/docs/ai-copilot/service-copilot.mdx` and
`content/docs/ai-copilot/sales-copilot.mdx` (plus their `.zh-Hans` / `.zh-Hant`
siblings) listed abilities that `src/skills/case-triage.skill.ts` and
`src/skills/customer-360.skill.ts` do not have. PR #848 corrected one bullet on
each page (the ghost **Customer Since** field); this is the rest of the same
sweep, and it separates two different severities rather than treating them
alike.

**Class one — the tool surface cannot reach it (`case_triage`).**
`case-triage.skill.ts` declares `tools: ['describe_object', 'get_record']`.
`get_record` fetches one record by ID and there is no query tool of any kind, so
the Case Triage page's promises of *historical cases from the same account and
contact*, *the Support Knowledge knowledge base for matching articles* and *top
matching KB articles* were not merely unwritten instructions — nothing in the
skill can perform them. The *draft first reply* was worse still: it contradicted
the skill's own step 6, which hands the customer-facing reply to the
`email_drafting` skill by name. *Suggested category* named a job the
instructions never assign (they define a priority and one reason), and its
option list was wrong twice over — `crm_case.type` ships Question / Problem /
Feature Request / Bug, with no Billing option.

**Class two — reachable, but the instructions do not enumerate it
(`customer_360`).** That skill does carry `query_records`, so *recent activity*,
*contracts* and *marketing engagement* on the sales page, and *contract status*
and *last touchpoints* on the service page, are a narrower miss: the skill could
read `crm_contract` / `crm_campaign` / `crm_event` / `crm_task` and is simply
not told to. Both Customer 360° sections are now written from steps 2-4 of the
instructions — the related objects it does enumerate (`crm_contact`, `crm_case`
filtered on `is_closed`, `crm_opportunity`, published `crm_knowledge_article`),
the totals it takes from `aggregate_data` instead of adding up by hand, and the
three sections it answers in (**Account Snapshot** · **Active Work** ·
**Risks & Notes**) with record IDs cited inline.

Following PR #841 and PR #848, no capability name is deleted in silence. A
reader who arrives looking for case history, KB article matching or a first-reply
draft lands on a paragraph that says which skill does own it — Customer 360° for
the history and the article matches, Email Drafting for the reply — or that the
data has to come from the record's own related lists for now.

Whether either skill *should* be given more reach stays a product decision under
ADR-0109 and is deliberately not pre-empted here: `src/**` is untouched and no
tool list changed. Whether the **Support Knowledge** knowledge base exists as an
entity is likewise out of scope — that is issue #808; this change speaks only to
what tools the skills hold and what their instructions say.

Chinese field and option names follow `src/translations/zh-CN.ts` (the #825
precedent): the case type options are 咨询 / 故障 / 功能需求 / 缺陷, and
`crm_campaign` is 营销活动 in zh-Hans (PR #849) and 行銷活動 in zh-Hant.

Documentation only — no metadata, behaviour, field or skill changes.
Fixes #847.

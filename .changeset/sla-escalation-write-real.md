---
'hotcrm': patch
---

Write the SLA & Escalation page's account of what escalation does against the
flow and the hook, in all three languages.

`content/docs/service/sla-and-escalation.mdx` and its `zh-Hans` / `zh-Hant`
twins described escalation as a **reassignment plus a three-party mailshot**.
Measured node by node against `src/flows/case-escalation.flow.ts` and
`src/objects/case.hook.ts`, four of the five steps in the *What the escalation
does* list were wrong, and the summary sentence, two upstream claims and two
rows of the *Other case automations* table repeated the same three fictions.

- **No reassignment.** Step 1 promised the case moved to "the current agent's
  manager". The `update_record` node writes `is_escalated`,
  `escalation_reason`, `escalated_date` and `status` and never `owner_id` — the
  comment inside it opens with *No owner reassignment*, because
  `{caseRecord.owner_id.manager}` cannot traverse a lookup in a flow template
  and would interpolate to the literal `undefined`, orphaning the case under a
  phantom owner. The escalation notice already told its reader as much: `It
  remains assigned to you.` The same claim appeared twice more upstream — the
  page's opening line (*"escalates stuck cases to senior staff"*) and the
  section lede (*"automatically reassigns stuck or critical cases to senior
  staff"*) — and in the summary sentence that had the customer's issue *"in the
  hands of a senior agent within minutes"*. All four now say the case stays with
  its owner and that a hand-off, if one is needed, is a manual step.
- **The notification reaches one person.** Step 5 promised an email to the
  original agent, their manager, **and** a broader `support-team@example.com`
  list, carrying case number, priority and account name. `recipients` is the
  single entry `{caseRecord.owner_id}`; there is no manager recipient; and
  `support-team@example.com` does not occur anywhere under `src/`. The account
  name could not be delivered either — the same lookup-traversal limit applies
  to `{caseRecord.crm_account.name}`, which is why the node's message carries
  only the case number and the priority. The page now states all of that,
  including why the account name is absent.
- **The follow-up task is real, but neither the flow's nor the original
  agent's.** Step 4 put it on the escalating agent "so they stay in the loop".
  The flow has no `create_record` node, deliberately; the escalation write flips
  `status` to `escalated`, which fires the `case_status_side_effects` hook — the
  single owner of escalation follow-up tasks — and that hook opens an **urgent**
  task, due the next day, owned by the **account owner**, and only for cases
  that have an account, since it keys off the account. Steps 2 and 3 (the flag
  and date, and the status change) were accurate and are kept.
- **Two invented mailing addresses.** The *Other case automations* table billed
  *Notify on Critical* as emailing `support_manager@example.com` and *Notify on
  Escalation* as emailing `escalation_team@example.com`. Neither string occurs
  anywhere under `src/`. The first row is the escalation flow's own notify node,
  which reaches the case owner on inbox and email; the second fires no email at
  all — what a status change to *Escalated* produces is the account owner's
  urgent task. The row triggers are corrected too: the hook keys off the
  **status** becoming `escalated`, not off the `Escalated` boolean flipping.

Throughout, the words a reader arrives looking for — *manager*, *senior agent*,
*support-team*, *original agent* — are stated as **not done**, and who really
receives each thing is named, rather than being quietly deleted and leaving a
reader to assume the page merely forgot to mention them. The page describes
today's behaviour only and takes no position on whether escalation *should*
reassign; that is an open product question.

Documentation only, three files. No flow, hook, node, condition, recipient or
field set changed — the pages now match the automation as it already runs.
Fixes #876.

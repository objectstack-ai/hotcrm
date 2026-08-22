---
'hotcrm': patch
---

Make two rows of the Automation page's built-in flow table describe what those
flows actually do, in all three languages, and fix the same claim inside the
flow's own metadata description.

**Large Deal Won Alert** was billed as *"notify the owner and their manager"*. It
notifies the owner and nobody else: the flow's single `notify` node addresses
`{record.owner_id}` on inbox + email, and there is no manager recipient anywhere
in it — not a `manager_id`, not a position or team target. The node header in
`src/flows/opportunity-won-alert.flow.ts` explains why the manager was dropped:
`{record.owner_id.manager}` cannot traverse a lookup on the raw trigger snapshot,
so it interpolates to the literal `undefined` and the message is delivered to a
phantom user. A sales director who read the old sentence expected an alert on
every large win and received none. The flow's own `description` carried the same
claim (*"notify owner + manager"*) — the table had faithfully copied it — so both
now say the owner alone, not their manager.

**Case Escalation Process** was billed as *"reassign to a senior agent, notify,
create a follow-up task"*. Measured node by node against
`src/flows/case-escalation.flow.ts`:

- **No reassignment.** The `update_record` node writes `is_escalated`,
  `escalation_reason`, `escalated_date` and `status` — it never touches
  `owner_id`, for the same lookup-traversal reason as above. The case stays with
  the agent who had it, which the escalation notice already told the reader in so
  many words: *"It remains assigned to you."* A service manager who believed
  escalation handed the ticket to a senior agent had no reason to build the
  manual hand-off that is actually required, and none of the three pages said so.
- **The follow-up task is real, but it is not the flow's and it is not the
  senior agent's.** The flow carries no `create_record` node, deliberately — the
  escalation write flips `status` to `escalated`, which fires the
  `case_status_side_effects` hook in `src/objects/case.hook.ts`, the single owner
  of escalation follow-up tasks. That hook opens an **urgent** task for the
  **account owner**, due the next day. A task node in the flow too had produced
  duplicate, disagreeing tasks per escalation. So the row keeps the task and
  corrects who it lands on.

Both rows name the mechanisms readers arrive looking for — *manager*, *senior
agent*, *follow-up task* — rather than deleting the words and leaving a reader to
conclude the page simply forgot to mention them. They describe today's behaviour
only, and take no position on whether escalation should reassign; that is an open
product question, and a change there is a behaviour change with its own
documentation update.

Documentation plus one metadata description string. No flow behaviour, node,
condition or recipient changed: the pages and the description now match the flows
as they already run. Fixes #851.

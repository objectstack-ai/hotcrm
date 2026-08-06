---
'hotcrm': patch
---

Make the flow **node** labels say what those nodes do. #851 corrected the
Automation page's flow table and the `opportunity_won_alert` description; the
same three claims survived one layer further in — on the nodes themselves, which
ship as authored metadata in `dist/objectstack.json`, and in a file-header
comment that had started contradicting the description right above it.

- **`Notify Management` → `Notify Owner`** (`src/flows/opportunity-won-alert.flow.ts`).
  The node addresses `{record.owner_id}` and nothing else. The comment directly
  above it already explained why there is no manager recipient —
  `{record.owner_id.manager}` cannot traverse a lookup on the raw trigger
  snapshot, so it interpolates to the literal `undefined` and the message goes to
  a phantom user — so the label was contradicted by its own header.
- **`Assign to Senior Agent` → `Flag as Escalated`** (`src/flows/case-escalation.flow.ts`).
  The `update_record` node writes `is_escalated`, `escalation_reason`,
  `escalated_date` and `status`. It never touches `owner_id`; the comment inside
  it opens with *"No owner reassignment"*. The case stays with the agent who had
  it, exactly as the escalation notice already tells the recipient: *"It remains
  assigned to you."*
- **`Notify Support Team` → `Notify Case Owner`** (`src/flows/case-escalation.flow.ts`).
  Same file, same class of claim: `recipients` is the single entry
  `{caseRecord.owner_id}`, not a team. The identical node in
  `src/flows/case-sla-monitor.flow.ts` — same `notify_team` id, same owner-only
  recipient — already carries the honest label `Alert Owner`; this one had been
  left behind.

The file-header comment on `src/flows/opportunity-won-alert.flow.ts` still
described the flow as *"notify the owner and their manager"*, the sentence #851
removed from the `description` eleven lines below it. It now uses that same
correction, so the two no longer disagree.

Node **ids** are deliberately untouched — `notify_management`,
`assign_senior_agent` and `notify_team` keep their original spellings because
`edges[]` reference nodes by id and `CaseEscalationOnCreateFlow` rewrites the
node list by id. Renaming one would be a behaviour change wearing a wording
fix's clothes, so each node now carries a short note saying so, to keep the next
reader from "tidying" an id that looks stale next to its corrected label.

Labels and comments only. No flow behaviour changed: no recipient, condition,
field set, edge or id differs, and this takes no position on whether escalation
*should* reassign or *should* copy a manager — those remain open product
questions whose answers would be behaviour changes with their own docs.
Fixes #869.

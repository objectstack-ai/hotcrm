---
'hotcrm': patch
---

Scheduled sweeps now declare which organization the records they create belong
to. The nightly renewal, stalled-deal and forecast sweeps opened tasks,
opportunities and forecast rows with no organization set, because a scheduled
run has no acting user and no organization for the platform to infer one from.
In a deployment that partitions data by organization, such a row lands outside
every partition: reports and list views scoped to an organization never show it,
and uniqueness rules that include the organization stop constraining it.

Each sweep now takes the organization from the record that caused the work — a
renewal task belongs to the organization of the contract that triggered it, a
stalled-deal nudge to the organization of the deal, and a forecast snapshot to
the organization of the pipeline it summarises.

No effect on single-organization deployments, where these rows correctly have no
organization either way, and no change to any existing record.

---
'hotcrm': patch
---

Give `log_call` / `log_meeting` a real `record_label`, and stop the two twins
drifting apart. The activity writers stamped `record_label: ctx.record?.name`,
but `name` is not the display field on almost anything in this app — 14 of the
15 objects declare a different `nameField` (`display_title`, `full_name`,
`subject`, `contract_number`, …) and most have no `name` column at all,
`crm_case` — the object both actions are scoped to — included, so every logged
call and meeting landed on the timeline with a null label. The bodies now
resolve the object's declared `nameField` through a map derived from the object
definitions, so it cannot drift and it keeps working if these actions are
restored to the global design.

The two actions were also near-verbatim copies that had quietly stopped
agreeing on whether `duration` is required (yes for calls, no for meetings,
undocumented either way). Everything they share — body, dispatch declarations,
the subject/duration/notes param core — now comes from one builder, and
`duration` is optional on both, which is what the shared body was already
written for.

Adds `test/global-actions.test.ts`, which EXECUTES the action bodies rather
than regex-matching them: it asserts the label resolves for every object that
declares a `nameField`, and that the twins emit the same activity row apart
from the summary prefix and the per-kind metadata. Refs #514.

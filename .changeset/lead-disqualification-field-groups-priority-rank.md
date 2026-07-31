---
'hotcrm': patch
---

Enforce `crm_lead.disqualification_reason`, group the campaign and task fields,
and unify the `priority_rank` sentinel (#575 A2/A3/A4).

**`disqualification_reason` promised required and enforced nothing.** The field
description has read "Required when status is Unqualified" since it was added,
with no validation, no hook, and no form that rendered the field at all — a
lead could sit in `unqualified` with no recorded reason, and the seeded demo
leads did. A `disqualification_reason_required` script validation now enforces
it, modelled on `crm_case.escalation_reason_required`. Because a rule with no
writer is worse than no rule — the save fails with an error the form gives the
user no way to clear — the field is now on every `crm_lead` form that exposes an
editable `status`, shown only when the status is `unqualified`, and on the lead
detail page beside the status. The four generated `unqualified` seed leads
carry a reason (rotated across four values, each with a matching note) instead
of a budget-flavoured note and nothing else.

**`crm_campaign` and `crm_task` had no `fieldGroups`.** They were the last two
business objects with a full detail page and zero groups, so both rendered as
one flat grid — the campaign's ROI formulas inline with its name, the task's
five polymorphic `related_to_*` lookups and recurrence machinery inline with its
subject. Both now declare groups mirroring the sections their forms already use,
and every field is assigned to one. The two line-item objects stay ungrouped:
they are edited inline in the parent's grid and have no detail page to section.

**`priority_rank` diverged between the two objects that use it.** The ordinal
exists because sorting on the `priority` select compares raw strings and inverts
urgency. Its unknown-priority fallback was `1` on `crm_case` and `2` on
`crm_task`, with field defaults to match, so the same unrecognised priority
sorted differently on the two objects — and on each it was indistinguishable
from a genuine priority (`low` / `normal` respectively). Both now use `0`, an
unranked sentinel that sorts below every real rank on the `priority_rank desc`
queues. The known ranks (1–4) are unchanged, so no seeded or stored row moves.

The two rank maps stay hand-copied on purpose: L2 hook bodies run body-only in
the QuickJS sandbox, so a shared module constant resolves at authoring time and
arrives as `undefined` (see `_line-item-price-fill.ts`). Since the duplication
is forced, `test/priority-rank-parity.test.ts` is what keeps the copies in
agreement — it drives both hooks and asserts they rank an unknown priority
identically and consistently with each object's field default.

New guards live in three new test files rather than being appended to
`test/metadata-references.test.ts`. Beyond the parity check above,
`test/field-groups-coverage.test.ts` requires every detail-page object to
declare groups and additionally catches the silent failures around them — a
field pointing at an undeclared group key vanishes from the layout, and a
declared group with no fields renders an empty section header.

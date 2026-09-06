---
'hotcrm': patch
---

Correct the "the platform drops writes to readonly fields" note on six object
fields, each against its own writers rather than with one replacement sentence.

The blanket was measured false: the strip is one branch of the UPDATE path,
`if (!opCtx.context?.isSystem)`, over caller-supplied keys only. Whether a field
can be `readonly` therefore depends on its **least-privileged writer**, and the
six sites do not agree with each other. Re-confirmed on the pinned 17.3.0 — both
engine internals still read as quoted, and the measurement suite is green — with
two additions the earlier reading predates: `hookWrittenKeys` now states "hook
writes are not caller-supplied" in the engine instead of leaving it to emerge
from a value-identity check, and an opt-in `strictReadonlyWrites` refuses the
whole write instead of committing without the column. Nothing here passes it, so
drop-and-commit is still this repo's behaviour.

What each note now says, and why it differs from its neighbour:

- `crm_lead.is_converted` and the `converted_*` block — `lead_conversion`
  declares no `runAs`, so it updates them as `'user'` and the keys are stripped.
  The note now names that default instead of blaming the platform, and says the
  guest-submission `beforeInsert` stamp is unaffected.
- `crm_quote.subtotal` / `discount_amount` / `total_price` — the note named the
  create-time flow write, which an INSERT exemption would have let through
  anyway. The writer that actually keeps the columns open is the line-item
  rollup's cross-record `ctx.api` update.
- `crm_opportunity.approval_status` / `approved_date` — every writer is the
  `runAs: 'system'` approval flow or an insert, so these could honestly be
  declared `readonly`. Recorded as a finding rather than flipped.
- `crm_campaign_member.added_date` — written only by INSERTs, which the strip
  never reaches. Same finding, same treatment.
- `crm_campaign.actual_revenue` and the `num_*` block — written by four refresh
  hooks through `ctx.api` under the acting user, so they must stay open. The
  notes also stop naming `campaign_snapshot_metrics`, a hook retired long ago.

Three of the six scoped their claim to "16.x". That is a historical statement
this repo can no longer re-run, so the citation is dropped rather than restated:
a justification a reader cannot check is not one. Where the current mechanism
reaches a different verdict than the historical claim did, the note says so
instead of quietly keeping the old conclusion.

---
'hotcrm': patch
---

Completes the `controlled_by_parent` doc-truth correction over the sites the first
batch's file surface did not reach. Prose and comments only — every OWD, sharing
model, sharing rule, RLS policy and profile grant is byte-identical.

Same measurement as the first batch, pinned by `test/parent-derived-reach.test.ts`
on 17.0.0-rc.2: the ADR-0055 derivation resolves the master id set through the
master's row-level security policies only, under a system context — ownership
scope and `sys_record_share` grants are never folded in — so a parent-derived
child is readable by every holder of object-level read on it, and the
parent-write gate is exactly as wide.

Corrected:

- `src/objects/event_attendee.object.ts` claimed reads are filtered to attendees
  whose `crm_event` the caller can read and that "an attendee row is therefore
  never more visible than the meeting it belongs to". `crm_event` is private and
  reps hold it own-only, so this was the widest gap between documented and
  shipped reach in the app.
- `src/objects/opportunity_line_item.object.ts` claimed reads are filtered to
  lines whose `crm_opportunity` the caller can read — the twin of the
  `crm_quote_line_item` wording already corrected. It now also names the one RLS
  policy this app authors on a master (the private-deal filter on
  `crm_opportunity`, carried by the `sales_manager` and `marketing_user` sets),
  which is the only thing that narrows a derived master set here.
- `src/objects/campaign_member.object.ts` claimed reads are filtered to members
  whose `crm_campaign` the caller can read. Because `crm_campaign` is
  `public_read` the practical read delta is small — a caller holding campaign
  read already reads every campaign — so the note says that rather than
  overstating it, and records that the write side genuinely does narrow through
  the platform's `member_default` owner-only-writes policy.
- `src/profiles/sales-manager.profile.ts` and
  `src/profiles/marketing-user.profile.ts` described attendee, member and line
  item rows as following the event / campaign / deal.
- `content/docs/administration/profiles.mdx` told admins a rep's contacts follow
  the accounts they can see, and that line item control is scoped to the rep's
  own deals and quotes.
- `content/docs/administration/sharing-and-security.mdx`: the Campaign Member OWD
  row said "membership follows the campaign", and the corrected section said
  HotCRM authors no master RLS policy at all — it authors exactly one.
- `content/docs/revenue/contracts.mdx` offered a Controlled-by-Parent OWD as the
  way to make contracts follow the account; in this release that derives
  org-wide, which is not what the sentence promised.

The narrow "filtered to readable parents" semantics is the intended one. The
platform gap is tracked upstream as objectstack-ai/objectstack#5386; the guard
test goes red the moment the derivation narrows, which is the signal to rewrite
these sites and re-take the OWD decision (#549).

Refs #694.

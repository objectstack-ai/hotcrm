---
'hotcrm': patch
---

Stop four live comments from naming the retired `campaign_snapshot_metrics` as
the writer of the campaign metric block, and mark the mentions that are
deliberately historical as history.

The hook was retired in #597 and the block is owned by four refresh hooks:
`campaign_metrics_refresh`, `campaign_attribution_refresh` and
`campaign_lead_conversion_refresh` in `campaign.hook.ts`, plus
`campaign_member_metrics_refresh` in `campaign_member.hook.ts`. A tree-wide grep
found nine occurrences of the retired name across seven source files and two
already-corrected sites; each was read on its own terms rather than renamed in
bulk, because several of them narrate what changed and are supposed to keep the
old name.

Named the real writer where the comment claimed the hook was live:

- `campaign-completion.flow.ts` said the nightly sweep's `→ completed` flip is
  what "the existing `campaign_snapshot_metrics` afterUpdate hook then snapshots
  into metrics". It is a `status` transition, so `campaign_metrics_refresh`
  recomputes on it — and the block was already current before the sweep ran, so
  the note now says refresh rather than snapshot.
- `sales.seed.ts` described the opportunity `crm_campaign` link as what the
  retired hook "counts when a campaign completes". The writer that counts
  attributed opportunities is `campaign_attribution_refresh`, on every
  opportunity insert, update and delete.
- `seed-consistency.test.ts` listed the retired hook in its hook-to-field map and
  named a `describe` block after it. Both now name the refresh, and the block
  carries the four hook names. The `it` inside it that still explained the
  assertion in terms of a completion-time snapshot was corrected too, since the
  renamed block would otherwise have attributed completion-only firing to the
  four refresh hooks.

Marked as history where the mention is deliberate:

- `campaign-member-lifecycle.test.ts` explains that the acceptance criterion
  cannot be proved by a completion-time assertion, which needs the old name. It
  now says "the RETIRED `campaign_snapshot_metrics` — gone since #597" instead
  of opening the sentence with a bare hook name in the past tense.

Left alone, because they already say the name is history: the notes in
`campaign.hook.ts` ("The old ..."), `campaign_member.hook.ts` ("the removed
..."), `campaign.object.ts` ("the long-retired ...", corrected by #1670) and the
changeset that recorded that correction.

No assertion was changed anywhere: this is comment, block-name and prose only.

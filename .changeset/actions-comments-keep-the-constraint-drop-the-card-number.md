---
---

Comment text only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). Every changed line in the diff is inside a TypeScript
comment in `src/actions/`, the comment-stripped source of all 8 files is
byte-identical to the base commit, and `dist/objectstack.json` hashes to the same
sha256 built from either side.

Phase 3 of the comment sort: delete issue archaeology, keep the platform
constraints, and re-measure this surface rather than inherit either prior
phase's ratio.

**`src/actions/` re-measured, and it agrees with `src/flows/` on the finding
rather than with the card.** Issue-citing comment mass was 63.3% of all comment
mass — close to the tree-wide 66% the card generalised from — but judged block by
block that mass is overwhelmingly *load-bearing platform constraint carrying a
provenance number*. 288 comment lines stopped citing an issue; only 29 comment
lines were removed. The other ~259 are text that stayed, with a card number
dropped from a constraint the number was never part of. Real archaeology in
`src/actions/` is ~5% of comment mass, not 66%.

What was actually deleted is small and specific: how `campaign_enrollment` used
to be a Monday cron, why the `enroll_leads` label changed, that
`crm_campaign_member.crm_contact` once had no writer, that `responded` once had
none either, the "What changed in #592 / two defects, one shape" header and its
before-state, the `#514` narratives about what the activity writers used to
stamp, the `#777` play-by-play of a wrong `update(id, data)` call, the three
rc.2 failure reports behind `mass_update_stage`, the pre-`#1145` draft of the
Claim Case predicate, the dialog that used to sit in front of `convert_lead`,
and the note that `ExportToCsvAction` was removed. Everything else was rewritten
**forward** in the idiom the first two phases established — a note whose job is
to stop a future author reintroducing a defect now says "⛔ never do X, because
Y" instead of recounting when X happened.

The kept constraints are exactly the family the dispatch predicted: the strict
params gate (ADR-0104) refusing an undeclared `selectedIds`, bare-string vs
aggregate `bulkActions` fan-out, field-backed vs bare `lookup` params, and
`type: 'modal'` having no server dispatch. Added to those: the dispatcher keying
body actions on `<objectName>:<action.name>` (so an object-less body action is
unreachable), QuickJS body-only lowering (a body that calls a shared function is
a `ReferenceError`, a body composed by a factory is fine), an action body running
`isSystem` so nothing stamps `owner_id` for it, `record_label` needing the
object's declared `nameField` rather than `name`, and an action `name` being a
dispatch identifier that must never be renamed to match a label.

Two issue citations survive on purpose, both to `objectstack#5061`, because they
carry a live revert instruction a future author must consult: `schedule_meeting`
collects `date` + `time` instead of one `datetime` param, and the note says what
to collapse it back to.

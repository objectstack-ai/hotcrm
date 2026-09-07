---
'hotcrm': patch
---

Releasing HotCRM no longer re-formats release notes that have already shipped, and
one mangled field name in the published 3.0.0 notes is repaired.

`changeset version` re-printed the whole of `CHANGELOG.md` through Prettier on every
run, because Prettier is on unless a project turns it off and this repo never set the
key. Prettier re-pairs emphasis delimiters across a paragraph, so an underscore inside
a field name gets paired with the underscore of a nearby italic span and both are
re-emitted with the wrong delimiters. Names that identify a real column turn into text
that identifies nothing, the command exits 0, and the churn sits inside a
several-thousand-line addition where nobody would see it.

It had already happened once, in text that shipped: the 3.0.0 notes say the renewal
task writes `due*date` and `related_to*\*` where the changeset that produced them said
`due_date` and `related_to_*`. That line is repaired back to what the release actually
said — the one hand-edit of the generated region that is justified, because the
generator is what broke it.

`.changeset/config.json` now sets `prettier: false`, so a release section is written
once and never re-formatted afterwards. Measured, not read out of the docs: on a
throwaway copy of the tree, `changeset version` with Prettier on rewrites four further
lines of the shipped 3.0.0 notes (`forecast_category` → `forecast*category`,
`is_active` → `is*active`, and the two italic spans either side of them); with
`prettier: false` the entire pre-existing file comes back byte-identical and the run
only prepends the new section.

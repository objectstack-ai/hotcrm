---
---

Comment text only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). Every changed line in the diff is inside a comment in
`src/flows/`, the comment-stripped source of all 26 files is byte-identical to
the base commit, and `dist/objectstack.json` hashes to the same sha256 built
from either side.

Phase 2 of the `src/flows/` comment sort: delete issue archaeology, keep the
platform constraints, and re-measure rather than inherit phase 1's ratio.

**The measured finding is that `src/flows/` is not what the card assumed.** Its
issue-citing comment mass is 70.7% of all comment mass — almost exactly the
tree-wide 66% the card generalised from — but judged block by block that mass is
overwhelmingly *load-bearing platform constraint carrying a provenance number*,
not changelog narrative. 1,754 comment lines stopped citing an issue; only 164
of them were removed. The other ~1,590 are text that stayed, with a card number
dropped from a constraint the number was never part of.

What actually got deleted is small and specific: a retired `init_defaults` node
described in two files, the growth history of `demo_bootstrap`'s claimed-object
list, an ADR-0019/7.4 migration note for two authoring surfaces that no longer
exist, six "migrated from the removed `workflows[]` object workflow" headers, and
an edge-id collision play-by-play. Everything else was rewritten **forward** in
phase 1's idiom — a note whose job is to stop a future author reintroducing a
defect now says "never do X, because Y" instead of recounting when X happened.

The kept constraints are the ones the card names as keepers and they are dense
here: QuickJS/template lowering (a flow template cannot normalize, cannot
traverse a lookup, and interpolates an unresolved token to the literal
`"undefined"`), `get_record` refusing to run on a filter token that resolved to
nothing, `update_record` having no `options.multi`, decision nodes never reading
their singular `config.condition`, CEL totality on sparse driver rows, screen
fields whose `defaultValue` is interpolated where a flow variable's is not, and
`public_read` being read-open but write-owned.

Seven issue citations survive on purpose, because each points at a decision a
future author must consult rather than at a card that introduced a line:
`objectstack#13682` (delete this guard when it lands), `objectstack#6155` /
`#6153` (the upstream ruling that assigns `organization_id` to the flow author),
`#1535` and `#1434` (maintainer rulings the comments say must not be "fixed"),
and `#1372` (an open product question about the forecast key).

Also removed: a Chinese-language quotation inside a `lead_conversion` comment,
which AGENTS.md's English-only rule for code comments did not permit.

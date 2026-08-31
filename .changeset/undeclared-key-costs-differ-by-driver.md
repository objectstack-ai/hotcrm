---
---

One test file and nothing else — this PR releases nothing to HotCRM users, so
the frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration that `.github/workflows/changeset-check.yml` documents, on par with
the `skip-changeset` label). No `src/` change of any kind: no object, field,
view, label, profile, flow or hook handler.

#1200 asked what a misspelled key costs, and its reading was taken on
`@objectstack/*` 17.0.0. Re-measured on the pinned 17.1.0, the answer split in
two, and `test/undeclared-key-probe.test.ts` now measures both against the real
engine on all three drivers this repo depends on.

The CALLER path is closed: a key the caller supplies is refused with
`INVALID_FIELD` / 400 before hooks and before statement construction,
identically on `memory`, `sqlite` and `sqlite-wasm`. So the original finding no
longer reproduces from the outside, and the guarantee is pinned here — with the
two controls that keep the pin honest, since a probe that stopped writing
anything would otherwise pass by measuring nothing.

The HOOK path is not closed, and there the three drivers disagree: a key a
`beforeInsert` hook assigns is never checked against the schema, so `memory`
stores it and hands it back, while `sqlite` and `sqlite-wasm` fail the write
with a raw database error carrying neither an ADR-0112 code nor a status. Same
metadata, same hook, three behaviours. That half is a platform gap and is filed
upstream; it is deliberately NOT worked around here, because a key allowlist
wrapped around this repo's hooks would hide a platform defect inside the
exemplar rather than fix it.

The hook-path half is filed upstream as objectstack-ai/objectstack#13657, with
both readings and the schema survey attached.

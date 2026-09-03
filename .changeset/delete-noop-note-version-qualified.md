---
---

Version-qualify the `delete ctx.input.<field>` platform note in the two
guest-sanitisation branches, and correct a version claim that had gone false.

Re-measured on **17.2.0** — the version this repo now pins and installs — the
note is **still true**: a probe hook deleting a planted field on a real insert
stored the planted value verbatim, while the same key assigned `null` in the
same hook stored `null`; and the installed `installFlatInput` still declares
`get` / `set` / `has` / `ownKeys` / `getOwnPropertyDescriptor` and no
`deleteProperty`.

The reason the note survived a closed upstream defect is worth having in the
tree: objectstack#12277 is closed as completed by merged PR objectstack#12396,
but that fix is in **no published release** — 17.2.0 was cut 2026-08-23, the PR
merged 2026-08-26, and 17.2.0 is still the registry's `latest`. Merged is not
the same as available in the pin, so the trigger to re-measure is a platform
release that postdates the merge, not the upstream issue's state.

Separately, `lead.hook.ts` claimed a `#720` cascade measurement was taken on
"17.1.0 — the version this repo pins". This repo has pinned 17.2.0 since
PR #1442, so that sentence is now scoped to the pin it was actually taken on,
and says the shape has not been re-measured since.

Comments only — no behaviour change. The guest branches keep assigning, and
keep writing `null`, which is load-bearing downstream in both hooks.

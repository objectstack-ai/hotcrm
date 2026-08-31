---
---

Comments only — this PR releases nothing to HotCRM users, so the frontmatter above
is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No behaviour changed: the comment-and-blank-stripped
text of all three edited files is byte-identical to its base, checked with the
token ratchet's own `authoredText()` rather than by reading the diff.

Four comment blocks in `src/objects/` told the next reader that the engine's
reference-cleanup marker never reaches a hook, and that the write shape is
therefore the only evidence a guard can have. Both halves are false on 17.1.0,
the version this repo pins, and this is the copy that matters — a maintainer
keeping the predicate reads the comment three inches above it, not the test file
#1165 corrected. A note whose job is to stop the next reader looking further is
worse than no note when it is wrong.

Re-measured on the installed 17.1.0 with a probe hook at priority 199 immediately
ahead of each guard, on `crm_opportunity`, `crm_quote` and `crm_lead`:

- the marker **is** reachable, at
  `ctx.api.executionContext.__referentialFieldClear` — `true` on every cascade,
  `undefined` on every hand-clear;
- the engine builds its cleanup write on the **caller's own** context plus
  `transaction` and the marker, so on the path a REST `DELETE` takes the cascade
  and a user's hand-clear are identical everywhere a guard can look: payload
  `{ id, <link>: null, updated_at, updated_by }`, `ctx.user` the caller,
  `ctx.session` the caller's own `{ userId, isSystem }`. The write shape is not a
  discriminator, and the yield is not one either — it lets any caller clear a
  declared link on a settled record, which is the trade #720 accepted;
- `updated_by` and the identity drop out **together**, and only when the `DELETE`
  itself carried no `userId`. That is a rig condition, not this app's path.

The guards themselves are untouched. The ruling on #1165 (2026-08-25) stands and
is not re-opened: they keep sniffing the write shape and deliberately do not read
`__referentialFieldClear`, because it is an operation-private key (an undeclared
dependency) and because reachability through the shipped QuickJS path is
unproven. The declared replacement is asked for upstream as
`objectstack-ai/objectstack#13644`.

---
---

Re-scope the pin claim in the Security & Compliance page's measurement note, in
all three locales. The note said its readings were re-measured against 17.2.0 on
2026-09-03, "the version `package.json` has pinned since 2026-09-01" — and that
appositive stopped being true on 2026-09-04, when PR #1577 moved every
`@objectstack/*` dependency to 17.3.0. So a user-facing compliance page was
telling its reader that the measurement behind it had been taken on the version
they run.

Deliberately **not** a renumber to 17.3.0. That measurement was never re-taken,
so relabelling it would have converted a *stale* claim into a *fabricated* one —
the ruling recorded in `pin-claims-rescoped-to-measurement-version.md`, and it
binds hardest here, because the whole subject of this paragraph is that its
claims were re-taken rather than carried forward.

The dated half stays exactly as it was: "re-measured against 17.2.0 on
2026-09-03" dates itself honestly. Only the currency claim is replaced. Each
page now says 17.2.0 was the version pinned on that date, that the
re-measurement has not been repeated since, and that the pin has moved on from
it — without naming the current pin, which would only plant the next number to
go stale.

Fourth recurrence of this defect class (#1460, #1467, #1676) and the first in
`content/docs/`, because two independent things hid it: the earlier greps read
`src/ test/ docs/` and never this tree, and the claim is soft-wrapped across a
line break, so no line-based grep could have matched it in any tree. Verified
with the unwrapping scan over all 201 `.mdx` files under `content/docs/`: three
hits before, zero after, and `17.3.0` appears on none of the three pages.

Documentation prose only — no metadata, schema or behaviour change.

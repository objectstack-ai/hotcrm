---
---

Comment text only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label).

The `period_label` uniqueness guard in `test/forecast-seeds.test.ts` explained
itself with a count: "these **eight** authored records must not collide with EACH
OTHER, so the demo shows **eight** distinct periods". The `crm_forecast` seed
holds **seven**. Nothing in the assertion below the comment ever read that
number — it derives its list from `records` — so the file stayed green while the
sentence above it drifted.

Seven is pinned in three independent places: `src/data/revenue.seed.ts` (five
`closedPeriod('…')` rows plus two `seed_key: 'demo_…'` rows), a browser
measurement of `GET /api/v1/data/crm_forecast?top=20`, and the anti-vacuity floor
`expect(records.length).toBeGreaterThanOrEqual(7)` in this same file. The file
also disagreed with **itself**: the anti-vacuity block says "the card's
measurement was seven rows, six of them settled".

The fix removes the numerals rather than correcting them, and adds no guard that
counts the seeds. The property the test defends does not depend on a count —
these authored records must not collide with each other — so a corrected "seven"
would just be the next number to go stale, and a guard asserting it would be one
more hand-maintained fact wearing a lock.

The comment is its own best argument for that. It opens by explaining that it
was rewritten once already, to correct an earlier version whose two claims had
both become false; the rewrite then went stale on a different axis. A fact
maintained by hand in prose has no producer, and no amount of care at the point
of writing gives it one.

The assertion body is unchanged, byte for byte. Seed data is unchanged.

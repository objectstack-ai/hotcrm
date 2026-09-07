---
'hotcrm': patch
---

Stop restating the platform upgrade's close horizon in the Acme account
description. The bullet said the upgrade "closes in 30 days" while the record it
describes seeds `close_date` as `daysFromNow(30)` — the two agree at the instant
the seed loads and never again. A demo database seeded three weeks ago shows an
upgrade closing in nine days beside a description that still says thirty.

### Two rulings met in one paragraph

This line is not an oversight. It is where two earlier decisions collided, and
neither one was wrong when it was made.

- **#1657** wrote this sentence on purpose. The line before it read *"Renewal due
  in 45 days"*, which named no record at all; it was rewritten to name the open
  `Acme Platform Upgrade` **and its real horizon**. Giving the sentence a horizon
  was that fix.
- **#1660** then settled the opposite for the sibling field on the very same
  record. The standing comment above `next_step` on `Acme Platform Upgrade`
  reads: *"Do not put a date back here, absolute OR relative: a second copy is a
  second thing to drift."* That ruling never swept back over the account
  description one screen up.

**The horizon comes out: #1660 generalises.** Its stated reason is about *copies
and drift*, not about which fields a rep may edit, so nothing in it stops at
`next_step`. The ARR bullet in this same **Current state** block was put under
exactly that rule one card earlier, and the note that landed above this
`description` with it already states the rule in general terms — no date goes
back into this prose, absolute **or** relative. Leaving this bullet alone meant
one three-bullet block running two opposite rules, which is worse for a reader
than either uniform answer.

### What the bullet says now

```
- AI agent governance became a hard requirement for that upgrade
  after their internal compliance review, so the workshop now on
  the calendar is the gate on signature.
```

The horizon is not re-derived here, it is **gone**. Deriving it would re-state
the offset outside the record that owns it — the same defect one level down, and
`src/data/revenue.seed.ts` already imports from this module, so the existing
period-label helper cannot be reused in this direction without a circular import.

`daysFromNow(30)` is correct and stays: the record owns that date, and a reader
who wants it follows the opportunity. What is left is true whenever the demo
renders it — the bullet above already says the upgrade is open and in `proposal`
stage, and the governance workshop that gates the signature is booked, wherever
that event ends up scheduled.

The `Acme Platform Upgrade` record is untouched — `close_date`, `stage`,
`probability` and `next_step` are all unchanged — and so is every other account
description in the seed book. No object, view, report, dataset or test changed.

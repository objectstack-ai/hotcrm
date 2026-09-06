---
'hotcrm': patch
---

Decorrelate the 30-case demo volume generator, so the demo backlog shows a real
mix instead of one status per account (#1659).

The generator behind the hand-authored service cases read **one** counter for
every axis it varies. `crm_account` and `status` both took `i % 5`, and
`priority`, `type` and `origin` all took `i % 4` — equal-length lists walked by
the same index, so each group advanced in lockstep and came out perfectly
correlated. Measured on the shipped seed: the account × status cross-tab held
**5 of its 25 cells** (every Acme case `new`, every Globex `in_progress`, every
Wayne `resolved`, every Initech `closed`, every Stark `escalated`), and
priority × type, priority × origin and type × origin held **4 of 16 each** —
every `low` case was a `question` raised by `email`, every `critical` a
`feature_request` from `chat`. Thirty rows of volume with no variety, which is
the opposite of what a volume generator is for.

What a demo user saw: filtering the case list by account returned a single
status every time, a per-account status breakdown drew one bar, and Acme's
related list showed **8 open cases** — six of them generator rows, all `new`,
all on Acme by construction — against a hand-written description that speaks of
one worked ticket plus one billing dispute.

Each list now advances one step per row **plus a rotation**, so no two axes stay
in step. `crm_account` is the anchor; `status` rotates one step per pass through
the accounts, which makes account × status complete by construction rather than
by luck — account `a` takes rows `a, a+5 … a+25`, so its six statuses are
`(a + b) % 5` over `b = 0…5`, all five of them. `priority`, `type` and `origin`
carry rotations picked by computing all ten pairwise cross-tabs and keeping the
assignment that left the fewest empty cells.

Measured after: **188 of the 193 pairwise cells are occupied** (from 137), no
cell holds more than 3 of the 30 rows, every account now shows all five
statuses, and the marginals are as flat as thirty rows allow — 6/6/6/6/6 by
account and by status, 8/7/7/8 by priority, type and origin. Acme's related
list reads 7 open cases across five different statuses.

Nothing outside the generated rows moved: the eight hand-authored cases are
untouched, and so are the seeded accounts, events and tasks. Demo case
**subjects change** (they name the row's priority and type, which now vary
independently — `Demo case 06 — high feature_request` where it used to read
`medium bug`), and subject is the upsert identity for these rows, so a demo
database seeded before this change keeps the old rows alongside the new ones
until it is reset with `pnpm demo:reset`.

The rotation constants are **tuned, not derived** — they were chosen against
these list lengths. Changing the length of any of the five lists voids that
tuning, and the cross-tabs have to be re-measured rather than assumed; the
generator's block comment says so beside the code.

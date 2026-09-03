---
'hotcrm': patch
---

Replace the three hand-copied machine facts left in `docs/MAINTENANCE.md` and
`docs/feature-inventory.md` with pointers at their source of truth — round two of the
sweep PR #1438 and PR #1476 started, and the same wording.

`docs/MAINTENANCE.md` stated `pnpm verify` as a four-step chain when `package.json`
chains more stages than that line named, omitting a shrink-only ratchet and the i18n
gate among them — so anyone troubleshooting from that page believed a green local run
had covered checks it had in fact never run. That is the **third** copy of one
transcription, after `AGENTS.md` (PR #1438) and `docs/DEPLOYMENT.md` (PR #1476); being
copied twice inside one directory is itself the argument for the pointer route. The
same file's step 2 hand-copied the locale roster, count and enumeration both. That one
was still accurate against disk — which is exactly the state each measured drift was in
the release before it drifted, and this repo has open i18n cards that would land the
next locale.

`docs/feature-inventory.md`'s PRM-010 row stated a demo-account headcount that
`src/sharing/demo-staffing.ts` had already moved past. It drifted inside the session
that filed it: PR #1463 added the two case-routing staffing rows so the intake
round-robin and escalation hand-off would be demonstrable on a demo box, and no doc
transcribing the headcount was checked. Rule 5 is not a historical observation about
old docs — it produces fresh instances under current review.

None of the three is completed, and **none restates a count**. A completed
transcription drifts again next quarter (2026-08-31 ruling item 5, and the case law
behind it: #610, #965, #977, #1228), and the number is itself the thing that drifts —
the verify line proves it by having drifted from four. PRM-010 leans on the inventory's
own 「锚点即真相」 rule instead: the row's last column already names the anchor, so the
description now points at it rather than counting for it.

No guard is added or widened: 2026-08-31 ruling item 3 keeps gate-type mechanisms on
the platform, and deletion needs no coverage. `test/docs-src-tree-paths.test.ts` reads
`docs/MAINTENANCE.md`, and it is untouched and green either side of this change.

---
---

Clause-②: no
Metadata-protocol: none

Tests only, nothing ships: every case in `test/flow-campaign-enrollment.test.ts` that seeds a campaign world now carries an explicit 30 s budget instead of vitest's 5 s default. Each enrolment run enrols every eligible person the marketer can see, so the file's runs grow from 7 to 51 members, and the last leads case ran past 5 s on main CI twice (#2357).

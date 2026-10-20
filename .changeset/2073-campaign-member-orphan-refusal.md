---
---

Tests only, nothing ships: `test/campaign-enrollment-doors.test.ts` now pins that both Add to Campaign doors refuse a campaign id that names no campaign. The lead and the contact action each answer `400 FLOW_FAILED` at the insert, for the administrator and for a marketing user, and write no member row. Until #2167 both actions were elevated script bodies, and an elevated write skips the engine's reference check, so a typed campaign name was stored as a member of a campaign that does not exist (#2073 item 6).

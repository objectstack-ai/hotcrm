---
'hotcrm': patch
---

Repair broken and conflicting automation across hooks and flows (#489):
case/task automation no longer fights itself (escalation is guarded by
`escalated_date == null` on top of the status guards, and an afterInsert twin
covers cases born critical), the stalled-deal sweep gains an idempotency gate
so it nudges once per stall episode instead of every morning, and
lead/campaign/contact and opportunity/quote/contract automations stop
overwriting each other's writes.

---
'hotcrm': patch
---

Record the clock-pinning boundary condition in the action-sandbox harness header.
Pinning a clock around an action or hook body the obvious way — a bare
`vi.useFakeTimers()` — deadlocks the harness, and the only symptom is a plain
test timeout that names nothing about the clock, so it reads exactly like a body
that hangs. Faking `setImmediate` is what does it, not `setTimeout`, and it is
not a cold-start effect. The working form is `vi.useFakeTimers({ toFake:
['Date'] })`, whose pinned instant does reach inside the VM: a body sees the
process `TZ` with zone rules resolved for that instant, and the UTC date
accessors are available to it.

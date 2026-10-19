---
---

Tests only, nothing ships: the `case_sla_monitor` block of `test/flow-scheduled.test.ts` now waits for its backlog sweep's notification deliveries before its tests run, so its no-op test no longer spends ~2.2 s of its 5 s budget behind them and no longer times out on slower CI runners (#2157).

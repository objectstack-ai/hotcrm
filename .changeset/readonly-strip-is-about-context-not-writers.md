---
---

Measure what `readonly: true` actually strips on the pinned 17.1.0, and replace
the app's blanket "the platform drops writes to readonly fields" with the rule
that was really operating.

The blanket had grown load-bearing: it was the stated reason for the
`STAMPED_NOT_TYPED` guard exemption on `crm_case.is_escalated`, for the
counter-pin that keeps the three escalation flags writable, and for four more
field comments across `case`, `task` and `account`. A claim that gates a guard
deserves a measurement, so `test/readonly-write-semantics.test.ts` takes one:
the real `AutomationEngine` over a real `ObjectQL`, against a purpose-built
probe object, with every writer kind measured against every caller context.

**The strip is about the CALLER CONTEXT, not about which writer you are.** It is
one branch of the UPDATE path — `if (!opCtx.context?.isSystem)` — applied only
to keys the caller supplied and still holding the caller's own value. So:

| writer | survives `readonly: true`? |
| --- | --- |
| a `beforeUpdate` hook stamping `ctx.input.data` | **yes**, in every context — a hook-written key is not caller-supplied |
| a flow `update_record` node, `runAs: 'system'` | **yes** |
| a flow `update_record` node, `runAs: 'user'` (the default) | **no** |
| a screen flow, same two `runAs` values | same two answers |
| a caller PATCH with `isSystem` | **yes** |
| a caller PATCH without it | **no** — the flag doing its job |
| any INSERT | **yes** — insert is deliberately exempt from the strip |

A flow reaches `isSystem` through `resolveRunDataContext`, which elevates when
and only when the flow declares `runAs: 'system'`; the engine defaults it to
`'user'`. So "does a flow write survive?" is not one answer but two, decided by
an authored property of each flow file.

**`crm_case.is_escalated` still cannot be declared readonly, and now for a
reason that is true.** Its three writers disagree on privilege: `case_escalation`
and `case_sla_monitor` are `runAs: 'system'` and would survive, but the
`escalate_case` screen flow declares no `runAs` and so runs as the user — a
readonly `is_escalated` would silently drop the escalation an agent had just
confirmed on screen, while the flow still reported success. The least privileged
writer decides. The exemption and the counter-pin therefore stand, with corrected
reasons; the guard is not weakened or broadened.

Two smaller corrections fall out of the same measurement. `is_sla_violated` is
*not* hard-blocked — its only writer is a system flow — so it stays pinned as a
deliberate decision about its seed/profile/form surfaces rather than as a
platform limitation. And `crm_task.reminder_sent` was documented as unable to be
readonly because "16.x drops flow writes"; its writer is `runAs: 'system'` and
its other write is on the exempt insert path, so that reason does not hold
either. Neither declaration is changed here — only the reasons, which is what
this change is for.

No shipped metadata changes; comments, a guard's stated reason, and a new
measurement suite.

---
'hotcrm': patch
---

Point `AGENTS.md`'s Schema Validation Requirements list at a schema that exists.
Item 3 told every agent to validate "Workflows" with
`WorkflowRuleSchema.parse()` from `@objectstack/spec/automation`. That export is
not there: `WorkflowRule` matches **0 files** across all 52 installed
`@objectstack/*` packages on 17.0.0-rc.2, while the same grep finds
`FlowSchema` in 63, `JobSchema` in 46, `StateMachineSchema` in 40 and
`ApprovalNode` in 30 — the probe works, the symbol is gone (ADR-0019/0020
retired the `workflow` metadata type; `ObjectSchema` now rejects `workflows:`
and `workflow:` by name). An agent following the instruction hits an import
failure and then improvises: hand-rolls a schema, drops validation, or worse
concludes it should author a `workflows[]` key the platform refuses.

Item 3 is now **Flows** — `FlowSchema.parse()` from
`@objectstack/spec/automation`, which is exactly what `defineFlow()` runs —
because the list had no Flows entry at all despite `src/flows/` holding 21
`*.flow.ts` files. A short note under the list routes the three things people
call a "workflow" to their real carriers: field updates to `*.hook.ts`, status
flips and notifications to a `record_change` / `schedule` flow, approvals to an
`approval` node inside a flow. It also separates them from item 4, since a
record lifecycle constraint is a `validations[]` entry with
`type: 'state_machine'` on the object — validated by `ObjectSchema.parse()`,
not by `StateMachineSchema`, whose shape (`initial` / `states` / `on`) is a
different thing.

Instruction-file wording only; no `src/**` or `content/**` change. Refs #852,
#833.

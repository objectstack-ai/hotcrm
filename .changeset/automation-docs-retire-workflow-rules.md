---
'hotcrm': patch
---

Retire the "Workflow rules" section from the automation admin page in all three
locales. The page taught workflow rules as one of five kinds of automation —
their action types, three "built-in examples", their slot in the save order, and
a **Setup → Workflow Queue** to monitor them. None of it exists.

The type is gone platform-wide, not merely unused here. Measured on
`@objectstack/*` 17.0.0-rc.2:

- Zero `WorkflowRule` symbols across all 50 installed platform packages.
- `spec` says so in five places: no `workflow` metadata type
  (`kernel/metadata-plugin.zod.ts`, ADR-0020), no top-level `workflows`
  collection (`stack.zod.ts`), the `workflow_rule` authoring paradigm retired
  (`automation/node-executor.zod.ts`, ADR-0019), the `/api/v1/workflow` mount and
  `WorkflowProtocol` removed in v17 (`api/protocol.zod.ts`), and the `workflow`
  core-service slot retired with them (`system/core-services.zod.ts`).
  `ObjectSchema` now *rejects* `workflows:` / `workflow:` by name.
- The Setup app's Automation nav ships exactly one entry — Flows — with an
  explicit "no Workflow Rules nav" note in `@objectstack/platform-objects`.
- On a running server: `/api/v1` discovery lists no `workflow` route or service
  slot (unavailable slots such as `realtime` and `ai` *are* listed, so the
  absence is the answer), `/api/v1/workflow` is 404, and the automation service's
  own root returns `{"flows": [...24...]}` and nothing else.

The three "built-in examples" were flows all along — they are the *New Lead
Routing & SLA*, *Large Deal Won Alert* and *Case Escalation Process* rows of the
built-in flow table on the same page, so an admin was told the same three
behaviours came from two different mechanisms, only one of which they could find
in Setup. The examples also described behaviour the flows never had (a Slack
`#wins` post, in particular, from a flow whose only node is a `notify`), so they
are dropped rather than reworded — the table already states what each flow does.

What replaces them: "The five kinds" is now four, and the Flows section opens
with a short note for anyone arriving with "workflow rule" in their head,
pointing at record-change flows. The save-order list loses its workflow step, and
its cascade step — which promised re-evaluation "up to 5 times" — now states the
engine's actual behaviour: writes by a flow re-enter the save order, and a
re-entrancy guard skips a flow re-entered for the same record while its previous
run is still in flight (a backstop, not a start condition — see #701). The
**Setup → Workflow Queue** monitoring entry is dropped; no such page exists.

Docs only. Refs #833, #839.

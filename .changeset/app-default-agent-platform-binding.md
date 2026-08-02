---
'hotcrm': patch
---

Bind the CRM app's ambient chat to the platform `ask` agent. `crm_enterprise`
still declared `defaultAgent: 'sales_copilot'`, an app-authored agent retired in
#512 — per ADR-0063 §1/§2 the key is a surface binding whose only resolvable
values are the two platform agents (`ask` for data surfaces, `build` for
authoring surfaces), so the runtime's `loadAgent()` refused the record and the
floating chatbot resolved to nothing. Nothing caught it: `defaultAgent` accepts
any well-formed snake_case name, and the platform's agent lint only walks
authored agents. HotCRM's six shipped skills already attach to `ask` by
`surface` affinity, so the assistant now answers with its full skill set.
Adds a guard to `test/metadata-references.test.ts` that pins every app's
`defaultAgent` against the platform agent set read straight off the spec's
`AgentSchema`, so the next dangling binding fails locally instead of in a demo.
Refs #586.

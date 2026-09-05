---
'hotcrm': patch
---

Declare `ai.requiresConfirmation: true` on the `convert_lead` action, so the
approval its own description promises is the one AI callers actually see.

`convert_lead` ships an AI description reading *"Irreversible — requires human
approval before it runs"*, but `list_actions` over MCP reported
`requiresConfirmation: false`. The action declared no such key: a code comment
attributed the AI gate to `confirmText`, and nothing else set it. An agent
listing this tool was told, by the same payload, both that conversion needs a
human and that it needs nobody.

`confirmText` is not that key. Measured against the pinned
`@objectstack/runtime` 17.3.0, the runtime decides the flag in
`actionLooksDestructive`, which reads `action.ai.requiresConfirmation` and
otherwise falls back to `mode === 'delete' || variant === 'danger'` —
`convert_lead` is neither. `confirmText` occurs **zero** times in the whole
shipped runtime bundle; it is the console's confirm-dialog string for a human
click, on a path no AI caller reaches. `@objectstack/spec` says the same in its
authoring guidance: *"the AI human-in-the-loop override lives under `ai` —
write `ai: { requiresConfirmation: true }`. `confirmText` is the separate UI
confirm prompt."* The two keys had simply been read as one.

`list_actions` now reports `requiresConfirmation: true` for `convert_lead`, and
the misleading comment is rewritten to say which key the AI path reads and
which one belongs to the console.

**What the flag does, stated exactly, because the old comment overpromised.**
It is *surfaced*, not enforced. The runtime reads it in one place — projecting
the action into the MCP summary — and `run_action` dispatches the flow with no
server-side pause. So the flag tells a calling client that this operation is
irreversible and lets that client gate the call; it is not a server-side lock,
and there is no approval queue holding the request. The retired claim that an
agent invocation "lands in the HITL queue" is not restated anywhere.

This is a metadata correctness fix in the app the platform's users copy from:
an exemplar whose declared contract and enforced behaviour disagree teaches the
disagreement. No user-visible console behaviour changes — the confirm dialog a
human sees was, and still is, driven by `confirmText`.

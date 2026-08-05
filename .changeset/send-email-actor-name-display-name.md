---
'hotcrm': patch
---

A contact's timeline names the sender again: `send_email` now writes a
human-readable `sys_activity.actor_name` instead of the acting user's raw id.

This is the twin of the defect fixed for `log_call` / `log_meeting` /
`schedule_meeting`, on the same column and with the same one-line cause. The
body stamped `actor_name: ctx.user?.name ?? null`, and on the dispatch path the
Console uses that key is not a display name: `@objectstack/runtime` 17.0.0-rc.2
builds the REST action context's user as `{ id: ec.userId, name: ec.userId, … }`
(`dist/index.js:5397`), so the key is present and carries the id — a
plausible-looking string no `??` fallback could ever catch. Every logged email
therefore rendered "grDEyLoIgnunJ2M7Y2muLgcuQbDUT0s2" where the sender's name
belongs.

The resolution block the activity actions already use is now shared source text
spliced into both bodies at authoring time, rather than copied: an action body
runs body-only inside QuickJS and cannot call an imported helper, so the sharing
happens while the metadata is built and what ships is one self-contained body.
A test executes both bodies under the real sandbox and fails if any
`actor_name` writer stops splicing the shared block, so the two call sites
cannot drift apart the way they did here.

Behaviour is unchanged where the platform already delivers a name: a user object
whose `name` differs from its `id` is believed as-is (no extra query), a missing
or denied `sys_user` read falls back to the id rather than blanking the actor,
and it never fails the send. The whole block retires itself once
objectstack-ai/objectstack#5372 lands.

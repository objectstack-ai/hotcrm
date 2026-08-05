---
'hotcrm': patch
---

Activity timelines name the person again: `log_call`, `log_meeting` and
`schedule_meeting` now write a human-readable `sys_activity.actor_name` instead
of the acting user's raw id.

Every activity row written from a record page carried an opaque id in the actor
column — "grDEyLoIgnunJ2M7Y2muLgcuQbDUT0s2" where "Dev Admin" belongs — because
the body stamped `ctx.user?.name`, and on the dispatch path the Console uses,
that key is not a display name. `@objectstack/runtime` 17.0.0-rc.2 builds the
REST action context's user as `{ id: ec.userId, name: ec.userId, … }`
(`dist/index.js:5397`): the `name` key is present and carries the id, so it read
as a plausible value and no `??` fallback could ever catch it. The MCP path
(`dist/index.js:1776`) does prefer `ec.userName ?? ec.userDisplayName`, but
nothing in the installed platform populates either field, so it lands on the id
too.

The shared activity body now resolves the name itself, from `sys_user.name` —
the column the platform treats as the profile display name — with the id kept
only as a last resort, because an unattributable activity is worse than an ugly
one. A user object that already carries a name different from its id is believed
as-is, so the lookup is one query on the affected path and none on a path that
works; a denied or failing `sys_user` read never fails the log. This is a
workaround for a platform contract gap, marked as such in the code: it deletes
itself the day `ctx.user.name` is honoured for REST-dispatched action bodies.

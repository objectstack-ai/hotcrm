---
'hotcrm': patch
---

`pnpm demo:staff` gives every seeded case an owner, and no longer fails when run right after `pnpm dev` starts

The demo's 38 seeded cases were routed to nobody, so who ended up owning them depended on timing: run while the seed
was still loading, all of them went to the service agent (the escalated ones included); run afterwards, all of them
stayed with the dev admin, and the service agent signed in to a Customer Service page where every tile read zero.
The script now hands each seeded case to a service desk: escalated and critical cases to the service manager
(`service.manager@objectos.ai`), every other case to the service agent (`service.agent@objectos.ai`). On a fresh
database that leaves the agent 23 cases, 12 of them open, and the manager 15.

A fresh `pnpm dev` answers sign-in about 40 seconds before its seed finishes loading, and a run started in that
window found no tasks or meetings to hand over and exited 1 ("routed no rows at all"). The script now waits for the
seed to finish first (up to 180 seconds, `--seed-wait` to change it), and then routes what is there.

---
---

Document the cleanup runbook for orphan `__search` companion columns left behind
when ObjectStack 17.0 tightened search-column provisioning (#528): a new
"Destructive schema drift" section in `docs/MAINTENANCE.md` covering when
`os migrate plan` reports database-only columns, the known 17.0 `__search` case,
and the safe `os migrate apply --allow-destructive` procedure (stop the service,
back up, review the plan, apply, verify). Documentation only — releases nothing.

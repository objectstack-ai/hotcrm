---
---

Document how to handle database-only columns reported by `os migrate plan` after
a platform upgrade (#528): a new "Destructive schema drift" section in
`docs/MAINTENANCE.md` covering how to tell a genuine orphan from a
runtime-provisioned column the planner cannot see, and the safe
`os migrate apply --allow-destructive` procedure (stop the service, back up,
clear every destructive entry against both tests, apply, verify).

Records the 17.0 `__search` report as a known **false positive**: those 9 columns
are live pinyin search-companion columns, not orphans, and dropping them breaks
search. Root cause is a schema-view mismatch between the migrate CLI and the dev
runtime, filed upstream as objectstack#3955; no cleanup on that class until it is
fixed. Documentation only — releases nothing.

---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Consultants no longer see an account's Order to Cash totals (#2481).** A person whose only business set is **Project Member** (a consultant staffed on projects) still reads every account, read-only, and every field on it except **Invoiced**, **Received** and **Receivable Balance**, which are now hidden from them on the account page and over the REST API. Anyone who also holds a set that reads these totals (a sales rep, finance, marketing or service) still sees them. Nothing is stored differently and no setup is needed: the change takes effect on upgrade.

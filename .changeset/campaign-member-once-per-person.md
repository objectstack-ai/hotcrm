---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A person joins a campaign once, whichever way they are added.** A second membership for the same lead or contact on a campaign is now refused (409 `DUPLICATE_VALUE`) on every door: the campaign's Campaign Members **New**, an import, the API and system writes, with a message that names the person and the campaign in English, Simplified Chinese, Japanese or Spanish. Two organization-scoped unique indexes on the campaign member back it against two adds racing at once. Before, the same lead could be added twice, and once it responded the campaign reported a 50% response rate for one person (#2498). A tenant that already holds duplicates keeps them and can still edit them; the platform builds each index only once its duplicates are removed, and logs the conflicting rows at boot, so no install or upgrade is refused over them.

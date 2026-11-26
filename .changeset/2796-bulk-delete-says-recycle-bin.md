---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Lists: the bulk Delete question on expenses, accounts and opportunities now says the records go to the recycle bin (#2796).** Selecting expenses in **My Expenses**, or accounts or opportunities in their lists, and choosing **Delete** asked "Permanently delete … This cannot be undone." That was not true: since ObjectStack 18.4.0 a deleted record goes to the recycle bin, where it is kept for 30 days by default and can be restored. The question now reads, for example, "Delete 2 account(s)? They go to the recycle bin, where an administrator can restore them." The Delete button and what it does are unchanged. The question is in English, Chinese, Spanish and Japanese; the Spanish expense question, which said "definitivamente", is corrected too. The FAQ answer *Where do deleted records go?* says who else can restore a record, and on which objects.

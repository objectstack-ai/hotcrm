---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Sales: a cancelled order no longer offers Draft Contract (#2756).** Before, a **Cancelled** order still showed **Draft Contract** in its header and its More menu, and clicking it really drafted a contract for the dead order and named it under **Contract**. Now the button is not shown on a cancelled order, and the flow behind it refuses one too, so a page left open while someone else cancelled the order, or a call past the button, is told "This order is cancelled. No contract was drafted." and nothing is written. Draft, Confirmed and Completed orders are offered **Draft Contract** exactly as before. The new message is in English, Chinese, Spanish and Japanese. Contracts already drafted on cancelled orders are left as they are; delete or cancel them by hand if they are not wanted. No setup is needed.

---
'hotcrm': patch
---

The *All Forecasts* list no longer shows a column total under **Expected**

**Expected** is a formula field (Closed Won + Commit, computed per row), so the
database has no stored value for it to add up. The platform's aggregate rules
refuse a `sum` over a formula field, and the view no longer asks for one. The
column itself stays, with each row's value. **Closed Won** and **Commit** keep
their totals, so the expected figure for a group or for the whole list is still
the sum of those two totals. Quota, Best Case and Pipeline keep their totals too.

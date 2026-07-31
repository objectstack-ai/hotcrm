---
---

Empty the `KNOWN_UNGUARDED` exemption map. #570 and #571 were each green on
their own branch; #571 carved `crm_opportunity_line_item.unit_price_positive`
out as a documented exemption while #570 landed that very guard in parallel, so
the entry went stale the moment both merged and #571's own staleness check
turned `main` red. Removing the entry is the fix the check was written to force.
Tooling only — releases nothing.

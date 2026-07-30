---
'hotcrm': minor
---

Remove two demo-only features that #532's squash merge carried in alongside
the license fix: the contract status kanban board and the competitor
management module (object, views, nav entry, seeds, translations, and the
multi-value `crm_competitors` lookup on opportunities — the opportunity
object returns to its previous hardcoded `competitors` select). Both were
built as recording aids for a demo video series and were not meant to land
upstream. The dashboard dateRange fix from the same squash (#499) stays.

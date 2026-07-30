---
'hotcrm': patch
---

Remove the four profile grants on `crm_competitor`, an object that no longer
exists. `main` failed `pnpm validate` with four cross-reference errors: #547
added the grants while the competitor module was still present, the demo-only
competitor module was removed separately, and the two merged cleanly on text
while contradicting each other on meaning. `sales_rep`, `sales_manager`,
`marketing_user` and `system_admin` no longer reference the removed object.

---
'hotcrm': patch
---

Write the marketing overview page's *Where to find things* list to the app's real
navigation. The **Marketing** group in `src/apps/crm.app.ts` has two children, not
one: alongside Campaigns it carries **Products**, and that item is the product
catalog's only sidebar entry anywhere in the app — the page had been telling
readers the group held Campaigns alone, so anyone hunting for the catalog under
Marketing would not have expanded it. The list now names both items with their
real labels, points at `content/docs/revenue/products` for the catalog's own
documentation, records that a product is otherwise reached only through global
search or a quote/opportunity line item, and notes that this group — unlike
Sales, My Work, Activity and Service — is collapsed by default. All three locales
updated.

---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**A Chinese SaaS tenant starts with a Chinese product catalogue (#2411).** The SaaS shape (`HOTCRM_COMPOSITION=saas`) now ships its starter catalogue twice. The English one, with the **Standard** price book, is for every supported locale except Simplified Chinese. A Simplified Chinese twin is for `zh-CN` tenants: the same thirteen products with the same SKUs, prices and costs, under Chinese names and descriptions, with a **标准价格表** standard price book. The platform's per-dataset locale filter (`Seed.locale`) gives a tenant exactly one of the two. The default (community) composition is unchanged: its demo story prices its deals against the English products, so its catalogue stays English in every locale.

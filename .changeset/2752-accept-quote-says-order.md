---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Revenue: accepting a quote now says that an order is created, not a contract (#2752).** Before, the **Accept** confirmation said the quote is frozen, its opportunity closed as won "and a contract is drafted". Since 6.6.0 accepting a quote creates a draft order instead, and the automatic contract draft is switched off by default, so reps went looking for a contract that was never created. The confirmation now reads, in English: *"Accept this quote? It is frozen, its opportunity is closed as won and an order is created; if the sale needs a contract, draft it from the order. Where an administrator has switched on automatic contract drafting, a contract is drafted as well."* In Simplified Chinese it reads `接受此报价？报价将被冻结，商机关闭为赢单，并生成一张销售订单；需要合同时可在订单上起草。若管理员开启了自动起草合同，还会同时起草一份合同。` Spanish and Japanese say the same. The message shown after accepting now says the order has been created and that it is listed under **Orders** on the quote, where it appears as soon as the page refreshes. What accepting does is unchanged.

---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Ask the AI for a figure in your own words, and see what each figure counts (#2593).** Every dimension and measure of the 11 analytics datasets now carries one sentence saying what the number includes and what it leaves out, in English, Chinese, Japanese and Spanish. When the AI assistant (in the product or over MCP) has to ask which figure you mean, it shows that sentence beside each candidate. Three everyday words now reach their figure: 赢单率 reaches **Win Rate**, 销售目标 reaches **Quota**, and 客单价 reaches **Avg Deal Size**.

**`revenue` no longer goes straight to won deals.** The 18.6.0 upgrade (#2634) gave the word to **Won Revenue** alone, but in HotCRM it can mean three different numbers: won deals, an account's **Annual Revenue**, or a project's **Planned Revenue**. So the word now matches none of them, and the assistant asks which one you mean instead of quietly answering with won deals. *bookings* and 赢单金额 still go straight to **Won Revenue**. *收入*, *SLA* and *sales* (销售额) are treated the same way. *Open cases* (未结工单) matches nothing, because no figure counts open cases on its own; a case count split by status is the nearest answer.
